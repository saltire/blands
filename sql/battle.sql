SELECT
  battle.id,
  (
    SELECT
      json_agg(json_build_object(
        'performances', performances_by_round.performances
      ) ORDER BY performances_by_round.round_index ASC) AS rounds
    FROM (
      SELECT
        performance.round_index,
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
      WHERE performance.battle_id = battle.id
      GROUP BY performance.round_index
    ) performances_by_round
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
