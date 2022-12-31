import createConnectionPool, { sql, SQLQuery } from '@databases/pg';
import { applyMigrations } from '@databases/pg-migrations';
import tables, { lessThan } from '@databases/pg-typed';
import path from 'path';

import DatabaseSchema, {
  Band_InsertParameters as NewBand,
  Battle_InsertParameters as NewBattle,
  Entry, Entry_InsertParameters as NewEntry,
  Performance_InsertParameters as NewPerformance,
  Song_InsertParameters as NewSong,
  Week,
} from './__generated__';
import databaseSchema from './__generated__/schema.json';
import { BandBuzzUpdate, getAddBuzzQuery } from './queries/addBuzz';
import { AllWeeklyBuzz, allWeeklyBuzzQuery } from './queries/allWeeklyBuzz';
import { getBandsAtLevelQuery } from './queries/bandsAtLevel';
import { BandSongIds, getBandsSongIdsQuery } from './queries/bandsSongIds';
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
  BandBuzzUpdate, Entry, NewBand, NewBattle, NewEntry, NewPerformance, NewSong,
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

export const getBandsAtLevel = (level: number) => runQuery<BandCandidate>(
  getBandsAtLevelQuery(level));

export const getBandsSongIds = (bandIds: number[]) => runQuery<BandSongIds>(
  getBandsSongIdsQuery(bandIds));

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

export const addNewWeek = () => runQuery<Week>(sql`
  INSERT INTO week
  DEFAULT VALUES
  RETURNING id
`)
  .then(weeks => weeks[0]?.id);

export const halveBuzz = () => runQuery(sql`
  UPDATE band
  SET
    buzz = buzz / 2,
    level = get_level(buzz / 2)
`);

// Simple update queries

export const retireBands = async (weekId: number) => band(db)
  .update({ level: lessThan(1), retire_week_id: null }, { retire_week_id: weekId });

export const updateEntries = async (updates: Entry[]) => entry(db)
  .bulkUpdate({
    whereColumnNames: ['battle_id', 'band_id'],
    setColumnNames: ['place', 'buzz_awarded'],
    updates: updates.map(update => ({
      where: { battle_id: update.battle_id, band_id: update.band_id },
      set: { place: update.place ?? null, buzz_awarded: update.buzz_awarded ?? null },
    })),
  });

// Complex update queries

export const addBandsBuzz = async (weekId: number, updates: BandBuzzUpdate[]) => runQuery(
  getAddBuzzQuery(weekId, updates));

export const setWeeklyBuzz = async (weekId: number) => runQuery(getSetWeeklyBuzzQuery(weekId));
