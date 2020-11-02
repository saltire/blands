const mergeSet = <T>(...arrays: T[][]): T[] => Array.from(new Set([...arrays.flat()]));
const pick = (array: any[]) => array[Math.floor(Math.random() * array.length)];
const range = (length: number) => [...Array(length).keys()];

type CsvRows = string[][];
type ColumnsMap = { [column: string]: string[] };

async function readJson(input: string): Promise<ColumnsMap> {
  return Deno.readTextFile(input).then(JSON.parse);
}

async function readCsv(input: string): Promise<CsvRows> {
  const data = await Deno.readTextFile(input);
  return data.split('\n').map(row => row.split(','));
}

async function writeCsv(rows: CsvRows, output: string): Promise<void> {
  Deno.writeTextFile(output, rows.map(row => row.join(',')).join('\n'));
}

function mapToCsv(columns: ColumnsMap): CsvRows {
  const maxLength = Math.max(...Object.values(columns).map(c => c.length));

  return [
    Object.keys(columns),
    ...range(maxLength).map((_, i) => Object.values(columns).map(col => col[i] || '')),
  ];
}

function csvToMap(rows: CsvRows): ColumnsMap {
  return Object.fromEntries(
    rows[0].map((header, c) => [header,
      rows.slice(1).map(row => row[c]).filter((val, v) => val || v === 0)]));
}


export default async function generate() {
  const map = csvToMap(await readCsv('./songname.csv'));

  let title = pick(map.songName);

  while (title.includes('$')) {
    title = title.replace(/\$\{(.+?)\}/g, (_: string, key: string) => pick(map[key]));
  }

  return title;
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
