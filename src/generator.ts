import { readCsv, csvToMap, ColumnsMap } from './csv.ts';
import { pick } from './utils.ts';


export async function getGenerator(csvPath: string, capitalize?: boolean) {
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

export async function getBandGenerator() {
  return getGenerator('data/bands.csv', false);
}

export async function getSongGenerator() {
  return getGenerator('data/songs.csv', true);
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
