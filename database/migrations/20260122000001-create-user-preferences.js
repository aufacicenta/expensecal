/* eslint-disable no-undef */
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("user_preferences", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        comment: "Foreign key to Stack Auth user.id - one preferences record per user",
      },
      base_currency_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "currencies",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
        comment: "The user's preferred base currency for displaying amounts",
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

    // Add index on user_id for faster lookups
    await queryInterface.addIndex("user_preferences", ["user_id"], {
      unique: true,
      name: "user_preferences_user_id_unique",
    });

    // Add index on base_currency_id for foreign key performance
    await queryInterface.addIndex("user_preferences", ["base_currency_id"], {
      name: "user_preferences_base_currency_id",
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable("user_preferences");
  },
};
