import {
  Band, Song,
  addNewBands, setBandsBuzz, getBandsAtLevel, addNewSongs, getBandsSongs,
  addNewWeek, addNewBattles, addNewEntries, addNewPerformances, addNewRounds,
  aggregateWeeks, aggregateWeeksSimple, setWeeklyBuzz,
} from './db';
import { getBandGenerator, getSongNameGenerator } from './generator';
import { mapSeries, pickOut, range, shuffle } from './utils';


function getBuzzAwarded(levelBaseBuzz: number, index: number) {
  return levelBaseBuzz * ([10, 5, 2.5][index] || 1);
}

function getBuzzLevel(buzz: number) {
  return Math.max(1, Math.floor(Math.log10(buzz)));
}

interface WeeksOptions {
  weekCount?: number;
  maxLevel?: number;
  battleSize?: number;
}

export async function generateWeeks(options?: WeeksOptions) {
  const { weekCount = 5, maxLevel = 5, battleSize = 5 } = options || {};
  const songCount = battleSize - 1;

  const bandGen = await getBandGenerator();
  const songNameGen = await getSongNameGenerator();

  return mapSeries(range(weekCount), async () => {
    const weekId = await addNewWeek();

    // For each battle at each level, pick bands at that level from the array.
    // TODO: When picking, prioritize bands that placed top 3 in a battle last week.
    const enteredBandsByLevel = await Promise.all(range(maxLevel).map(async l => {
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
    }));

    // Halve each band's buzz without changing level.
    await setBandsBuzz(enteredBandsByLevel
      .flatMap(levelEnteredBands => levelEnteredBands.map(band => {
        // Mutate each band object, and also update it in the db.
        Object.assign(band, { buzz: Math.floor(band.buzz / 2) });
        return {
          bandId: band.id,
          buzz: band.buzz,
          level: band.level,
        };
      })));

    // Run the battles.
    const week = await Promise.all(range(maxLevel).map(async l => {
      const level = maxLevel - l;
      const levelBaseBuzz = 10 ** level;

      const levelEnteredBands = enteredBandsByLevel[l];
      const battleCount = Math.ceil(levelEnteredBands.length / battleSize);

      // Create the battles in the db.
      const battleIds = await addNewBattles(range(battleCount).map(() => ({ weekId, level })));

      return Promise.all(battleIds.map(async battleId => {
        const battleBands = range(battleSize).map(() => pickOut(levelEnteredBands) as Band);
        const rankedBands: Band[] = [];

        const [songs] = await Promise.all([
          // TODO: get a random selection of each band's songs from the db, instead of all songs.
          getBandsSongs(battleBands.map(band => band.id)),
          // Add this battle's rounds to the db.
          addNewRounds(range(battleBands.length - 1).map(index => ({
            battleId,
            index,
          }))),
        ]);
        const songsByBand = new Map<Band, Song[]>(
          battleBands.map(band => [band, songs.filter(song => song.bandId === band.id)]));

        const performances = range(battleBands.length - 1).flatMap(index => {
          // Create a performance for each surviving band, in random order.
          // TODO: store performances in a table, with reference to entry.
          const roundPerformances = shuffle(battleBands).map(band => {
            // Pick a song that hasn't been performed yet.
            const song = pickOut(songsByBand.get(band) as Song[]) as Song;
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

        // Add the last remaining band to the top of the ranked list.
        rankedBands.unshift(...battleBands);

        // Store each band in an battle+band 'entry' junction table, with their ranking.
        const entries = rankedBands.map((band, i) => ({
          battleId,
          bandId: band.id,
          buzzStart: band.buzz,
          place: i + 1,
          buzzAwarded: getBuzzAwarded(levelBaseBuzz, i),
        }));
        // Award buzz to each band and update their levels.
        const bandUpdates = rankedBands.map((band, i) => {
          const buzz = band.buzz + (entries[i].buzzAwarded as number);
          return {
            bandId: band.id,
            buzz,
            level: Math.min(maxLevel, getBuzzLevel(buzz)),
          };
        });

        return {
          entries,
          performances,
          bandUpdates,
        };
      }));
    }));

    await Promise.all([
      addNewEntries(week.flatMap(level => level.flatMap(battle => battle.entries))),
      addNewPerformances(week.flatMap(level => level.flatMap(battle => battle.performances))),
      setBandsBuzz(week.flatMap(level => level.flatMap(battle => battle.bandUpdates)))
        .then(() => setWeeklyBuzz(weekId)),
    ]);

    return week;
  });
}

export async function getWeeks() {
  return aggregateWeeks();
}

export async function getWeeksSimple() {
  return aggregateWeeksSimple();
}
