WITH
  _entry AS (
    SELECT
      entry.battle_id,
      entry.place,
      entry.buzz_start,
      entry.buzz_awarded,
      json_build_object(
        'name', band.name,
        'color', band.color
      ) AS band
    FROM entry
    JOIN band ON band.id = entry.band_id
  ),
  _battle AS (
    SELECT
      battle.week_id,
      battle.level,
      json_agg(json_build_object(
        'place', _entry.place,
        'buzz_start', _entry.buzz_start,
        'buzz_awarded', _entry.buzz_awarded,
        'band', _entry.band
      ) ORDER BY _entry.place ASC) AS entries
    FROM battle
    JOIN _entry ON _entry.battle_id = battle.id
    GROUP BY battle.id
  )
SELECT
  week.id,
  json_agg(json_build_object(
    'level', _battle.level,
    'entries', _battle.entries
  ) ORDER BY _battle.level DESC) as battles
FROM week
JOIN _battle ON _battle.week_id = week.id
GROUP BY week.id
ORDER BY week.id ASC
