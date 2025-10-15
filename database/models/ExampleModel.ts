import { CreationOptional, DataTypes, Model, Sequelize } from "sequelize";

export interface ExampleModelAttributes {
  id?: string;
  value: string;
  created_at?: Date;
  updated_at?: Date;
}

class ExampleModel
  extends Model<ExampleModelAttributes, Omit<ExampleModelAttributes, "id" | "created_at" | "updated_at">>
  implements ExampleModelAttributes
{
  declare id: CreationOptional<string>;
  declare value: string;

  // Timestamps
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof ExampleModel {
    const market = ExampleModel.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
          unique: true,
        },
        value: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        created_at: {
          type: DataTypes.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updated_at: {
          type: DataTypes.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      },
      {
        sequelize,
        tableName: "markets",
        underscored: true,
        timestamps: false,
      },
    );

    return market;
  }

  static associate() {}
}

export default ExampleModel;
