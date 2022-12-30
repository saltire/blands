import {
  getBandsAtLevel, getBandsSongIds, updateEntries, halveBuzz,
} from './db';
import {
  addBandsBuzz, addNewBands, addNewBattles, addNewEntries, addNewPerformances, addNewSongs,
  addNewWeek, getFreeBandsAtLevel, retireBands, setWeeklyBuzz, NewPerformance,
} from './db2';
import { getBandGenerator, getSongNameGenerator } from './generator';
import { mapSeries, pickOut, pickOutMultiple, range, shuffle } from './utils';


function getBuzzAwarded(levelBaseBuzz: number, index: number) {
  return levelBaseBuzz * ([10, 5, 2.5][index] || 1);
}

// function getBuzzLevel(buzz: number) {
//   return Math.max(1, Math.floor(Math.log10(buzz)));
// }

type WeekOptions = {
  maxLevel?: number,
  battleSize?: number,
  // Fixed only.
  getMinBattleCount?: (level: number, maxLevel: number) => number,
  // Seeded only.
  minNewBandCount?: number,
  getMaxBattleCount?: (level: number, maxLevel: number) => number,
};

const defaultOptions: Required<WeekOptions> = {
  maxLevel: 5,
  battleSize: 5,
  // The top level has one battle, and each level down has one more than the above.
  getMinBattleCount: (level, maxLevel) => maxLevel - level + 1,
  minNewBandCount: 5,
  getMaxBattleCount: (level, maxLevel) => maxLevel - level + 2,
};

type WeekBattle = {
  battleId: number,
  level: number,
  bandIds: number[],
};

// Run a fixed number of battles at each level.
// Bands that are not picked for a battle at their level will skip the week.
export async function getWeekBattlesFixed(weekId: number, options?: WeekOptions):
Promise<WeekBattle[]> {
  const { maxLevel, battleSize, getMinBattleCount } = { ...defaultOptions, ...options };
  const songCount = battleSize - 1;

  const bandGen = await getBandGenerator();
  const songNameGen = await getSongNameGenerator();

  const levels = range(maxLevel).map(l => l + 1); // Run levels from lowest to highest.

  // Create battles at each level; pick bands and create entries for each battle.
  const newBattles = (await mapSeries(levels, async level => {
    // Get the minimum number of battles for each level.
    const minBattleCount = getMinBattleCount(level, maxLevel);
    const minBandCount = minBattleCount * battleSize;

    // Get all bands at this level.
    const levelBands = await getBandsAtLevel(level);
    const firstBandIds = levelBands.filter(band => band.lastPlace === 1).map(band => band.id);

    // Bands that placed first in their last battle get picked first.
    const enteringBandIds = pickOutMultiple(firstBandIds, minBandCount);

    // Pick from the remaining bands.
    const otherBandIds = levelBands.map(band => band.id)
      .filter(bandId => !enteringBandIds.includes(bandId));
    enteringBandIds.push(...pickOutMultiple(otherBandIds, minBandCount - enteringBandIds.length));

    // TODO: If the number of first-place bands exceeds the number of slots,
    // add more battles at this level. For now, just use the minimum number.
    const battleCount = minBattleCount;

    // If there are any slots remaining, generate new bands (and songs) to fill them.
    const newBandCount = minBandCount - enteringBandIds.length;
    if (newBandCount > 0) {
      const newBandIds = await addNewBands(range(newBandCount)
        .map(() => bandGen.generate({ weekId, level })));
      enteringBandIds.push(...newBandIds);

      await addNewSongs(newBandIds.flatMap(newBandId => range(songCount)
        .map(() => ({ band_id: newBandId, name: songNameGen.generate() }))));
    }

    // Create the battles in the db.
    const battleIds = await addNewBattles(
      range(battleCount).map(() => ({ week_id: weekId, level })));

    // Pick bands for each battle and return them.
    const levelBattles = battleIds.map(battleId => ({
      battleId,
      level,
      bandIds: pickOutMultiple(enteringBandIds, battleSize),
    }));

    return levelBattles;
  })).flat();

  // Create new entries for all battles at all levels.
  await addNewEntries(newBattles.flatMap(battle => battle.bandIds
    .map(bandId => ({ battle_id: battle.battleId, band_id: bandId }))));

  return newBattles;
}

