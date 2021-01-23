import { NewBand } from './db';
import { generateColorScheme } from './color';
import { readCsv, csvToMap } from './csv';
import { pick } from './utils';


interface GeneratorConfig {}

export interface Generator<T> {
  generate: (config?: GeneratorConfig) => T,
}

export async function getGenerator(csvPath: string, capitalize?: boolean):
Promise<Generator<string>> {
  const map = await readCsv(csvPath).then(csvToMap);

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

export async function getBandNameGenerator() {
  return getGenerator('data/bands.csv', false);
}

export async function getSongNameGenerator() {
  return getGenerator('data/songs.csv', true);
}

interface BandGeneratorConfig extends GeneratorConfig {
  level?: number,
  songCount?: number,
}

export async function getBandGenerator(): Promise<Generator<NewBand>> {
  const bandNameGen = await getBandNameGenerator();

  return {
    generate(config?: BandGeneratorConfig): NewBand {
      const { level } = { level: 1, ...config };
      const { light, dark } = generateColorScheme();

      return {
        name: bandNameGen.generate(),
        colorLight: light,
        colorDark: dark,
        level,
        buzz: 10 ** level,
      };
    },
  };
}
