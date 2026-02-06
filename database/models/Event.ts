import { CreationOptional, DataTypes, ForeignKey, Model, NonAttribute, Sequelize } from "sequelize";
import Category from "./Category";
import { Currency } from "./Currency";
import EventCategories from "./EventCategories";
import EventInstallment from "./EventInstallment";

export enum EventType {
  EXPENSE = "EXPENSE",
  INCOME = "INCOME",
}

// Inventory tracking types

export type InventoryValuationConfidence = "HIGH" | "MEDIUM" | "LOW";

export type InventoryValuationSource = {
  url: string;
  title: string;
  price?: number;
};

export type InventoryValuation = {
  estimated_low: number;
  estimated_high: number;
  currency: string;
  confidence: InventoryValuationConfidence;
  data_points: number;
  sources: InventoryValuationSource[];
  last_updated: string; // ISO date
  search_query_used: string; // LLM-generated query
};

export type InventoryAcquisitionType = "PURCHASED" | "INHERITED" | "GIFTED" | "TRADED" | "FOUND";

export type InventoryAcquisition = {
  type: InventoryAcquisitionType;
  original_price?: number;
  original_currency?: string;
  date?: string; // ISO date
};

export type InventoryCondition = "MINT" | "EXCELLENT" | "GOOD" | "FAIR" | "POOR";

export type InventoryDetails = {
  condition?: InventoryCondition;
  year?: number;
  brand?: string;
  model?: string;
  serial_number?: string;
  location?: string; // "Home Office", "Storage"
};

export type InventoryStatus = "OWNED" | "SOLD" | "DONATED" | "LOST";

export type InventoryValuationStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

export type InventoryMetadata = {
  valuation?: InventoryValuation;
  acquisition?: InventoryAcquisition;
  details?: InventoryDetails;
  status?: InventoryStatus;
  needs_clarification?: string[];
  valuation_status?: InventoryValuationStatus;
  valuation_error?: string;
};

export interface EventAttributes {
  id?: string;
  user_id: string;
  type: EventType;
  amount: string; // Using string for DECIMAL to avoid precision issues
  currency_id: string;
  quantity: number;
  description: string;
  event_date: Date;
  parent_event_id?: string | null;
  installment_id?: string | null; // Points to EventInstallment.id if this is an installment
  recurrence_rule?: string | null;
  recurrence_end_date?: Date | null;
  original_text?: string | null;
  inventory_metadata?: InventoryMetadata | null; // JSONB for inventory tracking
  currency?: Currency;
  categories?: Category[]; // Categories associated with this event
  childEvents?: EventAttributes[]; // Brought from associations
  parentEvent?: EventAttributes; // Brought from associations
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
  declare quantity: number;
  declare description: string;
  declare event_date: Date;
  declare parent_event_id: ForeignKey<Event["id"]> | null;
  declare installment_id: ForeignKey<EventInstallment["id"]> | null;
  declare recurrence_rule: string | null;
  declare recurrence_end_date: Date | null;
  declare original_text: string | null;
  declare inventory_metadata: InventoryMetadata | null;

  declare readonly created_at: Date;
  declare readonly updated_at: Date;
  declare deleted_at: Date | null;

  // Associations
  declare currency?: NonAttribute<Currency>;
  declare parentEvent?: NonAttribute<Event>;
  declare childEvents?: NonAttribute<Event[]>;
  declare categories?: NonAttribute<Category[]>; // Categories through EventCategories junction

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
        quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
          comment: "Number of units (e.g., 5 coffees at 3 USD each)",
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
        installment_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: "event_installments",
            key: "id",
          },
          comment: "Points to EventInstallment record if this event is part of an installment structure",
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
        original_text: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "Original text input from which this event was parsed",
        },
        inventory_metadata: {
          type: DataTypes.JSONB,
          allowNull: true,
          comment: "JSONB metadata for inventory tracking (valuation, acquisition, details)",
        },
        deleted_at: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: "Soft delete timestamp in UTC",
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
            fields: ["installment_id"],
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

    // Many-to-many association with Category through EventCategories
    Event.belongsToMany(Category, {
      through: EventCategories,
      foreignKey: "event_id",
      otherKey: "category_id",
      as: "categories",
    });
  }

  /**
   * Generate JSON schema for parseable Event fields
   * Used for LLM structured output validation
   * Excludes IDs, timestamps, and foreign keys
   */
  static getParserSchema() {
    return {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["EXPENSE", "INCOME"],
          description: "Event type",
        },
        amount: {
          type: "string",
          pattern: "^\\d+(\\.\\d{1,8})?$",
          description: "Amount as decimal string (up to 8 decimal places)",
        },
        quantity: {
          type: "integer",
          minimum: 1,
          description: "Number of units",
        },
        description: {
          type: "string",
          minLength: 1,
          description: "Event description",
        },
        event_date: {
          type: "string",
          format: "date-time",
          description: "Event date in ISO 8601 format (UTC)",
        },
        recurrence_rule: {
          type: ["string", "null"],
          description: "RFC 5545 RRULE format (optional)",
        },
        recurrence_end_date: {
          type: ["string", "null"],
          format: "date-time",
          description: "Recurrence end date in ISO 8601 format (optional)",
        },
        currency: {
          type: "string",
          description: "Currency symbol (e.g., USD, EUR, BTC)",
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Confidence score of the parsing (0.0 to 1.0)",
        },
      },
      required: ["type", "amount", "quantity", "description", "event_date", "currency", "confidence"],
      additionalProperties: false,
    };
  }
}

export default Event;
