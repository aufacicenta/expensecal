import { CreationOptional, DataTypes, Model, NonAttribute, Sequelize } from "sequelize";
import { Event } from "./Event";
import { EventGroupEvents } from "./EventGroupEvents";

export interface EventGroupAttributes {
  id?: string;
  user_id: string;
  name: string;
  created_at?: Date;
  updated_at?: Date;
}

export class EventGroup
  extends Model<EventGroupAttributes, Omit<EventGroupAttributes, "id" | "created_at" | "updated_at">>
  implements EventGroupAttributes
{
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare name: string;

  declare readonly created_at: Date;
  declare readonly updated_at: Date;

  // Associations
  declare events?: NonAttribute<Event[]>;

  static initModel(sequelize: Sequelize): typeof EventGroup {
    EventGroup.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
          comment: "Foreign key to users table (Stack Auth)",
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          comment: "Name of the event group/view",
        },
        created_at: {
          type: DataTypes.DATE,
          field: "created_at",
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updated_at: {
          type: DataTypes.DATE,
          field: "updated_at",
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: "event_groups",
        underscored: true,
        timestamps: true,
        indexes: [
          {
            fields: ["user_id"],
          },
        ],
      },
    );

    return EventGroup;
  }

  static associate() {
    // Many-to-many association with Event through EventGroupEvents
    EventGroup.belongsToMany(Event, {
      through: EventGroupEvents,
      foreignKey: "event_group_id",
      otherKey: "event_id",
      as: "events",
    });
  }
}

export default EventGroup;
