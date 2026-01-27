/* eslint-disable no-undef */
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("event_group_events", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      event_group_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "event_groups",
          key: "id",
        },
        onDelete: "CASCADE",
        comment: "Foreign key to event_groups table",
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
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Add indexes
    await queryInterface.addIndex("event_group_events", ["event_group_id"]);
    await queryInterface.addIndex("event_group_events", ["event_id"]);
    await queryInterface.addIndex("event_group_events", ["event_group_id", "event_id"], {
      unique: true,
      name: "unique_event_group_event",
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable("event_group_events");
  },
};
