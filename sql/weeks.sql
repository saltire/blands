SELECT
  week.id,
  _top_bands.top_bands,
  _weekly_battles.battles
FROM week
JOIN (
  SELECT
    weekly_buzz_ranked.week_id,
    json_agg(json_build_object(
      'name', band.name,
      'color', band.color,
      'buzz', weekly_buzz_ranked.buzz,
      'rank', weekly_buzz_ranked.rank
    ) ORDER BY weekly_buzz_ranked.rank ASC, band.name ASC) as top_bands
  FROM (
    SELECT
      weekly_buzz.*,
      rank() OVER (PARTITION BY weekly_buzz.week_id ORDER BY weekly_buzz.buzz DESC) AS rank
    FROM weekly_buzz
  ) weekly_buzz_ranked
  JOIN band on band.id = weekly_buzz_ranked.band_id
  WHERE weekly_buzz_ranked.rank <= 10
  GROUP BY weekly_buzz_ranked.week_id
) _top_bands ON _top_bands.week_id = week.id
JOIN (
  SELECT
    _battle.week_id,
    json_agg(json_build_object(
      'id', _battle.id,
      'level', _battle.level,
      'entries', _battle.entries
    ) ORDER BY _battle.level DESC) as battles
  FROM (
    SELECT
      battle.id,
      battle.week_id,
      battle.level,
      json_agg(json_build_object(
        'place', entry.place,
        'buzz_start', entry.buzz_start,
        'buzz_awarded', entry.buzz_awarded,
        'band', json_build_object(
          'name', band.name,
          'color', band.color
        )
      ) ORDER BY entry.place ASC) AS entries
    FROM battle
    JOIN entry ON entry.battle_id = battle.id
    JOIN band ON band.id = entry.band_id
    GROUP BY battle.id
  ) _battle
  GROUP BY _battle.week_id
) _weekly_battles ON _weekly_battles.week_id = week.id
ORDER BY week.id ASC
