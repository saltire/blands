import { NewBand } from './db2';
import { generateColorScheme } from './color';
import { readCsvColumns } from './csv';
import { getGenreTree, pickRandomGenre } from './genre';
import { pick } from './utils';


export type Generator<T, C extends object | undefined = undefined> = {
  generate: (config?: C) => T,
}

export async function getCsvStringGenerator(csvPath: string, capitalize?: boolean):
Promise<Generator<string>> {
  const map = await readCsvColumns(csvPath);

  return {
    generate() {
      let title = pick(map.templates);

      while (title.includes('{')) {
        title = title.replace(/\{(.+?)\}/g, (_: string, key: string) => pick(map[key]));
      }

      return !capitalize ? title : title.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    },
  };
}

let bandNameGen: Generator<string>;
export async function getBandNameGenerator() {
  bandNameGen = bandNameGen || await getCsvStringGenerator('data/bands.csv', false);
  return bandNameGen;
}

let songNameGen: Generator<string>;
export async function getSongNameGenerator() {
  songNameGen = songNameGen || await getCsvStringGenerator('data/songs.csv', true);
  return songNameGen;
}

let bandGen: Generator<NewBand, {
  weekId?: number,
  level?: number,
}>;
export async function getBandGenerator() {
  if (!bandGen) {
    const nameGen = await getBandNameGenerator();
    const genres = await getGenreTree();

    bandGen = {
      generate({ weekId = 1, level = 1 } = {}) {
        const { light, dark } = generateColorScheme();
        const genre = pickRandomGenre(genres);

        return {
          name: nameGen.generate(),
          color_light: light,
          color_dark: dark,
          tags: [...genre.parentGenres, genre.name].reverse().join(', '),
          buzz: 10 ** level,
          level,
          start_week_id: weekId,
          start_level: level,
        };
      },
    };
  }

  return bandGen;
}
