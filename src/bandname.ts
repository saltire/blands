import { readCsv, csvToMap, CsvRows, ColumnsMap } from './csv.ts';
import { pick, range } from './utils.ts';


const csvPaths = ['data/metal.csv', 'data/verbthenoun.csv'];

export default class BandGenerator {
  private maps: Promise<ColumnsMap[]>;

  constructor() {
    this.maps = Promise.all(csvPaths.map(csvPath => readCsv(csvPath).then(csvToMap)));
  }

  async generate() {
    const map = pick(await this.maps);
    return Object.values(map).map(list => pick(list)).join(' ');
  }
}


// async function readJson(input: string): Promise<ColumnsMap> {
//   return Deno.readTextFile(input).then(JSON.parse);
// }

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
