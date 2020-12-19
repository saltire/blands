import { getBandGenerator } from './generator';
import { Song, Band, Battle, Week } from './types';
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

function runWeek(bands: Band[], levelCount: number, battleSize: number): Week {
  // Halve each band's buzz without changing level.
  // For each battle at each level, pick bands at that level from the array.
  // TODO: When picking, prioritize bands that placed top 3 in a battle last week.
  // Run the battles.
  // Award buzz to bands based on placement.
  // Update band levels where applicable.

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
          battle.rankedBands[0].buzz += levelBaseBuzz * 10;
          battle.rankedBands[1].buzz += levelBaseBuzz * 5;
          battle.rankedBands[2].buzz += levelBaseBuzz * 2.5;
          battle.rankedBands.slice(3).forEach(band => {
            band.buzz += levelBaseBuzz;
          });
          battle.rankedBands.forEach(band => {
            band.level = Math.min(levelCount, Math.max(0, Math.floor(Math.log10(band.buzz))));
          });
          battle.rankedBands = battle.rankedBands.map(band => ({ ...band }));
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
