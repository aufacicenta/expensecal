/* eslint-disable no-undef */
"use strict";

const { v4: uuidv4 } = require("uuid");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    const now = new Date();

    // First, update existing BTC and ETH to have currency_type = 'CRYPTO'
    // (in case migration didn't catch them or they were added later)
    await queryInterface.sequelize.query(`
      UPDATE currencies
      SET currency_type = 'CRYPTO'
      WHERE symbol IN ('BTC', 'ETH');
    `);

    // Check which crypto currencies already exist
    const [existingCryptos] = await queryInterface.sequelize.query(`
      SELECT symbol FROM currencies WHERE symbol IN ('BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'XRP', 'SOL', 'ADA', 'DOGE', 'DOT', 'MATIC', 'LTC', 'AVAX', 'LINK', 'ATOM', 'UNI', 'SHIB', 'TRX', 'XLM', 'NEAR');
    `);

    const existingSymbols = new Set(existingCryptos.map((c) => c.symbol));

    // Define all major cryptocurrencies
    const cryptoCurrencies = [
      // Top 20 by market cap (excluding stablecoins pegged 1:1 to USD like USDT/USDC which we still include for tracking)
      { symbol: "BTC", name: "Bitcoin", decimal_units: 8 },
      { symbol: "ETH", name: "Ethereum", decimal_units: 18 },
      { symbol: "USDT", name: "Tether", decimal_units: 6 },
      { symbol: "USDC", name: "USD Coin", decimal_units: 6 },
      { symbol: "BNB", name: "BNB", decimal_units: 18 },
      { symbol: "XRP", name: "XRP", decimal_units: 6 },
      { symbol: "SOL", name: "Solana", decimal_units: 9 },
      { symbol: "ADA", name: "Cardano", decimal_units: 6 },
      { symbol: "DOGE", name: "Dogecoin", decimal_units: 8 },
      { symbol: "DOT", name: "Polkadot", decimal_units: 10 },
      { symbol: "MATIC", name: "Polygon", decimal_units: 18 },
      { symbol: "LTC", name: "Litecoin", decimal_units: 8 },
      { symbol: "AVAX", name: "Avalanche", decimal_units: 18 },
      { symbol: "LINK", name: "Chainlink", decimal_units: 18 },
      { symbol: "ATOM", name: "Cosmos", decimal_units: 6 },
      { symbol: "UNI", name: "Uniswap", decimal_units: 18 },
      { symbol: "SHIB", name: "Shiba Inu", decimal_units: 18 },
      { symbol: "TRX", name: "TRON", decimal_units: 6 },
      { symbol: "XLM", name: "Stellar", decimal_units: 7 },
      { symbol: "NEAR", name: "NEAR Protocol", decimal_units: 24 },
    ];

    // Filter out currencies that already exist
    const currenciesToInsert = cryptoCurrencies
      .filter((c) => !existingSymbols.has(c.symbol))
      .map((c) => ({
        id: uuidv4(),
        symbol: c.symbol,
        name: c.name,
        decimal_units: c.decimal_units,
        currency_type: "CRYPTO",
        created_at: now,
        updated_at: now,
      }));

    if (currenciesToInsert.length > 0) {
      await queryInterface.bulkInsert("currencies", currenciesToInsert);
    }

    console.log(
      `Inserted ${currenciesToInsert.length} new crypto currencies. Skipped ${existingSymbols.size} existing.`,
    );
  },

  async down(queryInterface, _Sequelize) {
    // Remove crypto currencies (except BTC and ETH which were in original seeder)
    const cryptoSymbols = [
      "USDT",
      "USDC",
      "BNB",
      "XRP",
      "SOL",
      "ADA",
      "DOGE",
      "DOT",
      "MATIC",
      "LTC",
      "AVAX",
      "LINK",
      "ATOM",
      "UNI",
      "SHIB",
      "TRX",
      "XLM",
      "NEAR",
    ];

    await queryInterface.bulkDelete(
      "currencies",
      {
        symbol: cryptoSymbols,
      },
      {},
    );

    // Reset BTC and ETH back to FIAT (for rollback consistency, though this is unusual)
    await queryInterface.sequelize.query(`
      UPDATE currencies
      SET currency_type = 'FIAT'
      WHERE symbol IN ('BTC', 'ETH');
    `);
  },
};
