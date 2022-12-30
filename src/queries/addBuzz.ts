import { sql } from '@databases/pg';


export type BandBuzzUpdate = {
  bandId: number,
  buzz: number,
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
    .map(({ bandId, buzz }) => `(${bandId},${buzz})`).join(','))}) AS adding(id, buzz)
  WHERE band.id = adding.id AND band.id = prev.id
`;
