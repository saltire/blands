import { arrayAgg, coalesce, date, defineDb, defineTable, integer, serial, text } from '@ff00ff/mammoth';
import { promises as fs } from 'fs';
import path from 'path';
import { Pool, QueryResult } from 'pg';


const connectionString = `${process.env.DATABASE_URL || ''}`;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const sqlDir = path.resolve(__dirname, '../sql');
async function getQueries(): Promise<{ [name: string]: string }> {
  const files = await fs.readdir(sqlDir);
  return Object.fromEntries(await Promise.all(files
    .filter(file => /\.sql$/.test(file))
    .map(async file => [
      file.replace(/\.sql$/, ''),
      await fs.readFile(path.join(sqlDir, file), { encoding: 'utf-8' }),
    ])));
}
const queriesPromise = getQueries();

async function getQuery(queryName: string): Promise<string> {
  return (await queriesPromise)[queryName];
}

async function runQuery(queryName: string, values?: any[]): Promise<QueryResult> {
  return pool.query((await getQuery(queryName)), values);
}

function getTableNames(tablesQuery: string) {
  return Array.from(tablesQuery.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)).map(m => m[1]);
}

export async function createTables(dropTables?: boolean) {
  const tablesQuery = (await queriesPromise).createTables;
  const tables = getTableNames(tablesQuery);

  return pool.query([
    ...dropTables ? tables.map(table => `DROP TABLE ${table} CASCADE`) : [],
    tablesQuery,
  ].join('; '));
}

export async function clearTables() {
  const tablesQuery = (await queriesPromise).createTables;
  const tables = getTableNames(tablesQuery);
  return pool.query(tables.map(table => `TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`)
    .join('; '));
}

// Current version of mammoth doesn't support creating rows without specifying the serial value.
// Remove 'default' call once fix is released.

const band = defineTable({
  id: serial().notNull().primaryKey().default("nextval('band_id_seq')"),
  name: text().notNull(),
  color: text().notNull(),
  buzz: integer().notNull().default('0'),
  level: integer().notNull().default('1'),
});
export type NewBand = {
  name: string,
  color: string,
  level: number,
  buzz: number,
}
export type Band = NewBand & {
  id: number,
}

const song = defineTable({
  id: serial().notNull().primaryKey().default("nextval('song_id_seq')"),
  bandId: integer().notNull().references(band, 'id'),
  name: text().notNull(),
});
export type NewSong = {
  bandId: number,
  name: string,
}
export type Song = NewSong & {
  id: number,
}

const week = defineTable({
  id: serial().notNull().primaryKey().default("nextval('week_id_seq')"),
  date: date(),
});
export type NewWeek = {
  date?: Date,
}
export type Week = NewWeek & {
  id: number,
}

const battle = defineTable({
  id: serial().notNull().primaryKey().default("nextval('battle_id_seq')"),
  weekId: integer().notNull().references(week, 'id'),
  level: integer().notNull(),
});
export type NewBattle = {
  weekId: number,
  level: number,
}
export type Battle = NewBattle & {
  id: number,
}

// TODO: how to define composite primary key using mammoth?
const entry = defineTable({
  battleId: integer().notNull().references(battle, 'id'),
  bandId: integer().notNull().references(band, 'id'),
  place: integer(),
  buzzAwarded: integer(),
});
export type Entry = {
  battleId: number,
  bandId: number,
  place?: number,
  buzzAwarded?: number,
}

const round = defineTable({
  battleId: integer().notNull().references(battle, 'id'),
  index: serial().notNull().default("nextval('round_index_seq')"),
});
export type Round = {
  battleId: number,
  index: number,
}

const performance = defineTable({
  battleId: integer().notNull().references(battle, 'id'),
  roundIndex: integer().notNull().references(round, 'index'),
  bandId: integer().notNull().references(band, 'id'),
  songId: integer().notNull().references(song, 'id'),
  score: integer().notNull(),
});
export type Performance = {
  battleId: number,
  roundIndex: number,
  bandId: number,
  songId: number,
  score: number,
}


