import { DataTypes, Model, Optional, Sequelize } from 'sequelize';


interface BandAttributes {
  id: number,
  name: string,
}
interface BandCreationAttributes extends Optional<BandAttributes, 'id'> {}

export default class Band
extends Model<BandAttributes, BandCreationAttributes>
implements BandAttributes {
  public id!: number;
  public name!: string;

  static initialize(sequelize: Sequelize) {
    Band.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
      },
      {
        sequelize,
        freezeTableName: true,
      },
    );
  }
}
