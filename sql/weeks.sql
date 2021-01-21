SELECT
  week.id,
  (
    SELECT
      json_agg(json_build_object(
        'id', band.id,
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
    WHERE weekly_buzz_ranked.week_id = week.id AND weekly_buzz_ranked.rank <= 10
    GROUP BY weekly_buzz_ranked.week_id
  ),
  (
    SELECT
      json_agg(json_build_object(
        'level', battles_by_level.level,
        'battles', battles_by_level.battles
      ) ORDER BY battles_by_level.level DESC) AS levels
    FROM (
      SELECT
        battle.level,
        json_agg(json_build_object(
          'id', battle.id,
          'entries', (
            SELECT
              json_agg(json_build_object(
                'place', entry.place,
                'buzz_start', entry.buzz_start,
                'buzz_awarded', entry.buzz_awarded,
                'band', json_build_object(
                  'id', band.id,
                  'name', band.name,
                  'color', band.color
                )
              ) ORDER BY entry.place ASC) AS entries
            FROM entry
            JOIN band ON band.id = entry.band_id
            WHERE entry.battle_id = battle.id
            GROUP BY entry.battle_id
          )
        ) ORDER BY battle.level DESC) AS battles
      FROM battle
      WHERE battle.week_id = week.id
      GROUP BY battle.level
    ) battles_by_level
  )
FROM week
ORDER BY week.id ASC
