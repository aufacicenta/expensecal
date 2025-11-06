/* eslint-disable no-undef */
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("events", "original_text", {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: "Original text input from which this event was parsed",
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.removeColumn("events", "original_text");
  },
};
