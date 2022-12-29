import { promises as fs } from 'fs';

import { range } from './utils';


export type CsvRows<T = string | number> = T[][];
export type CsvMapRows<T = string | number> = { [column: string]: T }[];
export type ColumnsMap<T = string | number> = { [column: string]: T[] };

export async function readCsv(input: string): Promise<CsvRows<string>> {
  const data = await fs.readFile(input, { encoding: 'utf-8' });
  return data.split(/\r?\n/).filter(Boolean)
    // Split rows only at commas that are followed by an even number of quotation marks.
    .map(row => row.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
      .map(value => value.replace(/^"|"$/g, '')));
}

export async function writeCsvRows(rows: CsvRows, path: string): Promise<void> {
  await fs.writeFile(path, rows.map(row => row.join(',')).join('\n'), { encoding: 'utf-8' });
}

export async function writeCsv(rows: CsvMapRows, path: string) {
  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));

  return writeCsvRows([
    columns,
    ...rows.map(row => columns.map(column => row[column] ?? '')),
  ], path);
}

export function csvToMap<T>(rows: CsvRows<T>): ColumnsMap<T> {
  return Object.fromEntries(
    rows[0].map((header, c) => [header,
      rows.slice(1).map(row => row[c]).filter((val, v) => val || v === 0)]));
}

export function mapToCsv(columns: ColumnsMap): CsvRows {
  const maxLength = Math.max(...Object.values(columns).map(c => c.length));

  return [
    Object.keys(columns),
    ...range(maxLength).map(i => Object.values(columns).map(col => col[i] || '')),
  ];
}
