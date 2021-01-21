SELECT
  battle.id,
  rounds.rounds,
  ranked_bands.bands
FROM battle
JOIN (
  SELECT
    round.battle_id,
    json_agg(json_build_object(
      'performances', performances.performances
    ) ORDER BY round.index ASC) AS rounds
  FROM round
  JOIN (
    SELECT
      performance.battle_id,
      performance.round_index,
      json_agg(json_build_object(
        'band', json_build_object(
          'id', band.id,
          'name', band.name,
          'color', band.color
        ),
        'song', json_build_object(
          'name', song.name
        ),
        'score', performance.score
      ) ORDER BY performance.score DESC) AS performances
    FROM performance
    JOIN band ON band.id = performance.band_id
    JOIN song ON song.id = performance.song_id
    GROUP BY performance.battle_id, performance.round_index
  ) performances ON performances.battle_id = round.battle_id AND performances.round_index = round.index
  GROUP BY round.battle_id
) rounds ON rounds.battle_id = battle.id
JOIN (
  SELECT
    entry.battle_id,
    json_agg(json_build_object(
      'place', entry.place,
      'band', json_build_object(
        'id', band.id,
        'name', band.name,
        'color', band.color
      )
    ) ORDER BY entry.place ASC) AS bands
  FROM entry
  JOIN band ON band.id = entry.band_id
  GROUP BY entry.battle_id
) ranked_bands ON ranked_bands.battle_id = battle.id
WHERE battle.id = $1
