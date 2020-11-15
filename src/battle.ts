import BandGenerator from './bandname.ts';
import SongGenerator from './songname.ts';
import { pick, range, shuffle } from './utils.ts';


const roundCount = 10;

type Song = {
  name: string,
  performed: boolean,
};
type Band = {
  name: string,
  color: string,
  songs: Song[],
  eliminated: boolean,
};
type BandInfo = {
  name: string,
  color: string,
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

export default async function battle() {
  const bandGen = new BandGenerator();
  const songGen = new SongGenerator();

  const bands = await Promise.all(range(roundCount).map(async () => ({
    name: await bandGen.generate(),
    color: generateColor(),
    songs: await Promise.all(range(roundCount).map(async () => ({
      name: await songGen.generate(),
      performed: false,
    }))),
    eliminated: false,
  })));

  const rounds = range(roundCount - 1).map(() => {
    const performances = shuffle(bands.filter(b => !b.eliminated)).map((band) => {
      const song = pick(band.songs.filter(s => !s.performed));
      song.performed = true;
      return {
        band,
        song,
        score: Math.round(Math.random() * 100) / 10,
      };
    });

    const minPerf = performances.reduce((mp, perf) => (perf.score < mp.score ? perf : mp));
    minPerf.band.eliminated = true;

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
    winner: formatBand(bands.find(band => !band.eliminated) as Band),
  };
}
