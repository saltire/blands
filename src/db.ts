import { date, defineDb, defineTable, integer, serial, text } from '@ff00ff/mammoth';
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

async function runQuery(queryName: string, values?: any[]): Promise<QueryResult> {
  return pool.query((await queriesPromise)[queryName], values);
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
  buzzStart: integer().notNull(),
  place: integer(),
  buzzAwarded: integer(),
});
export type Entry = {
  battleId: number,
  bandId: number,
  buzzStart: number,
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


export async function addNewBands(newBands: NewBand[]): Promise<Band[]> {
  return db
    .insertInto(db.band)
    .values(newBands)
    .returning('id', 'name', 'color', 'buzz', 'level');
}

interface BandBuzzUpdate {
  bandId: number,
  buzz: number,
  level: number,
}
export async function setBandsBuzz(updates: BandBuzzUpdate[]) {
  const valueParams = updates
    .map((_, i) => {
      const i3 = i * 3;
      return i === 0 ? '($1::int, $2::int, $3::int)' :
        `($${i3 + 1}, $${i3 + 2}, $${i3 + 3})`;
    })
    .join(', ');

  return pool.query(
    `UPDATE band
      SET buzz = b.buzz, level = b.level
      FROM (VALUES ${valueParams}) AS b(id, buzz, level)
      WHERE band.id = b.id;`,
    updates.flatMap(({ bandId, buzz, level }) => [bandId, buzz, level]));
}

export async function setWeeklyBuzz(weekId: number) {
  return runQuery('setWeeklyBuzz', [weekId]);
}

export async function getBandsAtLevel(level: number): Promise<Band[]> {
  return db
    .select(db.band.id, db.band.name, db.band.color, db.band.buzz, db.band.level)
    .from(db.band)
    .where(db.band.level.eq(level));
}

export async function addNewSongs(newSongs: NewSong[]) {
  return db
    .insertInto(db.song)
    .values(newSongs);
}

export async function getBandsSongs(bandIds: number[]): Promise<Song[]> {
  return db
    .select(db.song.id, db.song.bandId, db.song.name)
    .from(db.song)
    .where(db.song.bandId.in(bandIds));
}

export async function addNewWeek(): Promise<number> {
  const weeks = await db
    .insertInto(db.week)
    .defaultValues()
    .returning('id');

  return weeks[0].id;
}

export async function addNewBattles(battles: NewBattle[]): Promise<number[]> {
  const newBattles = await db
    .insertInto(db.battle)
    .values(battles)
    .returning('id');

  return newBattles.map(b => b.id);
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
  week_id: number,
  levels: {
    level: number,
    battles: {
      entries: {
        place: number,
        band_name: string,
        band_color: string,
        buzz_start: number,
        buzz_final: number,
      }[],
    }[],
  }[],
}
export async function aggregateWeeks(): Promise<WeekSummary[]> {
  const { rows } = await runQuery('weeks');
  return rows;
}

interface WeekSummarySimple {
  id: number,
  top_bands: {
    name: string,
    buzz: number,
  }[],
  battles: {
    level: number,
    entries: {
      place: number,
      buzz_start: number,
      buzz_awarded: number,
      band: {
        name: string,
        color: string,
      },
    }[],
  }[],
}
export async function aggregateWeeksSimple(): Promise<WeekSummarySimple[]> {
  const { rows } = await runQuery('weeksSimple');
  return rows;
}

export async function getBattleSummary(id: number) {
  const { rows } = await runQuery('battle', [id]);
  return rows[0];
}
