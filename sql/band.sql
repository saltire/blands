SELECT
  band.id,
  band.name,
  band.color,
  songs_by_band.songs
FROM band
JOIN (
  SELECT
    song.band_id,
    json_agg(json_build_object(
      'name', song.name
    ) ORDER BY song.id ASC) AS songs
  FROM song
  GROUP BY song.band_id
) songs_by_band ON songs_by_band.band_id = band.id
WHERE band.id = $1
