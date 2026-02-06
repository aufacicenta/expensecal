import { CreationOptional, DataTypes, ForeignKey, Model, NonAttribute, Sequelize } from "sequelize";
import { Event } from "./Event";
import { EventGroup } from "./EventGroup";

export interface EventGroupEventsAttributes {
  id?: string;
  event_group_id: string;
  event_id: string;
  created_at?: Date;
}

export class EventGroupEvents extends Model<EventGroupEventsAttributes> implements EventGroupEventsAttributes {
  declare id: CreationOptional<string>;
  declare event_group_id: ForeignKey<EventGroup["id"]>;
  declare event_id: ForeignKey<Event["id"]>;

  declare readonly created_at: Date;

  // Associations
  declare eventGroup?: NonAttribute<EventGroup>;
  declare event?: NonAttribute<Event>;

  static initModel(sequelize: Sequelize): typeof EventGroupEvents {
    EventGroupEvents.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        event_group_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: "event_groups",
            key: "id",
          },
          onDelete: "CASCADE",
          comment: "Foreign key to event_groups table",
        },
        event_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: "events",
            key: "id",
          },
          onDelete: "CASCADE",
          comment: "Foreign key to events table",
        },
        created_at: {
          type: DataTypes.DATE,
          field: "created_at",
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: "event_group_events",
        underscored: true,
        timestamps: true,
        updatedAt: false, // Only track created_at
        indexes: [
          {
            fields: ["event_group_id"],
          },
          {
            fields: ["event_id"],
          },
          {
            unique: true,
            fields: ["event_group_id", "event_id"],
            name: "unique_event_group_event",
          },
        ],
      },
    );

    return EventGroupEvents;
  }

  static associate() {
    // Association with EventGroup
    EventGroupEvents.belongsTo(EventGroup, {
      foreignKey: "event_group_id",
      as: "eventGroup",
    });

    // Association with Event
    EventGroupEvents.belongsTo(Event, {
      foreignKey: "event_id",
      as: "event",
    });
  }
}

export default EventGroupEvents;
