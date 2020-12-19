import { BelongsToGetAssociationMixin, DataTypes, Model, Optional, Sequelize } from 'sequelize';


interface SongAttributes {
  id: number,
  bandId: number,
  name: string,
}
interface SongCreationAttributes extends Optional<SongAttributes, 'id'> {}

export default class Song extends Model<SongAttributes, SongCreationAttributes> {
  public id!: number;
  public bandId!: number;
  public name!: string;

  static initialize(sequelize: Sequelize) {
    Song.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },
        bandId: {
          type: DataTypes.INTEGER,
          allowNull: false,
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
