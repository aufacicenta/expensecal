import { CreationOptional, DataTypes, ForeignKey, Model, NonAttribute, Sequelize } from "sequelize";
import { Currency } from "./Currency";

export enum EventType {
  EXPENSE = "EXPENSE",
  INCOME = "INCOME",
}

export interface EventAttributes {
  id?: string;
  user_id: string;
  type: EventType;
  amount: string; // Using string for DECIMAL to avoid precision issues
  currency_id: string;
  description: string;
  event_date: Date;
  parent_event_id?: string | null;
  recurrence_rule?: string | null;
  recurrence_end_date?: Date | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

export class Event extends Model<EventAttributes> implements EventAttributes {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare type: EventType;
  declare amount: string;
  declare currency_id: ForeignKey<Currency["id"]>;
  declare description: string;
  declare event_date: Date;
  declare parent_event_id: ForeignKey<Event["id"]> | null;
  declare recurrence_rule: string | null;
  declare recurrence_end_date: Date | null;

  declare readonly created_at: Date;
  declare readonly updated_at: Date;
  declare deleted_at: Date | null;

  // Associations
  declare currency?: NonAttribute<Currency>;
  declare parentEvent?: NonAttribute<Event>;
  declare childEvents?: NonAttribute<Event[]>;

  static initModel(sequelize: Sequelize): typeof Event {
    Event.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
          comment: "Foreign key to neon_auth.users_sync",
        },
        type: {
          type: DataTypes.ENUM(...Object.values(EventType)),
          allowNull: false,
        },
        amount: {
          type: DataTypes.DECIMAL(28, 8),
          allowNull: false,
          comment: "Supports crypto precision (8 decimals)",
        },
        currency_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: Currency,
            key: "id",
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        event_date: {
          type: DataTypes.DATE,
          allowNull: false,
          comment: "Stored in UTC",
        },
        parent_event_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: "events",
            key: "id",
          },
          comment: "Points to original/first event for recurring events",
        },
        recurrence_rule: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "RFC 5545 RRULE format (e.g., FREQ=MONTHLY;INTERVAL=1)",
        },
        recurrence_end_date: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: "Stored in UTC",
        },
        deleted_at: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: "Soft delete timestamp in UTC",
        },
      },
      {
        sequelize,
        tableName: "events",
        underscored: true,
        timestamps: true,
        paranoid: true, // Enables soft deletes
        indexes: [
          {
            fields: ["user_id"],
          },
          {
            fields: ["event_date"],
          },
          {
            fields: ["parent_event_id"],
          },
          {
            fields: ["deleted_at"],
          },
          {
            fields: ["currency_id"],
          },
        ],
      },
    );

    return Event;
  }

  static associate() {
    // Association with Currency
    Event.belongsTo(Currency, {
      foreignKey: "currency_id",
      as: "currency",
    });

    // Self-referential association for parent-child relationships
    Event.belongsTo(Event, {
      foreignKey: "parent_event_id",
      as: "parentEvent",
    });

    Event.hasMany(Event, {
      foreignKey: "parent_event_id",
      as: "childEvents",
    });
  }
}

export default Event;
