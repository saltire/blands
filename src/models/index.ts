import { Sequelize } from 'sequelize';

import Band from './band';
import Song from './song';


export default async function initModels(sequelize: Sequelize) {
  Band.initialize(sequelize);
  Song.initialize(sequelize);

  Song.belongsTo(Band, { foreignKey: 'bandId' });

  await sequelize.sync({ alter: true });
}
