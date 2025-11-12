import { CreationOptional, DataTypes, ForeignKey, Model, NonAttribute, Sequelize } from "sequelize";
import { Category } from "./Category";
import { Event } from "./Event";

export interface EventCategoriesAttributes {
  id?: string;
  event_id: string;
  category_id: string;
  created_at?: Date;
}

export class EventCategories extends Model<EventCategoriesAttributes> implements EventCategoriesAttributes {
  declare id: CreationOptional<string>;
  declare event_id: ForeignKey<Event["id"]>;
  declare category_id: ForeignKey<Category["id"]>;

  declare readonly created_at: Date;

  // Associations
  declare event?: NonAttribute<Event>;
  declare category?: NonAttribute<Category>;

  static initModel(sequelize: Sequelize): typeof EventCategories {
    EventCategories.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        event_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: Event,
            key: "id",
          },
          onDelete: "CASCADE",
          comment: "Foreign key to events table",
        },
        category_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: Category,
            key: "id",
          },
          onDelete: "CASCADE",
          comment: "Foreign key to categories table",
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
        tableName: "event_categories",
        underscored: true,
        timestamps: true,
        updatedAt: false, // Only track created_at
        indexes: [
          {
            fields: ["event_id"],
          },
          {
            fields: ["category_id"],
          },
          {
            unique: true,
            fields: ["event_id", "category_id"],
            name: "unique_event_category",
          },
        ],
      },
    );

    return EventCategories;
  }

  static associate() {
    // Association with Event
    EventCategories.belongsTo(Event, {
      foreignKey: "event_id",
      as: "event",
    });

    // Association with Category
    EventCategories.belongsTo(Category, {
      foreignKey: "category_id",
      as: "category",
    });
  }
}

export default EventCategories;
