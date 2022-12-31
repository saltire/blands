import { sql } from '@databases/pg';


export type BandBuzzUpdate = {
  band_id: number,
  buzz_awarded: number,
};

/* eslint-disable no-underscore-dangle */
export const getAddBuzzQuery = (weekId: number, updates: BandBuzzUpdate[]) => sql`
  UPDATE band
  SET
    buzz = prev.buzz + adding.buzz,
    level = get_level(prev.buzz + adding.buzz)
  FROM
    band AS prev,
    (VALUES ${sql.__dangerous__rawValue(updates
    .map(update => `(${update.band_id},${update.buzz_awarded})`).join(','))}) AS adding(id, buzz)
  WHERE band.id = adding.id AND band.id = prev.id
`;
