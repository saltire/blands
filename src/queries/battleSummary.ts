import { sql } from '@databases/pg';


export type BattleSummary = {
  id: number,
  rounds: {
    performances: {
      band: {
        id: number,
        name: string,
        color_light: string,
        color_dark: string,
      },
      song: {
        id: number,
        name: string,
      },
      score: number,
    }[],
  }[],
  bands: {
    id: number,
    name: string,
    color_light: string,
    color_dark: string,
  }[],
};

export const getBattleSummaryQuery = (battleId: number) => sql`
  SELECT
    battle.id,
    (
      SELECT json_agg(json_build_object(
        'performances', performances_by_round.performances
      ) ORDER BY performances_by_round.round_index ASC) AS rounds
      FROM (
        SELECT
          performance.round_index,
          json_agg(json_build_object(
            'band', json_build_object(
              'id', band.id,
              'name', band.name,
              'color_light', band.color_light,
              'color_dark', band.color_dark
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
          'color_light', band.color_light,
          'color_dark', band.color_dark
        )
      ) ORDER BY entry.place ASC) AS bands
      FROM entry
      JOIN band ON band.id = entry.band_id
      WHERE entry.battle_id = battle.id
    )
  FROM battle
  WHERE battle.id = ${battleId}
`;
