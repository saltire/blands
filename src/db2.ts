import createConnectionPool, { sql, SQLQuery } from '@databases/pg';
import { applyMigrations } from '@databases/pg-migrations';
import tables from '@databases/pg-typed';
import path from 'path';

import DatabaseSchema from './__generated__';
import databaseSchema from './__generated__/schema.json';
import { AllWeeklyBuzz, allWeeklyBuzzQuery } from './queries/allWeeklyBuzz';
import { BandSummary, getBandSummaryQuery } from './queries/bandSummary';
import { BattleSummary, getBattleSummaryQuery } from './queries/battleSummary';
import { WeekSummary, weekSummariesQuery } from './queries/weekSummary';


export { sql };

const db = createConnectionPool(process.env.DATABASE_URL);
export default db;

const {
  band, battle, entry, performance, song, week, weekly_buzz: weeklyBuzz,
} = tables<DatabaseSchema>({ databaseSchema });
export { band, battle, entry, performance, song, week, weeklyBuzz };


const sqlDir = path.resolve(__dirname, '../sql');

export const runQuery = <T = any>(query: SQLQuery): Promise<T[]> => db.query(query);

export const migrate = () => applyMigrations({
  connection: db,
  migrationsDirectory: path.resolve(sqlDir, 'migrations'),
});

// File queries

export const clearAll = () => runQuery(sql`
  TRUNCATE
    week,
    band,
    song,
    weekly_buzz,
    battle,
    entry,
    performance
  RESTART IDENTITY
  CASCADE;
`);

export const getAllWeeklyBuzz = () => runQuery<AllWeeklyBuzz>(allWeeklyBuzzQuery);

export const getBandSummary = (bandId: number) => runQuery<BandSummary>(
  getBandSummaryQuery(bandId))
  .then(results => results[0]);

export const getBattleSummary = (battleId: number) => runQuery<BattleSummary>(
  getBattleSummaryQuery(battleId))
  .then(results => results[0]);

export const getWeekSummaries = () => runQuery<WeekSummary>(weekSummariesQuery);

// Built queries

export const getBands = () => band(db).find().orderByDesc('buzz').all();
