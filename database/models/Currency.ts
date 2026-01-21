import { CreationOptional, DataTypes, Model, Sequelize } from "sequelize";

export enum CurrencyType {
  FIAT = "FIAT",
  CRYPTO = "CRYPTO",
}

export interface CurrencyAttributes {
  id?: string;
  symbol: string;
  name: string;
  decimal_units: number;
  currency_type: CurrencyType;
  created_at?: Date;
  updated_at?: Date;
}

export class Currency extends Model<CurrencyAttributes> implements CurrencyAttributes {
  declare id: CreationOptional<string>;
  declare symbol: string;
  declare name: string;
  declare decimal_units: number;
  declare currency_type: CurrencyType;

  declare readonly created_at: Date;
  declare readonly updated_at: Date;

  static initModel(sequelize: Sequelize): typeof Currency {
    Currency.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        symbol: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        decimal_units: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        currency_type: {
          type: DataTypes.ENUM(...Object.values(CurrencyType)),
          allowNull: false,
          defaultValue: CurrencyType.FIAT,
          comment: "Type of currency: FIAT for traditional currencies, CRYPTO for cryptocurrencies",
        },
      },
      {
        sequelize,
        tableName: "currencies",
        underscored: true,
        timestamps: false,
      },
    );

    return Currency;
  }

  static associate() {
    // define associations here
  }
}

export default Currency;
