SELECT
  band.id,
  band.name,
  band.color,
  (
    SELECT
      json_agg(json_build_object(
        'id', song.id,
        'name', song.name
      ) ORDER BY song.id ASC) AS songs
    FROM song
    WHERE song.band_id = band.id
    GROUP BY song.band_id
  )
FROM band
WHERE band.id = $1
