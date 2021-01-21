SELECT
  battle.id,
  (
    SELECT
      json_agg(json_build_object(
        'performances', (
          SELECT
            json_agg(json_build_object(
              'band', json_build_object(
                'id', band.id,
                'name', band.name,
                'color', band.color
              ),
              'song', json_build_object(
                'id', song.id,
                'name', song.name
              ),
              'score', performance.score
            ) ORDER BY performance.score DESC) AS performances
          FROM performance
          JOIN band ON band.id = performance.band_id
          JOIN song ON song.id = performance.song_id
          WHERE performance.battle_id = round.battle_id AND performance.round_index = round.index
          GROUP BY performance.battle_id, performance.round_index
        )
      ) ORDER BY round.index ASC) as rounds
    FROM round
    WHERE round.battle_id = battle.id
    GROUP BY round.battle_id
  ),
  (
    SELECT json_agg(json_build_object(
      'place', entry.place,
      'band', json_build_object(
        'id', band.id,
        'name', band.name,
        'color', band.color
      )
    ) ORDER BY entry.place ASC) AS bands
    FROM entry
    JOIN band ON band.id = entry.band_id
    WHERE entry.battle_id = battle.id
    GROUP BY entry.battle_id
  )
FROM battle
WHERE battle.id = $1
