import { sql } from '@databases/pg';

import { Band, Entry } from '../__generated__';


export type BandCandidate = {
  id: Band['id'],
  last_place: Entry['place'],
};

export const getFreeBandsAtLevelQuery = (weekId: number, minLevel: number) => sql`
  SELECT
    band_entry.id,
    band_entry.last_place
  FROM (
    SELECT
      band.id,
      (
        SELECT
          entry.battle_id
        FROM entry
        JOIN battle ON battle.id = entry.battle_id
        WHERE entry.band_id = band.id AND battle.week_id = ${weekId}
      ) AS this_week_battle_id,
      (
        SELECT
          entry.place
        FROM entry
        WHERE entry.band_id = band.id
        ORDER BY entry.battle_id DESC
        LIMIT 1
      ) AS last_place
      FROM band
      WHERE band.level >= ${minLevel}
      AND (band.retire_week_id IS NULL OR band.retire_week_id > ${weekId})
  ) band_entry
  WHERE band_entry.this_week_battle_id IS NULL
`;
