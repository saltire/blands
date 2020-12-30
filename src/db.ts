import { date, defineDb, defineTable, integer, serial, text } from '@ff00ff/mammoth';
import { promises as fs } from 'fs';
import path from 'path';
import { Pool } from 'pg';


const connectionString = `${process.env.DATABASE_URL || ''}`;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});


// Define tables, manually for now.
// Should be able to use these for migrations, but haven't got mammoth-cli working yet.

// Current version of mammoth doesn't support creating rows without specifying the serial.
// Remove 'default' call once fix is released.

const tableNames = ['band', 'song', 'week', 'battle', 'entry', 'round', 'performance'];

export async function createTables(dropTables?: boolean) {
  return pool.query(
    [
      ...dropTables ? tableNames.map(table => `DROP TABLE ${table} CASCADE;`) : [],

      `CREATE TABLE IF NOT EXISTS band (
        id serial NOT NULL PRIMARY KEY,
        name text NOT NULL,
        color text NOT NULL,
        buzz integer NOT NULL DEFAULT 0,
        level integer NOT NULL DEFAULT 1
      );`,

      `CREATE TABLE IF NOT EXISTS song (
        id serial NOT NULL PRIMARY KEY,
        band_id integer NOT NULL REFERENCES band (id),
        name text NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS week (
        id serial NOT NULL PRIMARY KEY
      );`,

      `CREATE TABLE IF NOT EXISTS battle (
        id serial NOT NULL PRIMARY KEY,
        week_id integer NOT NULL REFERENCES week (id),
        level integer NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS entry (
        battle_id integer NOT NULL REFERENCES battle (id),
        band_id integer NOT NULL REFERENCES band (id),
        buzz_start integer NOT NULL,
        place integer,
        buzz_awarded integer,
        PRIMARY KEY (battle_id, band_id)
      );`,

      `CREATE TABLE IF NOT EXISTS round (
        battle_id integer NOT NULL REFERENCES battle (id),
        index serial NOT NULL,
        PRIMARY KEY (battle_id, index)
      );`,

      `CREATE TABLE IF NOT EXISTS performance (
        battle_id integer NOT NULL,
        round_index integer NOT NULL,
        band_id integer NOT NULL REFERENCES band (id),
        song_id integer NOT NULL REFERENCES song (id),
        score integer NOT NULL,
        FOREIGN KEY (battle_id, round_index) REFERENCES round (battle_id, index),
        PRIMARY KEY (battle_id, round_index, band_id)
      )`
    ].join(''));
}


const band = defineTable({
  id: serial().notNull().primaryKey().default(`nextval('band_id_seq')`),
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
  id: serial().notNull().primaryKey().default(`nextval('song_id_seq')`),
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
  id: serial().notNull().primaryKey().default(`nextval('week_id_seq')`),
  date: date(),
});
export type NewWeek = {
  date?: Date,
}
export type Week = NewWeek & {
  id: number,
}

const battle = defineTable({
  id: serial().notNull().primaryKey().default(`nextval('battle_id_seq')`),
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
  index: serial().notNull().default(`nextval('round_index_seq')`),
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
      return i === 0 ? `($1::int, $2::int, $3::int)` :
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


const weeksQuery = fs.readFile(path.resolve(__dirname, '../sql/weeks.sql'), { encoding: 'utf-8' });

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
  const { rows } = await pool.query(await weeksQuery);

  return rows;
}
