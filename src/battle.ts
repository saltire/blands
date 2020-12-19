import { getBandGenerator } from './generator';
import { Band, Song, BandPerformance, Week, Battle } from './types';
import { pick, pickOut, range, shuffle } from './utils';


function runBattle(bands: Band[]): Battle {
  const rankedBands: Band[] = [];
  const performedSongs = new Set<Song>();

  const rounds = range(bands.length - 1).map(() => {
    const performances = shuffle(bands.filter(b => !rankedBands.includes(b))).map((band) => {
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
    rankedBands,
  };
}

export async function generateBattle(battleSize: number = 5) {
  const bandGen = await getBandGenerator();

  const bands: Band[] = range(battleSize)
    .map(() => bandGen.generate({ songCount: battleSize - 1 }));

  return runBattle(bands);
}

function getBuzzAwarded(levelBaseBuzz: number, index: number) {
  return levelBaseBuzz * ([10, 5, 2.5][index] || 1);
}

function runWeek(bands: Band[], levelCount: number, battleSize: number): Week {
  // For each battle at each level, pick bands at that level from the array.
  // TODO: When picking, prioritize bands that placed top 3 in a battle last week.
  // Run the battles.

  // Halve each band's buzz without changing level.
  bands.forEach(band => {
    band.buzz = Math.floor(band.buzz / 2);
  });

  return {
    levels: range(levelCount).map(l => {
      const level = levelCount - l;
      const levelBaseBuzz = Math.pow(10, level);
      const levelBands = bands.filter(b => b.level === level);
      return {
        level,
        bands: levelBands.map(band => ({ ...band })),
        battles: range(l + 1).map(() => {
          const battleBands = range(battleSize).map(() => pickOut(levelBands) as Band);
          const battle = runBattle(battleBands);

          const bandSnapshot = battle.rankedBands.map(band => JSON.parse(JSON.stringify(band)));

          battleBands.forEach(band => {
            const rankedIndex = battle.rankedBands.indexOf(band);
            const buzzAwarded = getBuzzAwarded(levelBaseBuzz, rankedIndex);
            const newBuzz = band.buzz + buzzAwarded;
            const newLevel = Math.min(levelCount, Math.max(0, Math.floor(Math.log10(newBuzz))));

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
              rank: battle.rankedBands.length - battle.rankedBands.indexOf(band),
              buzzAwarded,
              newLevel,
            });

            // Award buzz based on placement, and update level.
            band.buzz = newBuzz;
            band.level = newLevel;
          });

          // Add a snapshot of each band to the battle data.
          battle.rankedBands = bandSnapshot;
          return battle;
        }),
      };
    }),
  };
}

export async function generateWeeks(weekCount: number = 1) {
  const bandGen = await getBandGenerator();

  const levelCount = 5;
  const battleSize = 5;
  const bands: Band[] = [];

  return range(weekCount).map(() => {
    range(levelCount).forEach(l => {
      const level = l + 1;
      const battleCount = levelCount - l;
      const bandCount = battleCount * battleSize;
      const levelBands = bands.filter(b => b.level === level);
      range(Math.max(0, bandCount - levelBands.length)).forEach(() => {
        bands.push(bandGen.generate({ level, songCount: battleSize - 1 }));
      });
    });

    return runWeek(bands, levelCount, battleSize);
  });
}
