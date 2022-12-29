import path from 'path';

import { readCsvRowObjects } from './csv';
import { exists, pickWeighted } from './utils';


type Genre = {
  name: string,
  count: number,
  totalCount: number,
  parentGenres: string[],
  subgenres: Genre[],
};

let genreTree: Genre[];
export async function getGenreTree() {
  if (!genreTree) {
    const rows = await readCsvRowObjects(path.resolve(__dirname, '../data/genres.csv'));

    const formatGenre = (row: { [index: string]: string }, parentGenres: string[]): Genre => {
      const count = Number(row.count) || 0;

      const subgenres = (`${row.subgenres || ''}, ${row['has fusion genres'] || ''}`)
        .split(', ')
        .map(subgenre => {
          const subRow = subgenre ? rows.find(r => r.name === subgenre) : null;
          return subRow && formatGenre(subRow, [...parentGenres, row.name]);
        })
        .filter(exists)
        .filter(r => r.totalCount > 0)
        .sort((a, b) => a.totalCount - b.totalCount);

      return {
        name: row.name,
        count,
        totalCount: count + subgenres.reduce((sum, sg) => sum + sg.totalCount, 0),
        parentGenres,
        subgenres,
      };
    };

    genreTree = rows
      .filter(row => !row['subgenre of'] && !row['fusion of'])
      .map(row => formatGenre(row, []))
      .filter(row => row.totalCount > 0)
      .sort((a, b) => b.totalCount - a.totalCount);
  }

  return genreTree;
}

export function pickRandomGenre(genres: Genre[]) {
  const pickSubgenre = (genre: Genre): Genre => {
    if (!genre.subgenres.length) {
      return genre;
    }

    const pickedSub = pickWeighted([
      { item: genre, weight: genre.count },
      ...genre.subgenres.map(subgenre => ({ item: subgenre, weight: subgenre.totalCount })),
    ]);

    return pickedSub === genre ? genre : pickSubgenre(pickedSub);
  };

  const mainGenre = pickWeighted(genres.map(genre => ({ item: genre, weight: genre.totalCount })));

  return pickSubgenre(mainGenre);
}

export async function getRandomGenre() {
  return pickRandomGenre(await getGenreTree());
}
