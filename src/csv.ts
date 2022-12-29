import { promises as fs } from 'fs';

import { range } from './utils';


export const readCsv = async (path: string) => {
  const data = await fs.readFile(path, { encoding: 'utf-8' });
  return data.split(/\r?\n/).filter(Boolean)
    // Split rows only at commas that are followed by an even number of quotation marks.
    .map(row => row.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
      .map(value => value.replace(/^"(.*)"$/, '$1')));
};

export const readCsvColumns = async (path: string) => {
  const rows = await readCsv(path);
  return Object.fromEntries(
    rows[0].map((header, c) => [header, rows.slice(1).map(row => row[c]).filter(Boolean)]));
};

export const readCsvRowObjects = async (path: string) => {
  const rows = await readCsv(path);
  return rows.slice(1).map(row => Object.fromEntries(rows[0].map((header, c) => [header, row[c]])));
};

export const writeCsvRows = async (rows: any[][], path: string) => fs.writeFile(
  path, rows.map(row => row.join(',')).join('\n'), { encoding: 'utf-8' });

export const writeCsv = async (rows: { [column: string]: any }[], path: string) => {
  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  return writeCsvRows([
    columns,
    ...rows.map(row => columns.map(column => row[column] ?? '')),
  ], path);
};

export const mapToCsv = (columns: { [column: string]: any[] }) => {
  const maxLength = Math.max(...Object.values(columns).map(c => c.length));
  return [
    Object.keys(columns),
    ...range(maxLength).map(i => Object.values(columns).map(col => col[i] ?? '')),
  ];
};
