SELECT
  band.id,
  band.name,
  band.color,
  band.buzz,
  band.level,
  (
    SELECT json_agg(json_build_object(
      'id', song.id,
      'name', song.name
    ) ORDER BY song.id ASC) AS songs
    FROM song
    WHERE song.band_id = band.id
  ),
  (
    SELECT json_agg(json_build_object(
      'id', battle.id,
      'week_id', battle.week_id,
      'level', battle.level,
      'place', entry.place,
      'band_count', (
        SELECT count(*)
        FROM entry AS battle_entry
        WHERE battle_entry.battle_id = entry.battle_id
      )
    ) ORDER BY entry.battle_id ASC) AS battles
    FROM entry
    JOIN battle ON battle.id = entry.battle_id
    WHERE entry.band_id = band.id
  ),
  (
    SELECT json_agg(json_build_object(
      'week_id', weekly_buzz_ranked.week_id,
      'buzz', weekly_buzz_ranked.buzz,
      'level', get_level(weekly_buzz_ranked.buzz),
      'rank', weekly_buzz_ranked.rank
    ) ORDER BY weekly_buzz_ranked.week_id ASC) AS weekly_buzz
    FROM (
      SELECT
        weekly_buzz.*,
        rank() OVER (PARTITION BY weekly_buzz.week_id ORDER BY weekly_buzz.buzz DESC) AS rank
      FROM weekly_buzz
    ) weekly_buzz_ranked
    WHERE weekly_buzz_ranked.band_id = band.id
  )
FROM band
WHERE band.id = $1
