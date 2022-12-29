import { sql } from '@databases/pg';

import db from '../db2';

// https://github.com/metabrainz/musicbrainz-server/blob/master/admin/sql/CreateTables.sql

async function createTables() {
  await db.query(sql`
    CREATE TABLE IF NOT EXISTS mb_genre (
      id serial NOT NULL PRIMARY KEY,
      gid uuid NOT NULL,
      name text NOT NULL,
      comment text NOT NULL,
      edits_pending integer NOT NULL,
      last_updated timestamp NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mb_link_type (
      id serial NOT NULL PRIMARY KEY,
      parent integer REFERENCES mb_link_type(id),
      child_order integer NOT NULL,
      gid uuid NOT NULL,
      entity_type0 text NOT NULL,
      entity_type1 text NOT NULL,
      name text NOT NULL,
      description text NOT NULL,
      link_phrase text NOT NULL,
      reverse_link_phrase text NOT NULL,
      long_link_phrase text NOT NULL,
      priority integer NOT NULL,
      last_updated timestamp NOT NULL,
      is_deprecated boolean NOT NULL,
      has_dates boolean NOT NULL,
      entity0_cardinality integer NOT NULL,
      entity1_cardinality integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mb_link (
      id serial NOT NULL PRIMARY KEY,
      link_type integer NOT NULL REFERENCES mb_link_type(id),
      begin_date_year integer,
      begin_date_month integer,
      begin_date_day integer,
      end_date_year integer,
      end_date_month integer,
      end_date_day integer,
      attribute_count integer NOT NULL,
      created timestamp NOT NULL,
      ended boolean NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mb_l_genre_genre (
      id serial NOT NULL PRIMARY KEY,
      link integer NOT NULL REFERENCES mb_link(id),
      entity0 integer NOT NULL REFERENCES mb_genre(id),
      entity1 integer NOT NULL REFERENCES mb_genre(id),
      edits_pending integer NOT NULL,
      last_updated timestamp NOT NULL,
      link_order integer NOT NULL,
      entity0_credit text NOT NULL,
      entity1_credit text NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mb_genre_alias_type (
      id serial NOT NULL PRIMARY KEY,
      name text NOT NULL,
      parent integer REFERENCES mb_genre_alias_type(id),
      child_order integer NOT NULL,
      description text,
      gid uuid NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mb_genre_alias (
      id serial NOT NULL PRIMARY KEY,
      genre integer NOT NULL REFERENCES mb_genre(id),
      name text NOT NULL,
      locale text,
      edits_pending integer NOT NULL,
      last_updated timestamp NOT NULL,
      type integer REFERENCES mb_genre_alias_type(id),
      sort_name text NOT NULL,
      begin_date_year integer,
      begin_date_month integer,
      begin_date_day integer,
      end_date_year integer,
      end_date_month integer,
      end_date_day integer,
      primary_for_locale boolean NOT NULL,
      ended boolean NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mb_tag (
      id serial NOT NULL PRIMARY KEY,
      name text NOT NULL,
      ref_count integer NOT NULL
    );
  `);
}

createTables()
  .then(console.log)
  .catch(console.error)
  .finally(process.exit);
