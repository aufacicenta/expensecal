/* eslint-disable no-undef */
"use strict";

const { v4: uuidv4 } = require("uuid");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    const now = new Date();

    await queryInterface.bulkInsert("currencies", [
      {
        id: uuidv4(),
        symbol: "USD",
        name: "US Dollar",
        decimal_units: 2,
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        symbol: "EUR",
        name: "Euro",
        decimal_units: 2,
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        symbol: "GBP",
        name: "British Pound",
        decimal_units: 2,
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        symbol: "MXN",
        name: "Mexican Peso",
        decimal_units: 2,
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        symbol: "JPY",
        name: "Japanese Yen",
        decimal_units: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        symbol: "BTC",
        name: "Bitcoin",
        decimal_units: 8,
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        symbol: "ETH",
        name: "Ethereum",
        decimal_units: 8,
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        symbol: "CAD",
        name: "Canadian Dollar",
        decimal_units: 2,
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        symbol: "AUD",
        name: "Australian Dollar",
        decimal_units: 2,
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        symbol: "CHF",
        name: "Swiss Franc",
        decimal_units: 2,
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        symbol: "GTQ",
        name: "Guatemalan Quetzal",
        decimal_units: 2,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.bulkDelete("currencies", null, {});
  },
};
