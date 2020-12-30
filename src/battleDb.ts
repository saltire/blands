import {
  Band, Song, addNewBands, setBandBuzz, getBandsAtLevel, addNewSongs, getBandSongs,
  addNewWeek, addNewBattle, addNewEntries, setEntryPlace, addNewPerformances, addNewRounds,
} from './db';
import { getBandGenerator, getSongNameGenerator } from './generator';
import { mapSeries, pick, pickOut, range, shuffle } from './utils';


function getBuzzAwarded(levelBaseBuzz: number, index: number) {
  return levelBaseBuzz * ([10, 5, 2.5][index] || 1);
}

function getBuzzLevel(buzz: number) {
  return Math.max(1, Math.floor(Math.log10(buzz)));
}

interface weeksOptions {
  weekCount?: number;
  maxLevel?: number;
  battleSize?: number;
}

export async function generateWeeks(options?: weeksOptions) {
  const { weekCount = 5, maxLevel = 5, battleSize = 5 } = options || {};
  const songCount = battleSize - 1;

  const bandGen = await getBandGenerator();
  const songNameGen = await getSongNameGenerator();

  return mapSeries(range(weekCount), async () => {
    const weekId = await addNewWeek();

    // For each battle at each level, pick bands at that level from the array.
    // TODO: When picking, prioritize bands that placed top 3 in a battle last week.
    const enteredBandsByLevel = await mapSeries(range(maxLevel), async l => {
      // Start at the top level and work downward.
      const level = maxLevel - l;

      // The top level has one battle; each level down has one more than the one above it.
      const minBattleCount = maxLevel - level + 1;
      const minBandCount = minBattleCount * battleSize;

      // Get all bands at this level.
      const levelBands = await getBandsAtLevel(level);

      // TODO: Bands that placed in top 3 last week are guaranteed a spot; pick these first.
      // If this number exceeds the number of slots, add more battles at this level.

      // Pick from the remaining bands.
      const enteredBands = range(minBandCount).map(() => pickOut(levelBands))
        .filter(Boolean) as Band[];

      // If there are any slots remaining, generate new bands (and songs) to fill them.
      const newBandCount = Math.max(0, minBandCount - enteredBands.length);
      if (newBandCount) {
        const newBands = await addNewBands(range(newBandCount)
          .map(() => bandGen.generate({ level })));
        enteredBands.push(...newBands);

        await addNewSongs(newBands.flatMap(newBand => range(songCount)
          .map(() => ({ bandId: newBand.id, name: songNameGen.generate() }))));
      }

      return enteredBands;
    });

    // Run the battles.
    const weekLevels = await Promise.all(range(maxLevel).map(async l => {
      const level = maxLevel - l;
      const levelBaseBuzz = Math.pow(10, level);

      const enteredBands = enteredBandsByLevel[l];
      const battleCount = Math.ceil(enteredBands.length / battleSize);

      // Halve each band's buzz without changing level.
      await Promise.all(enteredBands.map(band => {
        setBandBuzz({
          bandId: band.id,
          buzz: Math.floor(band.buzz / 2),
          level: band.level,
        });
      }));

      return Promise.all(range(battleCount).map(async () => {
        const battleId = await addNewBattle({ weekId });

        const battleBands = range(battleSize).map(() => pickOut(enteredBands) as Band);
        // Store each band in an battle+band 'entry' junction table.
        await addNewEntries(battleBands.map(band => ({
          battleId,
          bandId: band.id,
          buzzStart: band.buzz,
        })));

        const songsByBand = new Map<Band, Song[]>();
        // TODO: get a random selection of each band's songs from the db, instead of all songs.
        await Promise.all(battleBands.map(async band => {
          songsByBand.set(band, await getBandSongs(band.id));
        }));

        const rankedBands: Band[] = [];
        const performedSongs = new Set<Song>();

        await addNewRounds(range(battleBands.length - 1).map(index => ({
          battleId,
          index,
        })));

        const performances = range(battleBands.length - 1).flatMap((index) => {
          // Create a performance for each surviving band, in random order.
          // TODO: store performances in a table, with reference to entry.
          const roundPerformances = shuffle(battleBands).map((band) => {
            // Pick a song that hasn't been performed yet, and add it to the performed list.
            const song = pick(songsByBand.get(band)
              ?.filter(s => !performedSongs.has(s)) as Song[]);
            performedSongs.add(song);

            // Assign a random score to the performance.
            return {
              battleId,
              roundIndex: index,
              bandId: band.id,
              songId: song.id,
              score: Math.round(Math.random() * 100),
            };
          });

          // Get the lowest-scoring performance (without sorting the array).
          const minPerf = roundPerformances.reduce((mp, p) => (p.score < mp.score ? p : mp));
          // Remove the lowest-scoring band from the battle; add it to the top of the ranked list.
          rankedBands.unshift(
            ...battleBands.splice(battleBands.findIndex(b => b.id === minPerf.bandId), 1));

          return roundPerformances;
        });

        await addNewPerformances(performances);

        // Add the last remaining band to the top of the ranked list.
        rankedBands.unshift(...battleBands);

        // Award buzz to each band and update their levels.
        await Promise.all(rankedBands.map((band, index) => {
          const buzzAwarded = getBuzzAwarded(levelBaseBuzz, index);
          const buzz = band.buzz + buzzAwarded;
          return Promise.all([
            setBandBuzz({
              bandId: band.id,
              buzz,
              level: Math.min(maxLevel, getBuzzLevel(buzz)),
            }),
            setEntryPlace({
              battleId,
              bandId: band.id,
              place: index + 1,
              buzzAwarded,
            }),
          ]);
        }));
      }));
    }));

    return { levels: weekLevels };
  });
}
