import createConnectionPool, { sql } from '@databases/pg';
import { applyMigrations } from '@databases/pg-migrations';
import tables from '@databases/pg-typed';
import path from 'path';

import DatabaseSchema from './__generated__';
import databaseSchema from './__generated__/schema.json';


export { sql };

const db = createConnectionPool(process.env.DATABASE_URL);
export default db;

const {
  band, battle, entry, performance, song, week, weekly_buzz: weeklyBuzz,
} = tables<DatabaseSchema>({ databaseSchema });
export { band, battle, entry, performance, song, week, weeklyBuzz };


const sqlDir = path.resolve(__dirname, '../sql');

const getQuery = (filename: string) => sql.file(path.resolve(sqlDir, `${filename}.sql`));

export const runQuery = (filename: string) => db.query(getQuery(filename));

export const migrate = () => applyMigrations({
  connection: db,
  migrationsDirectory: path.resolve(sqlDir, 'migrations'),
});
