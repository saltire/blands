SELECT
  band_entry.id,
  band_entry.last_place
FROM (
  SELECT
    band.id,
    (
      SELECT
        entry.battle_id
      FROM entry
      JOIN battle ON battle.id = entry.battle_id
      WHERE entry.band_id = band.id AND battle.week_id = $1
    ) AS this_week_battle_id,
    (
      SELECT
        entry.place
      FROM entry
      WHERE entry.band_id = band.id
      ORDER BY entry.battle_id DESC
      LIMIT 1
    ) AS last_place
  	FROM band
    WHERE band.level >= $2
) band_entry
WHERE band_entry.this_week_battle_id IS NULL
