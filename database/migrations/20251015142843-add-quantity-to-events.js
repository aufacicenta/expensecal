/* eslint-disable no-undef */
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("events", "quantity", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: "Number of units (e.g., 5 coffees at 3 USD each)",
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.removeColumn("events", "quantity");
  },
};
