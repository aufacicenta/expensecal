/* eslint-disable no-undef */
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create the ENUM type first
    await queryInterface.sequelize.query(`
      CREATE TYPE "currency_type_enum" AS ENUM ('FIAT', 'CRYPTO');
    `);

    // Add the currency_type column with default 'FIAT'
    await queryInterface.addColumn("currencies", "currency_type", {
      type: Sequelize.ENUM("FIAT", "CRYPTO"),
      allowNull: false,
      defaultValue: "FIAT",
      comment: "Type of currency: FIAT for traditional currencies, CRYPTO for cryptocurrencies",
    });

    // Update existing BTC and ETH records to be CRYPTO
    await queryInterface.sequelize.query(`
      UPDATE currencies
      SET currency_type = 'CRYPTO'
      WHERE symbol IN ('BTC', 'ETH');
    `);
  },

  async down(queryInterface, _Sequelize) {
    // Remove the column
    await queryInterface.removeColumn("currencies", "currency_type");

    // Drop the ENUM type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "currency_type_enum";
    `);
  },
};
