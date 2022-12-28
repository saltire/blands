export type BandSummary = {
  id: number,
  name: string,
  color_light: string,
  color_dark: string,
  buzz: number,
  level: number,
  songs: {
    id: number,
    name: string,
  }[],
  battles: {
    id: number,
    week_id: number,
    level: number,
    place: number,
    band_count: number,
  }[],
  weekly_buzz: {
    week_id: number,
    buzz: number,
    level: number,
    rank: number,
  }[],
};

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
