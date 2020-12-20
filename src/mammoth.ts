import { arrayAgg, defineDb, defineTable, integer, serial, text } from '@ff00ff/mammoth';

import { getBandGenerator } from './generator';
import { pool } from './pg';
import { range } from './utils';


// Define tables.
// Should be able to use these for migrations, but haven't got mammoth-cli working yet.
// For now, create them manually.

// Current version of mammoth doesn't support creating rows without specifying the serial.
// Remove 'default' call once fix is released.

export const band = defineTable({
  id: serial().notNull().primaryKey().default(`nextval('band_id_seq')`),
  name: text().notNull(),
});

export const song = defineTable({
  id: serial().notNull().primaryKey().default(`nextval('song_id_seq')`),
  bandId: integer().notNull().references(band, 'id'),
  name: text().notNull(),
});

export async function createTables() {
  return pool.query(
    [
      `CREATE TABLE IF NOT EXISTS band (
        id serial NOT NULL PRIMARY KEY,
        name text NOT NULL);`,

      `CREATE TABLE IF NOT EXISTS song (
        id serial NOT NULL PRIMARY KEY,
        band_id integer NOT NULL REFERENCES band (id),
        name text NOT NULL);`,
    ].join(''));
}

const db = defineDb({ band, song }, async (query, parameters) => {
  const { rowCount, rows } = await pool.query(query, parameters);

  return {
    affectedCount: rowCount,
    rows,
  };
});

export async function testMammoth() {
  const bandGen = await getBandGenerator();

  // Generate and insert 3 bands with 3 songs each.

  const bands = range(3).map(() => bandGen.generate({ songCount: 3 }));

  const bandIds = await db
    .insertInto(db.band)
    .values(bands.map(band => ({ name: band.name })))
    .returning('id');

  await db
    .insertInto(db.song)
    .values(bands.flatMap((band, i) => band.songs
      .map(song => ({ bandId: bandIds[i].id, name: song.name }))));

  // Query and return all bands in the database, with their songs.

  return db
    .select(
      db.band.name,
      arrayAgg(db.song.name.orderBy(db.song.id)).as('songs'))
    .from(db.band)
    .leftJoin(db.song)
    .on(db.song.bandId.eq(db.band.id))
    .groupBy(db.band.id)
    .orderBy(db.band.id);
}
