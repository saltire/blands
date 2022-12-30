import { sql } from '@databases/pg';


export type WeekSummary = {
  id: number,
  top_bands: {
    id: number,
    name: string,
    color_light: string,
    color_dark: string,
    buzz: number,
    rank: number,
  }[],
  idle_bands: {
    id: number,
    name: string,
    color_light: string,
    color_dark: string,
    buzz: number,
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
          color_light: string,
          color_dark: string,
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
      ) ORDER BY weekly_buzz_ranked.rank ASC, band.name ASC)
      FROM (
        SELECT
          weekly_buzz.*,
          rank() OVER (PARTITION BY weekly_buzz.week_id ORDER BY weekly_buzz.buzz DESC) AS rank
        FROM weekly_buzz
      ) weekly_buzz_ranked
      JOIN band on band.id = weekly_buzz_ranked.band_id
      WHERE weekly_buzz_ranked.week_id = week.id AND weekly_buzz_ranked.rank <= 10
    ) AS top_bands,

    (
      SELECT json_agg(json_build_object(
        'level', battles_by_level.level,
        'battles', battles_by_level.battles
      ) ORDER BY battles_by_level.level DESC)
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
                  'color_dark', band.color_dark,
                  'new', band.start_week_id = week.id,
                  'buzz', weekly_buzz.buzz
                )
              ) ORDER BY entry.place ASC) AS entries
              FROM entry
              JOIN band ON band.id = entry.band_id
              JOIN weekly_buzz ON weekly_buzz.band_id = band.id AND weekly_buzz.week_id = week.id
              WHERE entry.battle_id = battle.id
            )
          ) ORDER BY battle.level DESC) AS battles
        FROM battle
        WHERE battle.week_id = week.id
        GROUP BY battle.level
      ) battles_by_level
    ) AS levels,

    (
      SELECT json_agg(json_build_object(
        'id', band.id,
        'name', band.name,
        'color_light', band.color_light,
        'color_dark', band.color_dark,
        'new', band.start_week_id = week.id,
        'retiring', weekly_buzz.buzz < 10,
        'buzz', weekly_buzz.buzz
      ) ORDER BY weekly_buzz.buzz DESC, band.name ASC)
      FROM band
      JOIN weekly_buzz ON weekly_buzz.band_id = band.id AND weekly_buzz.week_id = week.id
      LEFT JOIN (
        SELECT
          entry.band_id
        FROM battle
        JOIN entry on entry.battle_id = battle.id
        WHERE battle.week_id = week.id
      ) AS entries ON entries.band_id = band.id
      WHERE band.start_week_id <= week.id
      AND entries.band_id IS NULL
    ) AS idle_bands
  FROM week
  ORDER BY week.id ASC
`;
