import { CreationOptional, DataTypes, Model, NonAttribute, Sequelize } from "sequelize";
import Event from "./Event";
import EventCategories from "./EventCategories";

export interface CategoryAttributes {
  id?: string;
  user_id: string;
  name: string;
  description?: string | null;
  color: string; // Hex color value (e.g., "#FF5733")
  created_at?: Date;
  updated_at?: Date;
}

export class Category extends Model<CategoryAttributes> implements CategoryAttributes {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare name: string;
  declare description: string | null;
  declare color: string;

  declare readonly created_at: Date;
  declare readonly updated_at: Date;

  // Associations
  declare events?: NonAttribute<any[]>; // Events through EventCategories junction

  static initModel(sequelize: Sequelize): typeof Category {
    Category.init(
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
        name: {
          type: DataTypes.STRING,
          allowNull: false,
          comment: "Category name (e.g., Groceries, Utilities)",
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "Optional description of the category",
        },
        color: {
          type: DataTypes.STRING(7),
          allowNull: false,
          validate: {
            is: /^#[0-9A-Fa-f]{6}$/,
          },
          comment: "Hex color value for UI display (e.g., #FF5733)",
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
        tableName: "categories",
        underscored: true,
        timestamps: true,
        indexes: [
          {
            fields: ["user_id"],
          },
          {
            fields: ["name"],
          },
        ],
      },
    );

    return Category;
  }

  static associate() {
    // Many-to-many association with Event through EventCategories
    Category.belongsToMany(Event, {
      through: EventCategories,
      foreignKey: "category_id",
      otherKey: "event_id",
      as: "events",
    });
  }
}

export default Category;
