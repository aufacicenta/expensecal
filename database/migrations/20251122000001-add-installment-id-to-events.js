/* eslint-disable no-undef */
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("events", "installment_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "event_installments",
        key: "id",
      },
      onDelete: "SET NULL",
      comment: "Points to EventInstallment record if this event is part of an installment structure",
    });

    // Add index for faster queries on installment_id
    await queryInterface.addIndex("events", ["installment_id"]);
  },

  async down(queryInterface, _Sequelize) {
    // Remove the index first
    await queryInterface.removeIndex("events", ["installment_id"]);

    // Then remove the column
    await queryInterface.removeColumn("events", "installment_id");
  },
};
