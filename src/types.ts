export type Song = {
  name: string,
};

export type Band = {
  name: string,
  color: string,
  songs: Song[],
  level: number,
  buzz: number,
};

export type Performance = {
  band: Band,
  song: Song,
  score: number,
};

export type Round = {
  performances: Performance[],
  eliminee: Band,
};

export type Battle = {
  rounds: Round[],
  rankedBands: Band[],
};

export type Week = {
  levels: {
    level: number,
    bands: Band[],
    battles: Battle[],
  }[],
};
