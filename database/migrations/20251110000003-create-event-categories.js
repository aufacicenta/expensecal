/* eslint-disable no-undef */
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("event_categories", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      event_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "events",
          key: "id",
        },
        onDelete: "CASCADE",
        comment: "Foreign key to events table",
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "categories",
          key: "id",
        },
        onDelete: "CASCADE",
        comment: "Foreign key to categories table",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Add indexes
    await queryInterface.addIndex("event_categories", ["event_id"]);
    await queryInterface.addIndex("event_categories", ["category_id"]);
    await queryInterface.addIndex("event_categories", ["event_id", "category_id"], {
      unique: true,
      name: "unique_event_category",
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable("event_categories");
  },
};
