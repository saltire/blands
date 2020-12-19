import { Sequelize } from 'sequelize';

import { getBandGenerator } from './generator';
import initModels from './models';
import Band from './models/band';
import Song from './models/song';
import { range } from './utils';


const { DATABASE_URL } = process.env;

export async function init() {
  const sequelize = new Sequelize(DATABASE_URL || '', {
    dialectOptions: {
      ssl: { rejectUnauthorized: false },
    },
  });

  try {
    await sequelize.authenticate();
    console.log('Successfully connected to DB.');
  }
  catch (err) {
    console.error('Error connecting to DB:', err);
  }

  await initModels(sequelize);

  return sequelize;
}

export async function test() {
  const bandGen = await getBandGenerator();

  return Promise.all(range(3).map(async i => {
    const bandData = bandGen.generate({ songCount: 3 });
    const band = await Band.create({ name: bandData.name });
    const songs = await Promise.all(bandData.songs
      .map(s => Song.create({ bandId: band.id, name: s.name })));

    return { band, songs };
  }));
}
