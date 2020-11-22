import { getBandGenerator, getSongGenerator } from './generator.ts';
import { pick, range, shuffle } from './utils.ts';


type Song = {
  name: string,
};
type Band = {
  name: string,
  color: string,
  songs: Song[],
  level?: number,
  buzz?: number,
};
type BandInfo = {
  name: string,
  color: string,
};
type Performance = {
  band: BandInfo,
  song: string,
  score: number,
};
type Round = {
  performances: Performance[],
  eliminee: BandInfo,
};
type Battle = {
  rounds: Round[],
  places: BandInfo[],
};

const randomChannelValue = (min: number) => Math.round(Math.random() * (255 - min)) + min;

const generateColor = () => {
  const zc = Math.floor(Math.random() * 3);
  return '#' + range(3)
    // One RGB channel can be from 0-255, the others from 64-255.
    .map(c => randomChannelValue(c === zc ? 0 : 64).toString(16).padStart(2, '0'))
    .join('')
};

const formatBand = (band: Band): BandInfo => band;

function runBattle(bands: Band[]): Battle {
  const placedBands: Band[] = [];
  const performedSongs = new Set<Song>();

  const rounds = range(bands.length - 1).map(() => {
    const performances = shuffle(bands.filter(b => !placedBands.includes(b))).map((band) => {
      const song = pick(band.songs.filter(s => !performedSongs.has(s)));
      performedSongs.add(song);
      return {
        band,
        song,
        score: Math.round(Math.random() * 100) / 10,
      };
    });

    const minPerf = performances.reduce((mp, perf) => (perf.score < mp.score ? perf : mp));
    placedBands.unshift(minPerf.band);

    return {
      performances: performances.map(perf => ({
        band: formatBand(perf.band),
        song: perf.song.name,
        score: perf.score,
      })),
      eliminee: formatBand(minPerf.band),
    };
  });

  return {
    rounds,
    places: [bands.find(b => !placedBands.includes(b)) as Band, ...placedBands.map(formatBand)],
  };
}

export async function generateBattle(battleSize: number = 5) {
  const [bandGen, songGen] = await Promise.all([
    getBandGenerator(),
    getSongGenerator(),
  ]);

  const bands: Band[] = range(battleSize).map(() => ({
    name: bandGen.generate(),
    color: generateColor(),
    songs: range(battleSize - 1).map(() => ({
      name: songGen.generate(),
    })),
  }));

  return runBattle(bands);
}

export async function generateWeeks() {
  const [bandGen, songGen] = await Promise.all([
    getBandGenerator(),
    getSongGenerator(),
  ]);

  const levelCount = 5;
  const battleSize = 5;

  const bands = range(levelCount).flatMap(l => {
    const level = levelCount - l;
    const levelBaseBuzz = Math.pow(10, level);
    return range((l + 1) * battleSize).map(() => ({
      name: bandGen.generate(),
      color: generateColor(),
      songs: range(battleSize - 1).map(() => ({
        name: songGen.generate(),
      })),
      level,
      buzz: levelBaseBuzz,
    } as Band));
  });

  // Halve each band's buzz without changing level.
  // For each battle at each level, pick bands at that level from the array.
  // When picking, prioritize bands that placed top 3 in a battle last week.
  // Run the battles.
  // Award buzz to bands based on placement.
  // Update band levels where applicable.
  // Repeat.
}
