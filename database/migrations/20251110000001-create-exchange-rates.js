/* eslint-disable no-undef */
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create ENUM type for exchange_rate_source
    await queryInterface.sequelize.query(`
      CREATE TYPE exchange_rate_source AS ENUM ('exchangerate-api', 'manual');
    `);

    await queryInterface.createTable("exchange_rates", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      from_currency_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "currencies",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
        comment: "Source currency (typically USD for hub-and-spoke model)",
      },
      to_currency_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "currencies",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
        comment: "Target currency for conversion",
      },
      rate: {
        type: Sequelize.DECIMAL(20, 8),
        allowNull: false,
        comment: "Exchange rate from -> to currency",
      },
      snapshot_date: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: "The date this rate represents (UTC, typically midnight)",
      },
      fetched_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: "When this rate was fetched from the API (UTC)",
      },
      source: {
        type: Sequelize.ENUM("exchangerate-api", "manual"),
        allowNull: false,
        defaultValue: "exchangerate-api",
        comment: "Source of the exchange rate",
      },
      is_latest: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Flag indicating if this is the latest rate for this pair",
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
    await queryInterface.addIndex("exchange_rates", ["from_currency_id", "to_currency_id"]);
    await queryInterface.addIndex("exchange_rates", ["to_currency_id", "snapshot_date"], {
      name: "idx_exchange_rates_to_currency_snapshot_date",
    });
    await queryInterface.addIndex("exchange_rates", ["is_latest", "from_currency_id"], {
      name: "idx_exchange_rates_latest_from_currency",
    });
    await queryInterface.addIndex("exchange_rates", ["snapshot_date"]);
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable("exchange_rates");
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS exchange_rate_source;`);
  },
};
