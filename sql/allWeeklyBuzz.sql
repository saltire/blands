SELECT
  weekly_buzz.band_id,
  band.name,
  band.color_light AS color,
  array_prepend(
    json_build_object(
      'id', band.start_week_id - 1,
      'buzz', get_base_buzz(band.start_level)
    ),
    (
      SELECT array_agg(json_build_object(
        'id', band_buzz.week_id,
        'buzz', band_buzz.buzz
      ) ORDER BY band_buzz.week_id) AS weeks
      FROM weekly_buzz AS band_buzz
      WHERE band_buzz.band_id = weekly_buzz.band_id
  	)
  ) AS weeks
FROM weekly_buzz
JOIN band ON band.id = weekly_buzz.band_id
