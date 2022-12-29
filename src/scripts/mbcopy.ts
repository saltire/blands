import { Pool } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import fs from 'fs';
import path from 'path';


// https://musicbrainz.org/doc/MusicBrainz_Database/Download
// mbdump and mbdump-derived
const dataDir = path.resolve(__dirname, '../../data/mbdata');

const series = <T>(array: T[], func: (item: T) => any) => (array || []).reduce(
  (lastPromise: Promise<any>, item: T) => lastPromise.then(() => func(item)),
  Promise.resolve());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function copyCSV(table: string) {
  const client = await pool.connect();
  await client.query(`TRUNCATE mb_${table} CASCADE`);

  return new Promise<void>((resolve, reject) => {
    const finish = async () => {
      console.log(table, 'finished');
      await client.release();
      resolve();
    };

    const error = async (err: any) => {
      console.log('error', err);
      await client.release();
      reject();
    };

    const stream = client.query(copyFrom(`COPY mb_${table} FROM STDIN;`));
    const fileStream = fs.createReadStream(path.resolve(dataDir, table));

    fileStream.on('error', error);
    stream.on('error', error);
    stream.on('finish', finish);

    fileStream.pipe(stream);
  });
}

async function copyCSVs() {
  const tables = [
    'genre',
    'link_type',
    'link',
    'l_genre_genre',
    'genre_alias_type',
    'genre_alias',
    'tag',
  ];

  return series(tables, copyCSV);
}

copyCSVs()
  .catch(console.error)
  .finally(process.exit);
