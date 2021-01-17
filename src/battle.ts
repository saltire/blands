import { getBandAndSongGenerator } from './generator';
import { Band, Song, BandPerformance, Week, Battle } from './types';
import { pick, pickOut, range, shuffle } from './utils';


function runBattle(bands: Band[]): Battle {
  const rankedBands: Band[] = [];
  const performedSongs = new Set<Song>();

  const rounds = range(bands.length - 1).map(() => {
    const performances = shuffle(bands.filter(b => !rankedBands.includes(b))).map(band => {
      const song = pick(band.songs.filter(s => !performedSongs.has(s)));
      performedSongs.add(song);
      return {
        band,
        song,
        score: Math.round(Math.random() * 100) / 10,
      };
    });

    const minPerf = performances.reduce((mp, perf) => (perf.score < mp.score ? perf : mp));
    rankedBands.unshift(minPerf.band);

    return {
      performances,
      eliminee: minPerf.band,
    };
  });

  rankedBands.unshift(bands.find(b => !rankedBands.includes(b)) as Band);

  return {
    rounds,
    bands: rankedBands,
  };
}

export async function generateBattle(battleSize: number = 5) {
  const bandGen = await getBandAndSongGenerator();

  const bands: Band[] = range(battleSize)
    .map(() => bandGen.generate({ songCount: battleSize - 1 }));

  return runBattle(bands);
}

function getBuzzAwarded(levelBaseBuzz: number, index: number) {
  return levelBaseBuzz * ([10, 5, 2.5][index] || 1);
}

interface weeksOptions {
  weekCount?: number;
  maxLevel?: number;
  battleSize?: number;
}

export async function generateWeeks(options?: weeksOptions): Promise<Week[]> {
  const { weekCount = 5, maxLevel = 5, battleSize = 5 } = options || {};

  const bandGen = await getBandAndSongGenerator();

  const bands: Band[] = [];

  return range(weekCount).map(() => {
    range(maxLevel).forEach(l => {
      const level = l + 1;
      const battleCount = maxLevel - l;
      const bandCount = battleCount * battleSize;
      const levelBands = bands.filter(b => b.level === level);
      range(Math.max(0, bandCount - levelBands.length)).forEach(() => {
        bands.push(bandGen.generate({ level, songCount: battleSize - 1 }));
      });
    });

    // For each battle at each level, pick bands at that level from the array.
    // TODO: When picking, prioritize bands that placed top 3 in a battle last week.
    // Run the battles.

    // Halve each band's buzz without changing level.
    bands.forEach(band => Object.assign(band, { buzz: Math.floor(band.buzz / 2) }));

    const weekLevels = range(maxLevel).map(l => {
      const level = maxLevel - l;
      const levelBaseBuzz = 10 ** level;
      const levelBands = bands.filter(b => b.level === level);
      return {
        level,
        bands: levelBands.map(band => ({ ...band })),
        battles: range(l + 1).map(() => {
          const battleBands = range(battleSize).map(() => pickOut(levelBands) as Band);
          const battle = runBattle(battleBands);

          const bandSnapshot = battle.bands.map(band => JSON.parse(JSON.stringify(band)));

          battleBands.forEach(band => {
            const rankedIndex = battle.bands.indexOf(band);
            const buzzAwarded = getBuzzAwarded(levelBaseBuzz, rankedIndex);
            const newBuzz = band.buzz + buzzAwarded;
            const newLevel = Math.min(maxLevel, Math.max(0, Math.floor(Math.log10(newBuzz))));

            // Add a summary of the battle to the band data.
            band.battles.push({
              startBuzz: band.buzz,
              startLevel: band.level,
              performances: battle.rounds
                .map(round => {
                  const performance = round.performances.find(perf => perf.band === band);
                  return performance && {
                    song: performance.song,
                    score: performance.score,
                    rank: round.performances.length - round.performances.indexOf(performance),
                  };
                })
                .filter(Boolean) as BandPerformance[],
              rank: battle.bands.length - battle.bands.indexOf(band),
              buzzAwarded,
              newLevel,
            });

            // Award buzz based on placement, and update level.
            Object.assign(band, { buzz: newBuzz, level: newLevel });
          });

          // Add a snapshot of each band to the battle data.
          battle.bands = bandSnapshot;
          return battle;
        }),
      };
    });

    return { levels: weekLevels };
  });
}
