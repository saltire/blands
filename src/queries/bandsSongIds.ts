import { sql } from '@databases/pg';


export type BandSongIds = {
  band_id: number,
  song_ids: number[],
};

/* eslint-disable no-underscore-dangle */
export const getBandsSongIdsQuery = (bandIds: number[]) => sql`
  SELECT
    song.band_id,
    array_agg(song.id) AS song_ids
  FROM song
  WHERE song.band_id IN (${sql.__dangerous__rawValue(bandIds.join(','))})
  GROUP BY song.band_id
`;
