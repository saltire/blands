import createConnectionPool, { sql, SQLQuery } from '@databases/pg';
import { applyMigrations } from '@databases/pg-migrations';
import tables, { lessThan } from '@databases/pg-typed';
import path from 'path';

import DatabaseSchema, {
  Band_InsertParameters as NewBand,
  Battle_InsertParameters as NewBattle,
  Entry_InsertParameters as NewEntry,
  Performance_InsertParameters as NewPerformance,
  Song_InsertParameters as NewSong,
  Week,
} from './__generated__';
import databaseSchema from './__generated__/schema.json';
import { BandBuzzUpdate, getAddBuzzQuery } from './queries/addBuzz';
import { AllWeeklyBuzz, allWeeklyBuzzQuery } from './queries/allWeeklyBuzz';
import { BandSummary, getBandSummaryQuery } from './queries/bandSummary';
import { BattleSummary, getBattleSummaryQuery } from './queries/battleSummary';
import { BandCandidate, getFreeBandsAtLevelQuery } from './queries/freeBandsAtLevel';
import { getSetWeeklyBuzzQuery } from './queries/setWeeklyBuzz';
import { WeekSummary, weekSummariesQuery } from './queries/weekSummary';


const db = createConnectionPool({
  bigIntMode: 'bigint',
  connectionString: process.env.DATABASE_URL,
});
export default db;

const {
  band, battle, entry, performance, song, week, weekly_buzz: weeklyBuzz,
} = tables<DatabaseSchema>({ databaseSchema });
export {
  band, battle, entry, performance, song, week, weeklyBuzz,
  NewBand, NewBattle, NewEntry, NewPerformance, NewSong,
};

const sqlDir = path.resolve(__dirname, '../sql');

export const runQuery = <T = any>(query: SQLQuery): Promise<T[]> => db.query(query);

export const migrate = async (drop?: boolean) => {
  if (drop) {
    await runQuery(sql`
      DROP TABLE IF EXISTS
        week,
        band,
        song,
        weekly_buzz,
        battle,
        entry,
        performance
      CASCADE;
    `);
  }

  return applyMigrations({
    connection: db,
    migrationsDirectory: path.resolve(sqlDir, 'migrations'),
  });
};

// Utility

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

// Simple read queries

export const getBands = () => band(db).find().orderByDesc('buzz').all();

// Complex read queries

export const getAllWeeklyBuzz = () => runQuery<AllWeeklyBuzz>(allWeeklyBuzzQuery);

export const getBandSummary = (bandId: number) => runQuery<BandSummary>(
  getBandSummaryQuery(bandId))
  .then(results => results[0]);

export const getBattleSummary = (battleId: number) => runQuery<BattleSummary>(
  getBattleSummaryQuery(battleId))
  .then(results => results[0]);

export const getFreeBandsAtLevel = (weekId: number, minLevel: number) => runQuery<BandCandidate>(
  getFreeBandsAtLevelQuery(weekId, minLevel));

export const getWeekSummaries = () => runQuery<WeekSummary>(weekSummariesQuery);

// Simple write queries

export const addNewBands = (newBands: NewBand[]) => band(db).insert(...newBands)
  .then(bands => bands.map(b => b.id));

export const addNewBattles = (newBattles: NewBattle[]) => battle(db).insert(...newBattles)
  .then(battles => battles.map(b => b.id));

export const addNewEntries = (newEntries: NewEntry[]) => entry(db).insert(...newEntries);

export const addNewPerformances = (newPerformances: NewPerformance[]) => performance(db)
  .insert(...newPerformances);

export const addNewSongs = (newSongs: NewSong[]) => song(db).insert(...newSongs);

// export const addNewWeek = () => week(db).insert({}).then(weeks => weeks[0]?.id);
export const addNewWeek = () => runQuery<Week>(sql`INSERT INTO week DEFAULT VALUES RETURNING id`)
  .then(weeks => weeks[0]?.id);

// Simple update queries

export const retireBands = async (weekId: number) => band(db)
  .update({ level: lessThan(1), retire_week_id: null }, { retire_week_id: weekId });

// Complex update queries

export const addBandsBuzz = async (weekId: number, updates: BandBuzzUpdate[]) => runQuery(
  getAddBuzzQuery(weekId, updates));

export const setWeeklyBuzz = async (weekId: number) => runQuery(getSetWeeklyBuzzQuery(weekId));
