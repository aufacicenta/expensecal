import { CreationOptional, DataTypes, ForeignKey, Model, NonAttribute, Sequelize } from "sequelize";
import { Currency } from "./Currency";

export interface UserPreferencesAttributes {
  id?: string;
  user_id: string;
  base_currency_id: string;
  created_at?: Date;
  updated_at?: Date;
}

export class UserPreferences extends Model<UserPreferencesAttributes> implements UserPreferencesAttributes {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare base_currency_id: ForeignKey<Currency["id"]>;

  declare readonly created_at: Date;
  declare readonly updated_at: Date;

  // Associations
  declare baseCurrency?: NonAttribute<Currency>;

  static initModel(sequelize: Sequelize): typeof UserPreferences {
    UserPreferences.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true,
          comment: "Foreign key to Stack Auth user.id - one preferences record per user",
        },
        base_currency_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: Currency,
            key: "id",
          },
          comment: "The user's preferred base currency for displaying amounts",
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          field: "created_at",
          defaultValue: DataTypes.NOW,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          field: "updated_at",
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: "user_preferences",
        underscored: true,
        timestamps: true,
        indexes: [
          {
            unique: true,
            fields: ["user_id"],
          },
          {
            fields: ["base_currency_id"],
          },
        ],
      },
    );

    return UserPreferences;
  }

  static associate() {
    // Association with Currency for base currency
    UserPreferences.belongsTo(Currency, {
      foreignKey: "base_currency_id",
      as: "baseCurrency",
    });
  }
}

export default UserPreferences;
