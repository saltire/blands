import { readCsv, csvToMap, ColumnsMap } from './csv.ts';
import { pick } from './utils.ts';


export default class Generator {
  static bandGenerator() {
    return new Generator('data/bands.csv', false);
  }

  static songGenerator() {
    return new Generator('data/songs.csv', true);
  }

  map: Promise<ColumnsMap>;
  capitalize: boolean;

  constructor(csvPath: string, capitalize?: boolean) {
    this.map = readCsv(csvPath).then(csvToMap);
    this.capitalize = !!capitalize;
  }

  async generate() {
    const map = await this.map;

    let title = pick(map.templates);

    while (title.includes('{')) {
      title = title.replace(/\{(.+?)\}/g, (_: string, key: string) => pick(map[key]));
    }

    return !this.capitalize ? title : title.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}


// async function main() {
//   const metal1 = await readJson('./metal1.json');
//   const metal2 = await readJson('./metal2.json');

//   const metal = {
//     start: mergeSet(metal1.start, metal2.start).sort(),
//     end: mergeSet(metal1.end, metal2.end).sort(),
//   };

//   return writeCsv(mapToCsv(metal), './metal.csv');
// }

// await main();
