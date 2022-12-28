import { sql } from '@databases/pg';


export type WeekSummary = {
  id: number,
  top_bands: {
    id: number,
    name: string,
    colorLight: string,
    colorDark: string,
    buzz: number,
    rank: number,
  }[],
  levels: {
    level: number,
    battles: {
      id: number,
      entries: {
        place: number,
        buzz_awarded: number,
        band: {
          id: number,
          name: string,
          colorLight: string,
          colorDark: string,
        },
      }[],
    }[],
  }[],
};

export const weekSummariesQuery = sql`
  SELECT
    week.id,
    (
      SELECT json_agg(json_build_object(
        'id', band.id,
        'name', band.name,
        'color_light', band.color_light,
        'color_dark', band.color_dark,
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
    ),
    (
      SELECT json_agg(json_build_object(
        'level', battles_by_level.level,
        'battles', battles_by_level.battles
      ) ORDER BY battles_by_level.level DESC) AS levels
      FROM (
        SELECT
          battle.level,
          json_agg(json_build_object(
            'id', battle.id,
            'entries', (
              SELECT json_agg(json_build_object(
                'place', entry.place,
                'buzz_awarded', entry.buzz_awarded,
                'band', json_build_object(
                  'id', band.id,
                  'name', band.name,
                  'color_light', band.color_light,
                  'color_dark', band.color_dark
                )
              ) ORDER BY entry.place ASC) AS entries
              FROM entry
              JOIN band ON band.id = entry.band_id
              WHERE entry.battle_id = battle.id
            )
          ) ORDER BY battle.level DESC) AS battles
        FROM battle
        WHERE battle.week_id = week.id
        GROUP BY battle.level
      ) battles_by_level
    )
  FROM week
  ORDER BY week.id ASC
`;
