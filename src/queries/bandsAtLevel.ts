import { sql } from '@databases/pg';

export { BandCandidate } from './freeBandsAtLevel';


export const getBandsAtLevelQuery = (level: number) => sql`
  SELECT
    band.id,
    band.name,
    (
      SELECT entry.place
      FROM entry
      WHERE entry.band_id = band.id
      ORDER BY entry.battle_id DESC
      LIMIT 1
    ) AS last_place
  FROM band
  WHERE band.level = ${level}
`;
