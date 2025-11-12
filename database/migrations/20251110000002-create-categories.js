/* eslint-disable no-undef */
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("categories", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: "Foreign key to neon_auth.users_sync",
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Category name (e.g., Groceries, Utilities)",
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Optional description of the category",
      },
      color: {
        type: Sequelize.STRING(7),
        allowNull: false,
        comment: "Hex color value for UI display (e.g., #FF5733)",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Add indexes
    await queryInterface.addIndex("categories", ["user_id"]);
    await queryInterface.addIndex("categories", ["name"]);
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable("categories");
  },
};
