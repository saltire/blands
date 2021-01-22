import {
  addNewBands, addBandsBuzz, getBandIdsAtLevel, addNewSongs, getBandsSongIds,
  addNewWeek, addNewBattles, addNewEntries, addNewPerformances, addNewRounds,
  halveBuzz, setWeeklyBuzz,
} from './db';
import { getBandGenerator, getSongNameGenerator } from './generator';
import { mapSeries, pickOut, range, shuffle } from './utils';


function getBuzzAwarded(levelBaseBuzz: number, index: number) {
  return levelBaseBuzz * ([10, 5, 2.5][index] || 1);
}

// function getBuzzLevel(buzz: number) {
//   return Math.max(1, Math.floor(Math.log10(buzz)));
// }

interface WeeksOptions {
  weekCount?: number;
  maxLevel?: number;
  battleSize?: number;
}

// eslint-disable-next-line import/prefer-default-export
export async function generateWeeks(options?: WeeksOptions) {
  const { weekCount = 5, maxLevel = 5, battleSize = 5 } = options || {};
  const songCount = battleSize - 1;

  const bandGen = await getBandGenerator();
  const songNameGen = await getSongNameGenerator();

  return mapSeries(range(weekCount), async () => {
    const weekId = await addNewWeek();
    const levels = range(maxLevel).map(l => l + 1); // Run levels from lowest to highest.

    // Create battles at each level; pick bands and create entries for each battle.
    const newBattles = (await mapSeries(levels, async level => {
      // The top level has one battle; each level down has one more than the one above it.
      const minBattleCount = maxLevel - level + 1;
      const minBandCount = minBattleCount * battleSize;

      // Get all bands at this level.
      const levelBandIds = await getBandIdsAtLevel(level);

      // TODO: Bands that placed in top 3 last week are guaranteed a spot; pick these first.
      // If this number exceeds the number of slots, add more battles at this level.
      // For now, just use the minimum number.
      const battleCount = minBattleCount;

      // Pick from the remaining bands.
      const enteringBandIds = range(minBandCount).map(() => pickOut(levelBandIds))
        .filter(Boolean) as number[];

      // If there are any slots remaining, generate new bands (and songs) to fill them.
      const newBandCount = Math.max(0, minBandCount - enteringBandIds.length);
      if (newBandCount) {
        const newBandIds = await addNewBands(range(newBandCount)
          .map(() => bandGen.generate({ level })));
        enteringBandIds.push(...newBandIds);

        await addNewSongs(newBandIds.flatMap(newBandId => range(songCount)
          .map(() => ({ bandId: newBandId, name: songNameGen.generate() }))));
      }

      // Create the battles in the db.
      const battleIds = await addNewBattles(range(battleCount).map(() => ({ weekId, level })));

      // Pick bands for each battle and return them.
      return battleIds.map(battleId => ({
        battleId,
        level,
        bandIds: range(battleSize).map(() => pickOut(enteringBandIds) as number),
      }));
    })).flat();

    // Halve every band's buzz.
    await halveBuzz();

    // Run the battles.
    const battleResults = await Promise.all(newBattles.map(async ({ battleId, level, bandIds }) => {
      const levelBaseBuzz = 10 ** level;

      const remainingBandIds = [...bandIds];
      const rankedBandIds: number[] = [];

      // TODO: get a random selection of each band's songs from the db, instead of all songs.
      const songIdsByBandId = Object.fromEntries((await getBandsSongIds(bandIds))
        .map(({ bandId, songIds }) => [bandId, songIds]));

      // Add this battle's rounds to the db.
      // TODO: rounds don't really need a table at all; modify queries not to use them.
      await addNewRounds(range(bandIds.length - 1).map(index => ({
        battleId,
        index,
      })));

      // Generate performances for each round.
      const performances = range(bandIds.length - 1).flatMap(roundIndex => {
        // Create a performance for each surviving band, in random order.
        // TODO: store performances in a table, with reference to entry.
        const roundPerformances = shuffle(remainingBandIds).map(bandId => {
          // Pick a song that hasn't been performed yet.
          const songId = pickOut(songIdsByBandId[bandId] as number[]) as number;
          // Assign a random score to the performance.
          return {
            battleId,
            roundIndex,
            bandId,
            songId,
            score: Math.round(Math.random() * 100),
          };
        });

        // Get the lowest-scoring performance (without sorting the array).
        const minPerf = roundPerformances.reduce((mp, p) => (p.score < mp.score ? p : mp));
        // Remove the lowest-scoring band from the battle; add it to the top of the ranked list.
        rankedBandIds.unshift(
          ...remainingBandIds.splice(remainingBandIds.indexOf(minPerf.bandId), 1));

        return roundPerformances;
      });

      // Add the last remaining band to the top of the ranked list.
      rankedBandIds.unshift(...remainingBandIds);

      // Store each band in an battle+band 'entry' junction table, with their ranking.
      return {
        entries: rankedBandIds.map((bandId, i) => ({
          battleId,
          bandId,
          place: i + 1,
          buzzAwarded: getBuzzAwarded(levelBaseBuzz, i),
        })),
        performances,
      };
    }));

    await Promise.all([
      // Store all battles' entries and performances.
      addNewEntries(battleResults.flatMap(battle => battle.entries)),
      addNewPerformances(battleResults.flatMap(battle => battle.performances)),
      // Update each band with buzz awarded.
      addBandsBuzz(battleResults.flatMap(battle => battle.entries
        .map(({ bandId, buzzAwarded }) => ({ bandId, buzz: buzzAwarded }))))
        .then(() => setWeeklyBuzz(weekId)),
    ]);
  });
}
