WITH
  _entry AS (
    SELECT
      entry.battle_id,
      entry.place,
      band.name AS band_name,
      band.color AS band_color,
      entry.buzz_start,
      entry.buzz_start + entry.buzz_awarded AS buzz_final
    FROM entry
    JOIN band ON band.id = entry.band_id
  ),
  _battle AS (
    SELECT
      battle.week_id,
      battle.id AS battle_id,
      battle.level,
      json_agg(json_build_object(
        'place', _entry.place,
        'band_name', _entry.band_name,
        'band_color', _entry.band_color,
        'buzz_start', _entry.buzz_start,
        'buzz_final', _entry.buzz_final
      ) ORDER BY _entry.place ASC) AS entries
    FROM battle
    JOIN _entry ON _entry.battle_id = battle.id
    GROUP BY battle.id
  ),
  _level AS (
    SELECT
      _battle.week_id,
      _battle.level,
      json_agg(json_build_object(
        'entries', _battle.entries
      )) AS battles
    FROM _battle
    GROUP BY _battle.week_id, _battle.level
  )
SELECT
  week.id AS week_id,
  json_agg(json_build_object(
    'level', _level.level,
    'battles', _level.battles
  ) ORDER BY level DESC) AS levels
FROM week
JOIN _level ON _level.week_id = week.id
GROUP BY week.id
ORDER BY week.id ASC
