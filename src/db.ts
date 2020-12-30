import { date, defineDb, defineTable, integer, serial, text } from '@ff00ff/mammoth';
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
        week_id integer NOT NULL REFERENCES week (id)
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
});
export type NewBattle = {
  weekId: number,
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
export type NewEntry = {
  battleId: number,
  bandId: number,
  buzzStart: number,
}
export type Entry = NewEntry & {
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
export async function setBandBuzz({ bandId, ...update }: BandBuzzUpdate) {
  return db
    .update(db.band)
    .set(update)
    .where(db.band.id.eq(bandId));
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

export async function getBandSongs(bandId: number): Promise<Song[]> {
  return db
    .select(db.song.id, db.song.bandId, db.song.name)
    .from(db.song)
    .where(db.song.bandId.eq(bandId));
}

export async function addNewWeek(): Promise<number> {
  const weeks = await db
    .insertInto(db.week)
    .defaultValues()
    .returning('id');

  return weeks[0].id;
}

export async function addNewBattle(battle: NewBattle): Promise<number> {
  const battles = await db
    .insertInto(db.battle)
    .values(battle)
    .returning('id');

  return battles[0].id;
}

export async function addNewEntries(entries: NewEntry[]) {
  return db
    .insertInto(db.entry)
    .values(entries);
}

interface EntryPlaceUpdate {
  battleId: number,
  bandId: number,
  place: number,
  buzzAwarded: number,
}
export async function setEntryPlace({ battleId, bandId, ...update }: EntryPlaceUpdate) {
  return db
    .update(db.entry)
    .set(update)
    .where(db.entry.battleId.eq(battleId)
      .and(db.entry.bandId.eq(bandId)));
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
