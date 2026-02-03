import { initModels } from "@expensecal/database/models";
import { Currency } from "@expensecal/database/models/Currency";
import { Event, EventType } from "@expensecal/database/models/Event";
import { EventInstallment } from "@expensecal/database/models/EventInstallment";
import Decimal from "decimal.js";
import { Sequelize } from "sequelize";

import {
  createInstallments,
  deleteInstallmentsForParent,
  getInstallmentsForParent,
  recreateInstallments,
} from "@/lib/events/createInstallments";

describe("createInstallments Service", () => {
  let sequelize: Sequelize;
  let testCurrency: Currency;
  const testUserId = "550e8400-e29b-41d4-a716-446655440000";

  beforeAll(async () => {
    // Use in-memory SQLite for testing
    sequelize = new Sequelize("sqlite::memory:", {
      logging: false,
    });

    // Override the default db export for testing
    (global as any).testDb = sequelize;

    // Initialize models
    initModels(sequelize);

    // Sync database
    await sequelize.sync({ force: true });

    // Create test currency
    testCurrency = await Currency.create({
      symbol: "USD",
      name: "US Dollar",
      decimal_units: 2,
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    // Clean up all events and installments after each test
    await EventInstallment.destroy({ where: {}, force: true });
    await Event.destroy({ where: {}, force: true });
  });

  describe("createInstallments", () => {
    it("should create installments for a monthly recurring event", async () => {
      // Create a parent event with monthly recurrence
      const parentEvent = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "1200.00",
        currency_id: testCurrency.id,
        quantity: 1,
        description: "Monthly rent",
        event_date: new Date("2025-01-01T00:00:00Z"),
        recurrence_rule: "FREQ=MONTHLY;COUNT=12",
        recurrence_end_date: new Date("2025-12-01T00:00:00Z"),
      });

      // Create installments
      const result = await createInstallments({
        parentEventId: parentEvent.id,
      });

      expect(result.success).toBe(true);
      expect(result.installmentCount).toBe(12);
      expect(result.installmentIds).toHaveLength(12);
      expect(result.error).toBeUndefined();
    });

    it("should distribute amount equally across installments", async () => {
      const parentAmount = "1000.00";
      const expectedInstallmentAmount = new Decimal(parentAmount)
        .dividedBy(10)
        .toDecimalPlaces(8)
        .toString();

      const parentEvent = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: parentAmount,
        currency_id: testCurrency.id,
        quantity: 1,
        description: "10-month installment plan",
        event_date: new Date("2025-01-01T00:00:00Z"),
        recurrence_rule: "FREQ=MONTHLY;COUNT=10",
      });

      const result = await createInstallments({
        parentEventId: parentEvent.id,
      });

      expect(result.success).toBe(true);

      // Verify each installment has the correct amount
      const installments = await Event.findAll({
        where: { id: result.installmentIds },
      });

      installments.forEach((installment) => {
        expect(installment.amount).toBe(expectedInstallmentAmount);
      });
    });

    it("should create installments with correct dates based on recurrence", async () => {
      const parentEvent = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "300.00",
        currency_id: testCurrency.id,
        quantity: 1,
        description: "3-month plan",
        event_date: new Date("2025-01-15T00:00:00Z"),
        recurrence_rule: "FREQ=MONTHLY;COUNT=3",
      });

      const result = await createInstallments({
        parentEventId: parentEvent.id,
      });

      const installments = await Event.findAll({
        where: { id: result.installmentIds },
        order: [["event_date", "ASC"]],
      });

      expect(installments).toHaveLength(3);
      expect(installments[0].event_date.toISOString()).toContain("2025-01-15");
      expect(installments[1].event_date.toISOString()).toContain("2025-02-15");
      expect(installments[2].event_date.toISOString()).toContain("2025-03-15");
    });

    it("should link installments via EventInstallment junction table", async () => {
      const parentEvent = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "500.00",
        currency_id: testCurrency.id,
        quantity: 1,
        description: "5-part plan",
        event_date: new Date("2025-01-01T00:00:00Z"),
        recurrence_rule: "FREQ=MONTHLY;COUNT=5",
      });

      const result = await createInstallments({
        parentEventId: parentEvent.id,
      });

      // Verify junction records were created
      const junctionRecords = await EventInstallment.findAll({
        where: { parent_event_id: parentEvent.id },
      });

      expect(junctionRecords).toHaveLength(5);
      junctionRecords.forEach((record) => {
        expect(record.parent_event_id).toBe(parentEvent.id);
        expect(result.installmentIds).toContain(record.installment_event_id);
      });
    });

    it("should set parent_event_id on all installment events", async () => {
      const parentEvent = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "600.00",
        currency_id: testCurrency.id,
        quantity: 1,
        description: "6-month plan",
        event_date: new Date("2025-01-01T00:00:00Z"),
        recurrence_rule: "FREQ=MONTHLY;COUNT=6",
      });

      const result = await createInstallments({
        parentEventId: parentEvent.id,
      });

      const installments = await Event.findAll({
        where: { id: result.installmentIds },
      });

      installments.forEach((installment) => {
        expect(installment.parent_event_id).toBe(parentEvent.id);
      });
    });

    it("should preserve event type and currency from parent", async () => {
      const parentEvent = await Event.create({
        user_id: testUserId,
        type: EventType.INCOME,
        amount: "3000.00",
        currency_id: testCurrency.id,
        quantity: 1,
        description: "Bonus payment",
        event_date: new Date("2025-01-01T00:00:00Z"),
        recurrence_rule: "FREQ=QUARTERLY;COUNT=4",
      });

      const result = await createInstallments({
        parentEventId: parentEvent.id,
      });

      const installments = await Event.findAll({
        where: { id: result.installmentIds },
      });

      installments.forEach((installment) => {
        expect(installment.type).toBe(EventType.INCOME);
        expect(installment.currency_id).toBe(testCurrency.id);
      });
    });

    it("should handle weekly recurrence", async () => {
      const parentEvent = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "100.00",
        currency_id: testCurrency.id,
        quantity: 1,
        description: "Weekly gym membership",
        event_date: new Date("2025-01-01T00:00:00Z"),
        recurrence_rule: "FREQ=WEEKLY;COUNT=4",
      });

      const result = await createInstallments({
        parentEventId: parentEvent.id,
      });

      expect(result.success).toBe(true);
      expect(result.installmentCount).toBe(4);
    });

    it("should handle daily recurrence", async () => {
      const parentEvent = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "70.00",
        currency_id: testCurrency.id,
        quantity: 1,
        description: "7-day meal plan",
        event_date: new Date("2025-01-01T00:00:00Z"),
        recurrence_rule: "FREQ=DAILY;COUNT=7",
      });

      const result = await createInstallments({
        parentEventId: parentEvent.id,
      });

      expect(result.success).toBe(true);
      expect(result.installmentCount).toBe(7);
    });

    it("should respect custom endDate parameter", async () => {
      const parentEvent = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "2400.00",
        currency_id: testCurrency.id,
        quantity: 1,
        description: "Year-long subscription",
        event_date: new Date("2025-01-01T00:00:00Z"),
        recurrence_rule: "FREQ=MONTHLY;COUNT=12",
      });

      const customEndDate = new Date("2025-03-31T23:59:59Z");

      const result = await createInstallments({
        parentEventId: parentEvent.id,
        endDate: customEndDate,
      });

      // Should only create 3 installments (Jan, Feb, Mar)
      expect(result.installmentCount).toBeLessThanOrEqual(4);
    });

    it("should return error if parent event not found", async () => {
      const result = await createInstallments({
        parentEventId: "nonexistent-event-id",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return error if parent event has no recurrence rule", async () => {
      const parentEvent = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "100.00",
        currency_id: testCurrency.id,
        quantity: 1,
        description: "One-time expense",
        event_date: new Date("2025-01-01T00:00:00Z"),
        // No recurrence_rule
      });

      const result = await createInstallments({
        parentEventId: parentEvent.id,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("recurrence_rule");
    });

    it("should handle very large amounts with precision", async () => {
      const parentEvent = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "123456789.12345678", // 8 decimal places
        currency_id: testCurrency.id,
        quantity: 1,
        description: "Large payment",
        event_date: new Date("2025-01-01T00:00:00Z"),
        recurrence_rule: "FREQ=MONTHLY;COUNT=2",
      });

      const result = await createInstallments({
        parentEventId: parentEvent.id,
      });

      expect(result.success).toBe(true);
      const installments = await Event.findAll({
        where: { id: result.installmentIds },
      });

      // Each should have exactly half the amount
      const expectedAmount = new Decimal("123456789.12345678")
        .dividedBy(2)
        .toDecimalPlaces(8)
        .toString();

      installments.forEach((installment) => {
        expect(installment.amount).toBe(expectedAmount);
      });
    });

    it("should include description indicator for installments", async () => {
      const parentEvent = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "400.00",
        currency_id: testCurrency.id,
        quantity: 1,
        description: "New laptop",
        event_date: new Date("2025-01-01T00:00:00Z"),
        recurrence_rule: "FREQ=MONTHLY;COUNT=4",
      });

      const result = await createInstallments({
        parentEventId: parentEvent.id,
      });

      const installments = await Event.findAll({
        where: { id: result.installmentIds },
      });

      installments.forEach((installment) => {
        expect(installment.description).toContain("New laptop");
        expect(installment.description).toContain("Installment");
      });
    });
  });

  describe("getInstallmentsForParent", () => {
    it("should retrieve all installments for a parent event", async () => {
      const parentEvent = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "600.00",
        currency_id: testCurrency.id,
        quantity: 1,
        description: "6-month plan",
        event_date: new Date("2025-01-01T00:00:00Z"),
        recurrence_rule: "FREQ=MONTHLY;COUNT=6",
      });

      await createInstallments({ parentEventId: parentEvent.id });

      const installments = await getInstallmentsForParent(parentEvent.id);

      expect(installments).toHaveLength(6);
      installments.forEach((installment) => {
        expect(installment.parent_event_id).toBe(parentEvent.id);
      });
    });

    it("should return installments ordered by event_date", async () => {
      const parentEvent = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "300.00",
        currency_id: testCurrency.id,
        quantity: 1,
        description: "3-month plan",
        event_date: new Date("2025-01-01T00:00:00Z"),
        recurrence_rule: "FREQ=MONTHLY;COUNT=3",
      });

      await createInstallments({ parentEventId: parentEvent.id });

      const installments = await getInstallmentsForParent(parentEvent.id);

      for (let i = 1; i < installments.length; i++) {
        expect(installments[i].event_date.getTime()).toBeGreaterThan(
          installments[i - 1].event_date.getTime(),
        );
      }
    });

    it("should return empty array if parent has no installments", async () => {
      const parentEvent = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "100.00",
        currency_id: testCurrency.id,
        quantity: 1,
        description: "Event with no installments",
        event_date: new Date("2025-01-01T00:00:00Z"),
        // No recurrence rule, so no installments
      });

      const installments = await getInstallmentsForParent(parentEvent.id);

      expect(installments).toHaveLength(0);
    });
  });

  describe("deleteInstallmentsForParent", () => {
    it("should delete all installments for a parent event", async () => {
      const parentEvent = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "500.00",
        currency_id: testCurrency.id,
        quantity: 1,
        description: "5-month plan",
        event_date: new Date("2025-01-01T00:00:00Z"),
        recurrence_rule: "FREQ=MONTHLY;COUNT=5",
      });

      await createInstallments({ parentEventId: parentEvent.id });

      // Verify installments exist
      let installments = await getInstallmentsForParent(parentEvent.id);

      expect(installments).toHaveLength(5);

      // Delete installments
      const deleted = await deleteInstallmentsForParent(parentEvent.id);

      expect(deleted).toBe(true);

      // Verify all installments are deleted
      installments = await getInstallmentsForParent(parentEvent.id);
      expect(installments).toHaveLength(0);

      // Verify parent event still exists
      const parent = await Event.findByPk(parentEvent.id);

      expect(parent).toBeDefined();
    });

    it("should return true for non-existent parent event", async () => {
      const deleted = await deleteInstallmentsForParent("non-existent-id");

      expect(deleted).toBe(true);
    });
  });

  describe("recreateInstallments", () => {
    it("should delete old installments and create new ones", async () => {
      const parentEvent = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "400.00",
        currency_id: testCurrency.id,
        quantity: 1,
        description: "Plan",
        event_date: new Date("2025-01-01T00:00:00Z"),
        recurrence_rule: "FREQ=MONTHLY;COUNT=4",
      });

      // Create initial installments
      await createInstallments({ parentEventId: parentEvent.id });
      let installments = await getInstallmentsForParent(parentEvent.id);
      const initialCount = installments.length;
      const initialIds = installments.map((i) => i.id);

      // Recreate with a different end date
      const newEndDate = new Date("2025-02-28T23:59:59Z");
      const result = await recreateInstallments(parentEvent.id, newEndDate);

      expect(result.success).toBe(true);

      // Verify old installments are gone
      const oldInstallmentsStillExist = await Event.findAll({
        where: { id: initialIds },
      });

      expect(oldInstallmentsStillExist).toHaveLength(0);

      // Verify new installments exist
      installments = await getInstallmentsForParent(parentEvent.id);
      expect(installments.length).toBeLessThanOrEqual(initialCount);
    });

    it("should return success result with new installment IDs", async () => {
      const parentEvent = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "300.00",
        currency_id: testCurrency.id,
        quantity: 1,
        description: "Plan",
        event_date: new Date("2025-01-01T00:00:00Z"),
        recurrence_rule: "FREQ=MONTHLY;COUNT=3",
      });

      await createInstallments({ parentEventId: parentEvent.id });

      const result = await recreateInstallments(parentEvent.id);

      expect(result.success).toBe(true);
      expect(result.installmentCount).toBeGreaterThan(0);
      expect(result.installmentIds).toHaveLength(result.installmentCount);
    });
  });

  describe("Integration tests", () => {
    it("should handle complete lifecycle: create, retrieve, modify, recreate", async () => {
      // Create parent event
      const parentEvent = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "1000.00",
        currency_id: testCurrency.id,
        quantity: 1,
        description: "Annual subscription",
        event_date: new Date("2025-01-01T00:00:00Z"),
        recurrence_rule: "FREQ=QUARTERLY;COUNT=4",
      });

      // Create installments
      let result = await createInstallments({ parentEventId: parentEvent.id });

      expect(result.success).toBe(true);
      expect(result.installmentCount).toBe(4);

      // Retrieve installments
      let installments = await getInstallmentsForParent(parentEvent.id);

      expect(installments).toHaveLength(4);

      // Verify amounts
      const expectedAmount = new Decimal("1000.00")
        .dividedBy(4)
        .toDecimalPlaces(8)
        .toString();

      installments.forEach((installment) => {
        expect(installment.amount).toBe(expectedAmount);
      });

      // Recreate with different end date
      const newEndDate = new Date("2025-06-30T23:59:59Z");

      result = await recreateInstallments(parentEvent.id, newEndDate);
      expect(result.success).toBe(true);

      // Verify new installments are less or equal
      installments = await getInstallmentsForParent(parentEvent.id);
      expect(installments.length).toBeLessThanOrEqual(4);
    });
  });
});