// Only generate bands at the lowest level, and run as many battles as necessary at each level.
// Bands that are not picked for a battle at their level can be picked at lower levels.
export async function getWeekBattlesSeeded(weekId: number, options?: WeekOptions):
Promise<WeekBattle[]> {
  const {
    maxLevel, battleSize, minNewBandCount, getMaxBattleCount,
  } = { ...defaultOptions, ...options };

  const songCount = battleSize - 1;

  return (await mapSeries(range(maxLevel), async l => {
    const level = maxLevel - l;
    const maxBattleCount = getMaxBattleCount(level, maxLevel);

    // Get all bands at this level or higher who have not been entered yet.
    const levelBands = await getFreeBandsAtLevel(weekId, level);

    // Prioritize bands that won their last battle.
    // (An alternate way would be to pick the highest *ranking* bands at this level, or both.)
    const defendingBandIds = levelBands.filter(band => band.last_place === 1).map(band => band.id);
    // After that, if we are at the first level, prioritize a quota of new bands.
    const priorityNewBandIds = [];
    const otherBandIds = levelBands.filter(band => band.last_place !== 1).map(band => band.id);

    // Maintain a minimum number of bands at the lowest level, generating more as needed.
    // Even if there are already enough, there may be a minimum number of NEW bands every week.
    if (level === 1) {
      const minLevel1Bands = maxBattleCount * battleSize;
      const newBandCount = Math.max(minNewBandCount, minLevel1Bands - levelBands.length);

      if (newBandCount) {
        const bandGen = await getBandGenerator();
        const songNameGen = await getSongNameGenerator();

        const newBandIds = await addNewBands(range(newBandCount)
          .map(() => bandGen.generate({ weekId, level })));

        // After defending bands, give a quota of new bands priority over the rest.
        priorityNewBandIds.push(...pickOutMultiple(newBandIds, minNewBandCount));
        otherBandIds.push(...newBandIds);

        await addNewSongs([...priorityNewBandIds, ...newBandIds]
          .flatMap(newBandId => range(songCount)
            .map(() => ({ band_id: newBandId, name: songNameGen.generate() }))));
      }
    }

    // Pick enough bands to exactly fill as many battles as possible, up to a maximum.
    const battleCount = Math.min(maxBattleCount, Math.floor(
      (defendingBandIds.length + priorityNewBandIds.length + otherBandIds.length) / battleSize));
    if (!battleCount) {
      return [];
    }
    const bandCount = battleCount * battleSize;

    // Pick bands from each pool in order of priority.
    const selectedPriorityBandIds = pickOutMultiple(priorityNewBandIds,
      bandCount - defendingBandIds.length);
    const selectedOtherBandIds = pickOutMultiple(otherBandIds,
      bandCount - defendingBandIds.length - selectedPriorityBandIds.length);
    const enteringBandIds = [
      ...defendingBandIds,
      ...selectedPriorityBandIds,
      ...selectedOtherBandIds,
    ];

    // Create the battles for this level.
    const battleIds = await addNewBattles(
      range(battleCount).map(() => ({ week_id: weekId, level })));

    // Assign bands to each battle.
    const levelBattles = battleIds.map(battleId => ({
      battleId,
      level,
      bandIds: pickOutMultiple(enteringBandIds, battleSize),
    }));

    // Create new entries now, so the next level will be able to pick from unentered bands.
    await addNewEntries(levelBattles.flatMap(battle => battle.bandIds
      .map(bandId => ({ battle_id: battle.battleId, band_id: bandId }))));

    return levelBattles;
  })).flat();
}

export async function generateWeek(options?: WeekOptions) {
  const weekId = await addNewWeek();

  // const newBattles = await getWeekBattlesFixed(weekId, options);
  const newBattles = await getWeekBattlesSeeded(weekId, options);

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

    // Generate performances for each round.
    const performances: NewPerformance[] = range(bandIds.length - 1).flatMap(roundIndex => {
      // Create a performance for each surviving band, in random order.
      // TODO: store performances in a table, with reference to entry.
      const roundPerformances = shuffle(remainingBandIds).map(bandId => {
        // Pick a song that hasn't been performed yet.
        const songId = pickOut(songIdsByBandId[bandId] as number[]) as number;
        // Assign a random score to the performance.
        return {
          battle_id: battleId,
          round_index: roundIndex,
          band_id: bandId,
          song_id: songId,
          score: Math.round(Math.random() * 100),
        };
      });

      // Get the lowest-scoring performance (without sorting the array).
      const minPerf = roundPerformances.reduce((mp, p) => (p.score < mp.score ? p : mp));
      // Remove the lowest-scoring band from the battle; add it to the top of the ranked list.
      rankedBandIds.unshift(
        ...remainingBandIds.splice(remainingBandIds.indexOf(minPerf.band_id), 1));

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
    updateEntries(battleResults.flatMap(battle => battle.entries)),
    addNewPerformances(battleResults.flatMap(battle => battle.performances)),
    // Update each band with buzz awarded.
    addBandsBuzz(weekId, battleResults.flatMap(battle => battle.entries
      .map(({ bandId, buzzAwarded }) => ({ bandId, buzz: buzzAwarded }))))
      .then(() => setWeeklyBuzz(weekId))
      // Retire bands that have fallen below level 1.
      .then(() => retireBands(weekId)),
  ]);

  return weekId;
}
