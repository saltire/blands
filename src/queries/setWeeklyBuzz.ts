import { sql } from '@databases/pg';


export type BandBuzzUpdate = {
  bandId: number,
  buzz: number,
};

export const getSetWeeklyBuzzQuery = (weekId: number) => sql`
  INSERT INTO weekly_buzz (week_id, band_id, buzz)
  SELECT ${weekId}, id, buzz FROM band
  WHERE band.retire_week_id IS NULL OR band.retire_week_id > ${weekId}
  ON CONFLICT DO NOTHING
`;
