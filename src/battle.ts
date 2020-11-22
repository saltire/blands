import Generator from './generator.ts';
import { pick, range, shuffle } from './utils.ts';


type Song = {
  name: string,
};
type Band = {
  name: string,
  color: string,
  songs: Song[],
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

async function runBattle(bands: Band[]): Promise<Battle> {
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

export async function generateBattle(bandCount: number = 5) {
  const bandGen = Generator.bandGenerator();
  const songGen = Generator.songGenerator();

  const bands: Band[] = await Promise.all(range(bandCount).map(async () => ({
    name: await bandGen.generate(),
    color: generateColor(),
    songs: await Promise.all(range(bandCount - 1).map(async () => ({
      name: await songGen.generate(),
      performed: false,
    }))),
    eliminated: false,
  })));

  return runBattle(bands);
}
