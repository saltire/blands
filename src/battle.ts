import BandGenerator from './bandname.ts';
import SongGenerator from './songname.ts';
import { pick, range, shuffle } from './utils.ts';


const roundCount = 10;

export default async function battle() {
  const bandGen = new BandGenerator();
  const songGen = new SongGenerator();

  const bands = await Promise.all(range(roundCount).map(async () => ({
    name: await bandGen.generate(),
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
        band: perf.band.name,
        song: perf.song.name,
        score: perf.score,
      })),
      eliminee: minPerf.band.name,
    };
  });

  return {
    rounds,
    winner: bands.find(band => !band.eliminated)?.name as string,
  };
}
