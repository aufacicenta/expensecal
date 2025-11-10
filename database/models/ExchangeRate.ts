import { CreationOptional, DataTypes, ForeignKey, Model, NonAttribute, Sequelize } from "sequelize";
import { Currency } from "./Currency";

export enum ExchangeRateSource {
  EXCHANGERATE_API = "exchangerate-api",
  MANUAL = "manual",
}

export interface ExchangeRateAttributes {
  id?: string;
  from_currency_id: ForeignKey<Currency["id"]>;
  to_currency_id: ForeignKey<Currency["id"]>;
  rate: string; // Using string for DECIMAL to avoid precision issues
  snapshot_date: Date; // The date this rate represents (UTC)
  fetched_at: Date; // When we fetched it from the API (UTC)
  source: ExchangeRateSource;
  is_latest: boolean; // Flag to quickly identify the most recent rate
  created_at?: Date;
  updated_at?: Date;
}

export class ExchangeRate extends Model<ExchangeRateAttributes> implements ExchangeRateAttributes {
  declare id: CreationOptional<string>;
  declare from_currency_id: ForeignKey<Currency["id"]>;
  declare to_currency_id: ForeignKey<Currency["id"]>;
  declare rate: string;
  declare snapshot_date: Date;
  declare fetched_at: Date;
  declare source: ExchangeRateSource;
  declare is_latest: boolean;

  declare readonly created_at: Date;
  declare readonly updated_at: Date;

  // Associations
  declare fromCurrency?: NonAttribute<Currency>;
  declare toCurrency?: NonAttribute<Currency>;

  static initModel(sequelize: Sequelize): typeof ExchangeRate {
    ExchangeRate.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        from_currency_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: Currency,
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
          comment: "Source currency (typically USD for hub-and-spoke model)",
        },
        to_currency_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: Currency,
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
          comment: "Target currency for conversion",
        },
        rate: {
          type: DataTypes.DECIMAL(20, 8),
          allowNull: false,
          comment: "Exchange rate from -> to currency",
        },
        snapshot_date: {
          type: DataTypes.DATE,
          allowNull: false,
          comment: "The date this rate represents (UTC, typically midnight)",
        },
        fetched_at: {
          type: DataTypes.DATE,
          allowNull: false,
          comment: "When this rate was fetched from the API (UTC)",
        },
        source: {
          type: DataTypes.ENUM(...Object.values(ExchangeRateSource)),
          allowNull: false,
          defaultValue: ExchangeRateSource.EXCHANGERATE_API,
          comment: "Source of the exchange rate",
        },
        is_latest: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: "Flag indicating if this is the latest rate for this pair",
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
        tableName: "exchange_rates",
        underscored: true,
        timestamps: true,
        indexes: [
          {
            fields: ["from_currency_id", "to_currency_id"],
          },
          {
            fields: ["to_currency_id", "snapshot_date"],
            name: "idx_exchange_rates_to_currency_snapshot_date",
          },
          {
            fields: ["is_latest", "from_currency_id"],
            name: "idx_exchange_rates_latest_from_currency",
          },
          {
            fields: ["snapshot_date"],
          },
        ],
      },
    );

    return ExchangeRate;
  }

  static associate() {
    // Association with Currency (from_currency)
    ExchangeRate.belongsTo(Currency, {
      foreignKey: "from_currency_id",
      as: "fromCurrency",
    });

    // Association with Currency (to_currency)
    ExchangeRate.belongsTo(Currency, {
      foreignKey: "to_currency_id",
      as: "toCurrency",
    });
  }
}

export default ExchangeRate;
