import { arrayAgg, coalesce, date, defineDb, defineTable, integer, serial, star, text } from '@ff00ff/mammoth';
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

export async function createFunctions() {
  return runQuery('createFunctions');
}

export async function createTables(dropTables?: boolean) {
  const tablesQuery = (await queriesPromise).createTables;
  const tables = getTableNames(tablesQuery);

  return pool.query([
    ...dropTables ? tables.map(table => `DROP TABLE IF EXISTS ${table} CASCADE`) : [],
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

const band = defineTable({
  id: serial().notNull().primaryKey().default("nextval('band_id_seq')"),
  name: text().notNull(),
  colorLight: text().notNull(),
  colorDark: text().notNull(),
  buzz: integer().notNull().default('0'),
  level: integer().notNull().default('1'),
  startWeekId: integer().notNull().references(week, 'id'),
  startLevel: integer().notNull().default('1'),
});
export type NewBand = {
  name: string,
  colorLight: string,
  colorDark: string,
  buzz: number,
  level: number,
  startWeekId: number,
  startLevel: number,
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

const weeklyBuzz = defineTable({
  weekId: integer().notNull().references(week, 'id'),
  bandId: integer().notNull().references(band, 'id'),
  buzz: integer().notNull().default('0'),
});
export type WeeklyBuzz = {
  weekId: number,
  bandId: number,
  buzz: number,
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

const performance = defineTable({
  battleId: integer().notNull().references(battle, 'id'),
  roundIndex: integer().notNull(),
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


const db = defineDb({ band, song, week, weeklyBuzz, battle, entry, performance },
  async (query, parameters) => {
    // console.log(query);
    const { rowCount, rows } = await pool.query(query, parameters);

    return {
      affectedCount: rowCount,
      rows,
    };
  });
export default db;


interface BandCandidate {
  id: number,
  lastPlace?: number,
}
export async function getBandsAtLevel(level: number): Promise<BandCandidate[]> {
  return db
    .select(db.band.id,
      db
        .select(db.entry.place.as('lastPlace'))
        .from(db.entry)
        .where(db.entry.bandId.eq(db.band.id))
        .orderBy(db.entry.battleId.desc())
        .limit(1))
    .from(db.band)
    .where(db.band.level.eq(level));
}

export async function getFreeBandsAtLevel(weekId: number, minLevel: number):
Promise<BandCandidate[]> {
  const { rows } = await runQuery('freeBandsAtLevel', [weekId, minLevel]);
  return rows.map(({ last_place: lastPlace, ...row }) => ({ ...row, lastPlace }));
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

export async function getBands(): Promise<Band[]> {
  return db
    .select(star())
    .from(db.band)
    .orderBy(db.band.buzz.desc());
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

export async function updateEntries(entries: Entry[]) {
  const valueParams = entries
    .map((_, i) => {
      const i4 = i * 4;
      return i === 0 ? '($1::int, $2::int, $3::int, $4::int)' :
        `($${i4 + 1}, $${i4 + 2}, $${i4 + 3}, $${i4 + 4})`;
    })
    .join(', ');

  return pool.query(
    `UPDATE entry
      SET place = e.place, buzz_awarded = e.buzz_awarded
      FROM (VALUES ${valueParams}) AS e(battle_id, band_id, place, buzz_awarded)
      WHERE entry.battle_id = e.battle_id AND entry.band_id = e.band_id;`,
    entries.flatMap(e => [e.battleId, e.bandId, e.place, e.buzzAwarded]));
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
    colorLight: string,
    colorDark: string,
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
          colorLight: string,
          colorDark: string,
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
        colorLight: string,
        colorDark: string,
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
    colorLight: string,
    colorDark: string,
  }[],
}
export async function getBattleSummary(id: number): Promise<BattleSummary[]> {
  const { rows } = await runQuery('battle', [id]);
  return rows[0];
}

interface BandSummary {
  id: number,
  name: string,
  colorLight: string,
  colorDark: string,
  buzz: number,
  level: number,
  songs: {
    id: number,
    name: string,
  }[],
  battles: {
    id: number,
    week_id: number,
    level: number,
    place: number,
    band_count: number,
  }[],
  weekly_buzz: {
    week_id: number,
    buzz: number,
    level: number,
    rank: number,
  }[],
}
export async function getBandSummary(id: number): Promise<BandSummary[]> {
  const { rows } = await runQuery('band', [id]);
  return rows[0];
}

export async function getAllWeeklyBuzz() {
  const { rows } = await runQuery('allWeeklyBuzz');
  return rows;
}
