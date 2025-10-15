import { CreationOptional, DataTypes, ForeignKey, Model, NonAttribute, Sequelize } from "sequelize";
import { Event } from "./Event";

export interface EventInstallmentAttributes {
  id?: string;
  parent_event_id: string;
  installment_event_id: string;
  created_at?: Date;
}

export class EventInstallment extends Model<EventInstallmentAttributes> implements EventInstallmentAttributes {
  declare id: CreationOptional<string>;
  declare parent_event_id: ForeignKey<Event["id"]>;
  declare installment_event_id: ForeignKey<Event["id"]>;

  declare readonly created_at: Date;

  // Associations
  declare parentEvent?: NonAttribute<Event>;
  declare installmentEvent?: NonAttribute<Event>;

  static initModel(sequelize: Sequelize): typeof EventInstallment {
    EventInstallment.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        parent_event_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: Event,
            key: "id",
          },
          onDelete: "CASCADE",
          comment: "The main/total event",
        },
        installment_event_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: Event,
            key: "id",
          },
          onDelete: "CASCADE",
          comment: "Each installment event",
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: "event_installments",
        underscored: true,
        timestamps: true,
        updatedAt: false, // Only track created_at
        indexes: [
          {
            fields: ["parent_event_id"],
          },
          {
            fields: ["installment_event_id"],
          },
          {
            unique: true,
            fields: ["parent_event_id", "installment_event_id"],
            name: "unique_parent_installment",
          },
        ],
      },
    );

    return EventInstallment;
  }

  static associate() {
    // Association with parent event
    EventInstallment.belongsTo(Event, {
      foreignKey: "parent_event_id",
      as: "parentEvent",
    });

    // Association with installment event
    EventInstallment.belongsTo(Event, {
      foreignKey: "installment_event_id",
      as: "installmentEvent",
    });
  }
}

export default EventInstallment;
