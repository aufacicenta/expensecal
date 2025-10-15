/* eslint-disable no-undef */
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create ENUM type for event_type
    await queryInterface.sequelize.query(`
      CREATE TYPE event_type AS ENUM ('EXPENSE', 'INCOME');
    `);

    await queryInterface.createTable("events", {
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
      type: {
        type: Sequelize.ENUM("EXPENSE", "INCOME"),
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(28, 8),
        allowNull: false,
        comment: "Supports crypto precision (8 decimals)",
      },
      currency_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "currencies",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      event_date: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: "Stored in UTC",
      },
      parent_event_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "events",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "Points to original/first event for recurring events",
      },
      recurrence_rule: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "RFC 5545 RRULE format (e.g., FREQ=MONTHLY;INTERVAL=1)",
      },
      recurrence_end_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Stored in UTC",
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
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Soft delete timestamp in UTC",
      },
    });

    // Add indexes
    await queryInterface.addIndex("events", ["user_id"]);
    await queryInterface.addIndex("events", ["event_date"]);
    await queryInterface.addIndex("events", ["parent_event_id"]);
    await queryInterface.addIndex("events", ["deleted_at"]);
    await queryInterface.addIndex("events", ["currency_id"]);
    await queryInterface.addIndex("events", ["type"]);
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable("events");
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS event_type;`);
  },
};
