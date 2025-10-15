/* eslint-disable no-undef */
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("event_installments", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      parent_event_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "events",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "The main/total event",
      },
      installment_event_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "events",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "Each installment event",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Add indexes
    await queryInterface.addIndex("event_installments", ["parent_event_id"]);
    await queryInterface.addIndex("event_installments", ["installment_event_id"]);

    // Add unique constraint
    await queryInterface.addConstraint("event_installments", {
      fields: ["parent_event_id", "installment_event_id"],
      type: "unique",
      name: "unique_parent_installment",
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable("event_installments");
  },
};
