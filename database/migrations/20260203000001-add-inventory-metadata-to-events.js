/* eslint-disable no-undef */
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add inventory_metadata JSONB column to events table
    await queryInterface.addColumn("events", "inventory_metadata", {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: "JSONB metadata for inventory tracking (valuation, acquisition, details)",
    });

    // GIN index for efficient JSONB queries
    await queryInterface.sequelize.query(`
      CREATE INDEX idx_events_inventory_metadata
      ON events USING GIN (inventory_metadata)
      WHERE inventory_metadata IS NOT NULL;
    `);

    // Partial index for inventory items only (user_id + event_date where inventory_metadata exists)
    await queryInterface.sequelize.query(`
      CREATE INDEX idx_events_is_inventory
      ON events (user_id, event_date)
      WHERE inventory_metadata IS NOT NULL;
    `);
  },

  async down(queryInterface, _Sequelize) {
    // Drop indexes first
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_events_is_inventory;
    `);
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_events_inventory_metadata;
    `);

    // Remove the column
    await queryInterface.removeColumn("events", "inventory_metadata");
  },
};
