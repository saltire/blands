CREATE TABLE IF NOT EXISTS band (
  id serial NOT NULL PRIMARY KEY,
  name text NOT NULL,
  color text NOT NULL,
  buzz integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS song (
  id serial NOT NULL PRIMARY KEY,
  band_id integer NOT NULL REFERENCES band (id),
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS week (
  id serial NOT NULL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS weekly_buzz (
  week_id integer NOT NULL REFERENCES week (id),
  band_id integer NOT NULL REFERENCES band (id),
  buzz integer NOT NULL DEFAULT 0,
  PRIMARY KEY (week_id, band_id)
);

CREATE TABLE IF NOT EXISTS battle (
  id serial NOT NULL PRIMARY KEY,
  week_id integer NOT NULL REFERENCES week (id),
  level integer NOT NULL
);

CREATE TABLE IF NOT EXISTS entry (
  battle_id integer NOT NULL REFERENCES battle (id),
  band_id integer NOT NULL REFERENCES band (id),
  place integer,
  buzz_awarded integer,
  PRIMARY KEY (battle_id, band_id)
);

CREATE TABLE IF NOT EXISTS performance (
  battle_id integer NOT NULL REFERENCES battle (id),
  round_index integer NOT NULL,
  band_id integer NOT NULL REFERENCES band (id),
  song_id integer NOT NULL REFERENCES song (id),
  score integer NOT NULL,
  PRIMARY KEY (battle_id, round_index, band_id)
);
