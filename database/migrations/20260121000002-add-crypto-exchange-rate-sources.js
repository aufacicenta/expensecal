/* eslint-disable no-undef */
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    // Add new values to the existing exchange_rate_source enum
    // PostgreSQL requires ALTER TYPE to add new enum values
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_exchange_rates_source" ADD VALUE IF NOT EXISTS 'coingecko';
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_exchange_rates_source" ADD VALUE IF NOT EXISTS 'coinmarketcap';
    `);
  },

  async down(queryInterface, _Sequelize) {
    // Note: PostgreSQL doesn't support removing enum values easily
    // In production, you'd need to recreate the type and migrate data
    // For development, this is a no-op warning
    console.warn("Warning: Cannot remove enum values in PostgreSQL. Manual intervention required if needed.");
  },
};
