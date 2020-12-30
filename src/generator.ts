import { NewBand } from './db';
import { generateColor } from './color';
import { readCsv, csvToMap } from './csv';
import { Band } from './types';
import { pick, range } from './utils';


interface GeneratorConfig {}

export interface Generator<T> {
  generate: (config?: GeneratorConfig) => T,
}

export async function getGenerator(csvPath: string, capitalize?: boolean): Promise<Generator<string>> {
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

export async function getBandAndSongGenerator(): Promise<Generator<Band>> {
  const [bandNameGen, songNameGen] = await Promise.all([
    getBandNameGenerator(),
    getSongNameGenerator(),
  ]);

  return {
    generate(config?: BandGeneratorConfig): Band {
      const { songCount, level } = { songCount: 10, level: 1, ...config };

      return {
        name: bandNameGen.generate(),
        color: generateColor(),
        songs: range(songCount || 10).map(() => ({
          name: songNameGen.generate(),
        })),
        level,
        buzz: Math.pow(10, level),
        battles: [],
      };
    },
  };
}

export async function getBandGenerator(): Promise<Generator<NewBand>> {
  const bandNameGen = await getBandNameGenerator();

  return {
    generate(config?: BandGeneratorConfig): NewBand {
      const { level } = { level: 1, ...config };

      return {
        name: bandNameGen.generate(),
        color: generateColor(),
        level,
        buzz: Math.pow(10, level),
      };
    },
  };
}