const db = defineDb({ band, song, week, battle, entry, round, performance },
  async (query, parameters) => {
    // console.log(query);
    const { rowCount, rows } = await pool.query(query, parameters);

    return {
      affectedCount: rowCount,
      rows,
    };
  });
export default db;


export async function getBandIdsAtLevel(level: number): Promise<number[]> {
  const bands = await db
    .select(db.band.id)
    .from(db.band)
    .where(db.band.level.eq(level));

  return bands.map(b => b.id);
}

export async function addNewBands(newBands: NewBand[]): Promise<number[]> {
  const bands = await db
    .insertInto(db.band)
    .values(newBands)
    .returning('id');

  return bands.map(b => b.id);
}

export async function halveBuzz() {
  await runQuery('halveBuzz');
}

interface BandBuzzUpdate {
  bandId: number,
  buzz: number,
}
export async function addBandsBuzz(updates: BandBuzzUpdate[]) {
  // Haven't found a clean way to add nested values arrays, so modifying query directly.
  // pg-format almost works but for some reason casts the numbers to strings.
  return pool.query((await getQuery('addBuzz')).replace('***',
    updates.map(({ bandId, buzz }) => `(${bandId}, ${buzz})`).join(', ')));
}

export async function setWeeklyBuzz(weekId: number) {
  return runQuery('setWeeklyBuzz', [weekId]);
}

export async function addNewSongs(newSongs: NewSong[]) {
  return db
    .insertInto(db.song)
    .values(newSongs);
}

interface BandSongIds {
  bandId: number,
  songIds: number[],
}
export async function getBandsSongIds(bandIds: number[]): Promise<BandSongIds[]> {
  return db
    .select(db.song.bandId, coalesce(arrayAgg(db.song.id), []).as('songIds'))
    .from(db.song)
    .where(db.song.bandId.in(bandIds))
    .groupBy(db.song.bandId);
}

export async function addNewWeek(): Promise<number> {
  const weeks = await db
    .insertInto(db.week)
    .defaultValues()
    .returning('id');

  return weeks[0].id;
}

export async function addNewBattles(newBattles: NewBattle[]): Promise<number[]> {
  const battles = await db
    .insertInto(db.battle)
    .values(newBattles)
    .returning('id');

  return battles.map(b => b.id);
}

export async function addNewEntries(entries: Entry[]) {
  return db
    .insertInto(db.entry)
    .values(entries);
}

export async function addNewRounds(rounds: Round[]) {
  return db
    .insertInto(db.round)
    .values(rounds);
}

export async function addNewPerformances(performances: Performance[]) {
  return db
    .insertInto(db.performance)
    .values(performances);
}


/* eslint-disable camelcase */

interface WeekSummary {
  id: number,
  top_bands: {
    id: number,
    name: string,
    color: string,
    buzz: number,
    rank: number,
  }[],
  levels: {
    level: number,
    battles: {
      id: number,
      entries: {
        place: number,
        buzz_awarded: number,
        band: {
          id: number,
          name: string,
          color: string,
        },
      }[],
    }[],
  }[],
}
export async function getWeekSummaries(): Promise<WeekSummary[]> {
  const { rows } = await runQuery('weeks');
  return rows;
}

interface BattleSummary {
  id: number,
  rounds: {
    performances: {
      band: {
        id: number,
        name: string,
        color: string,
      },
      song: {
        id: number,
        name: string,
      },
      score: number,
    }[],
  }[],
  bands: {
    id: number,
    name: string,
    color: string,
  }[],
}
export async function getBattleSummary(id: number): Promise<BattleSummary[]> {
  const { rows } = await runQuery('battle', [id]);
  return rows[0];
}

interface BandSummary {
  id: number,
  name: string,
  color: string,
  buzz: number,
  level: number,
  songs: {
    id: number,
    name: string,
  }[],
}
export async function getBandSummary(id: number): Promise<BandSummary[]> {
  const { rows } = await runQuery('band', [id]);
  return rows[0];
}
