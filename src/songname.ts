import { readCsv, csvToMap, CsvRows, ColumnsMap } from './csv.ts';
import { pick, range } from './utils.ts';


const csvPath = 'data/songname.csv';

export default class SongGenerator {
  map: Promise<ColumnsMap>;

  constructor() {
    this.map = readCsv(csvPath).then(csvToMap);
  }

  async generate() {
    const map = await this.map;

    let title = pick(map.songName);

    while (title.includes('$')) {
      title = title.replace(/\$\{(.+?)\}/g, (_: string, key: string) => pick(map[key]));
    }

    return title.split(' ')
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
