import { promises as fs } from 'fs';

import { range } from './utils';


export type CsvRows = string[][];
export type ColumnsMap = { [column: string]: string[] };

export async function readCsv(input: string): Promise<CsvRows> {
  const data = await fs.readFile(input, { encoding: 'utf-8' });
  return data.split(/\r?\n/).filter(Boolean)
    // Split rows only at commas that are followed by an even number of quotation marks.
    .map(row => row.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
      .map(value => value.replace(/^"|"$/g, '')));
}

export async function writeCsv(rows: CsvRows, output: string): Promise<void> {
  await fs.writeFile(output, rows.map(row => row.join(',')).join('\n'), { encoding: 'utf-8' });
}

export function csvToMap(rows: CsvRows): ColumnsMap {
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
