export type Band = {
  name: string,
  color: string,
  songs: Song[],
  level: number,
  buzz: number,
  battles: BandBattle[],
};

export type Song = {
  name: string,
};

export type BandBattle = {
  startBuzz: number,
  startLevel: number,
  performances: BandPerformance[],
  rank: number,
  buzzAwarded: number,
  newLevel: number,
};

export type BandPerformance = {
  song: Song,
  score: number,
  rank: number,
};

export type Week = {
  levels: {
    level: number,
    bands: Band[],
    battles: Battle[],
  }[],
};

export type Battle = {
  rounds: Round[],
  rankedBands: Band[],
};

export type Round = {
  performances: Performance[],
  eliminee: Band,
};

export type Performance = {
  band: Band,
  song: Song,
  score: number,
};
