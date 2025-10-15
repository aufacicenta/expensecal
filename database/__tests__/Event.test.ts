import { Sequelize } from "sequelize";
import { initModels } from "../models";
import { Currency } from "../models/Currency";
import { Event, EventType } from "../models/Event";

describe("Event Model", () => {
  let sequelize: Sequelize;
  let testCurrency: Currency;
  const testUserId = "550e8400-e29b-41d4-a716-446655440000";

  beforeAll(async () => {
    // Setup in-memory SQLite database for testing
    sequelize = new Sequelize("sqlite::memory:", {
      logging: false,
    });

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
    // Clean up events after each test
    await Event.destroy({ where: {}, force: true });
  });

  describe("Event Creation", () => {
    it("should create a basic expense event", async () => {
      const event = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "100.50",
        currency_id: testCurrency.id,
        description: "Dinner with friends",
        event_date: new Date("2025-10-15T19:00:00Z"),
      });

      expect(event.id).toBeDefined();
      expect(event.user_id).toBe(testUserId);
      expect(event.type).toBe(EventType.EXPENSE);
      expect(event.amount).toBe("100.50");
      expect(event.currency_id).toBe(testCurrency.id);
      expect(event.description).toBe("Dinner with friends");
      expect(event.parent_event_id).toBeUndefined();
      expect(event.recurrence_rule).toBeUndefined();
      expect(event.deleted_at).toBeUndefined();
    });

    it("should create an income event", async () => {
      const event = await Event.create({
        user_id: testUserId,
        type: EventType.INCOME,
        amount: "5000.00",
        currency_id: testCurrency.id,
        description: "Monthly salary",
        event_date: new Date("2025-10-01T00:00:00Z"),
      });

      expect(event.type).toBe(EventType.INCOME);
      expect(event.amount).toBe("5000.00");
    });

    it("should support crypto precision (8 decimals)", async () => {
      const event = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "0.00123456",
        currency_id: testCurrency.id,
        description: "Bitcoin transaction",
        event_date: new Date("2025-10-15T12:00:00Z"),
      });

      expect(event.amount).toBe("0.00123456");
    });

    it("should require all mandatory fields", async () => {
      await expect(
        Event.create({
          user_id: testUserId,
          type: EventType.EXPENSE,
          // Missing amount
          currency_id: testCurrency.id,
          description: "Test",
          event_date: new Date(),
        } as any),
      ).rejects.toThrow();
    });
  });

  describe("Recurring Events", () => {
    it("should create a parent recurring event", async () => {
      const parentEvent = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "1000.00",
        currency_id: testCurrency.id,
        description: "House rent",
        event_date: new Date("2025-10-01T00:00:00Z"),
        recurrence_rule: "FREQ=MONTHLY;INTERVAL=1;COUNT=12",
        recurrence_end_date: new Date("2026-09-01T00:00:00Z"),
      });

      expect(parentEvent.recurrence_rule).toBe("FREQ=MONTHLY;INTERVAL=1;COUNT=12");
      expect(parentEvent.recurrence_end_date).toBeDefined();
      expect(parentEvent.parent_event_id).toBeUndefined();
    });

    it("should create recurring event instances with parent reference", async () => {
      // Create parent event
      const parentEvent = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "1000.00",
        currency_id: testCurrency.id,
        description: "House rent",
        event_date: new Date("2025-10-01T00:00:00Z"),
        recurrence_rule: "FREQ=MONTHLY;INTERVAL=1;COUNT=3",
      });

      // Create recurring instances
      const instance1 = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "1000.00",
        currency_id: testCurrency.id,
        description: "House rent",
        event_date: new Date("2025-11-01T00:00:00Z"),
        parent_event_id: parentEvent.id,
      });

      const instance2 = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "1000.00",
        currency_id: testCurrency.id,
        description: "House rent",
        event_date: new Date("2025-12-01T00:00:00Z"),
        parent_event_id: parentEvent.id,
      });

      expect(instance1.parent_event_id).toBe(parentEvent.id);
      expect(instance2.parent_event_id).toBe(parentEvent.id);
      expect(instance1.recurrence_rule).toBeUndefined();
      expect(instance2.recurrence_rule).toBeUndefined();
    });

    it("should query all instances of a recurring event", async () => {
      const parentEvent = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "500.00",
        currency_id: testCurrency.id,
        description: "Gym membership",
        event_date: new Date("2025-10-01T00:00:00Z"),
        recurrence_rule: "FREQ=MONTHLY;INTERVAL=1",
      });

      // Create 3 instances
      await Event.bulkCreate([
        {
          user_id: testUserId,
          type: EventType.EXPENSE,
          amount: "500.00",
          currency_id: testCurrency.id,
          description: "Gym membership",
          event_date: new Date("2025-11-01T00:00:00Z"),
          parent_event_id: parentEvent.id,
        },
        {
          user_id: testUserId,
          type: EventType.EXPENSE,
          amount: "500.00",
          currency_id: testCurrency.id,
          description: "Gym membership",
          event_date: new Date("2025-12-01T00:00:00Z"),
          parent_event_id: parentEvent.id,
        },
        {
          user_id: testUserId,
          type: EventType.EXPENSE,
          amount: "500.00",
          currency_id: testCurrency.id,
          description: "Gym membership",
          event_date: new Date("2026-01-01T00:00:00Z"),
          parent_event_id: parentEvent.id,
        },
      ]);

      const instances = await Event.findAll({
        where: { parent_event_id: parentEvent.id },
        order: [["event_date", "ASC"]],
      });

      expect(instances).toHaveLength(3);
      expect(instances[0].event_date.getUTCMonth()).toBe(10); // November (0-indexed)
      expect(instances[1].event_date.getUTCMonth()).toBe(11); // December
      expect(instances[2].event_date.getUTCMonth()).toBe(0); // January
    });
  });

  describe("Associations", () => {
    it("should associate event with currency", async () => {
      const event = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "100.00",
        currency_id: testCurrency.id,
        description: "Test event",
        event_date: new Date(),
      });

      const eventWithCurrency = await Event.findByPk(event.id, {
        include: [{ model: Currency, as: "currency" }],
      });

      expect(eventWithCurrency?.currency).toBeDefined();
      expect(eventWithCurrency?.currency?.symbol).toBe("USD");
      expect(eventWithCurrency?.currency?.name).toBe("US Dollar");
    });

    it("should associate parent event with child events", async () => {
      const parentEvent = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "1000.00",
        currency_id: testCurrency.id,
        description: "Parent event",
        event_date: new Date(),
        recurrence_rule: "FREQ=MONTHLY;INTERVAL=1",
      });

      await Event.bulkCreate([
        {
          user_id: testUserId,
          type: EventType.EXPENSE,
          amount: "1000.00",
          currency_id: testCurrency.id,
          description: "Child event 1",
          event_date: new Date(),
          parent_event_id: parentEvent.id,
        },
        {
          user_id: testUserId,
          type: EventType.EXPENSE,
          amount: "1000.00",
          currency_id: testCurrency.id,
          description: "Child event 2",
          event_date: new Date(),
          parent_event_id: parentEvent.id,
        },
      ]);

      const parentWithChildren = await Event.findByPk(parentEvent.id, {
        include: [{ model: Event, as: "childEvents" }],
      });

      expect(parentWithChildren?.childEvents).toHaveLength(2);
    });
  });

  describe("Soft Deletes", () => {
    it("should soft delete an event", async () => {
      const event = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "100.00",
        currency_id: testCurrency.id,
        description: "To be deleted",
        event_date: new Date(),
      });

      await event.destroy();

      // Should not find with default query
      const foundEvent = await Event.findByPk(event.id);
      expect(foundEvent).toBeNull();

      // Should find with paranoid: false
      const deletedEvent = await Event.findByPk(event.id, { paranoid: false });
      expect(deletedEvent).toBeDefined();
      expect(deletedEvent?.deleted_at).toBeDefined();
    });

    it("should restore a soft-deleted event", async () => {
      const event = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "100.00",
        currency_id: testCurrency.id,
        description: "To be restored",
        event_date: new Date(),
      });

      await event.destroy();
      await event.restore();

      const restoredEvent = await Event.findByPk(event.id);
      expect(restoredEvent).toBeDefined();
      expect(restoredEvent?.deleted_at).toBeNull();
    });

    it("should permanently delete with force option", async () => {
      const event = await Event.create({
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "100.00",
        currency_id: testCurrency.id,
        description: "To be permanently deleted",
        event_date: new Date(),
      });

      await event.destroy({ force: true });

      const deletedEvent = await Event.findByPk(event.id, { paranoid: false });
      expect(deletedEvent).toBeNull();
    });
  });

  describe("Queries and Filters", () => {
    beforeEach(async () => {
      // Create test events
      await Event.bulkCreate([
        {
          user_id: testUserId,
          type: EventType.EXPENSE,
          amount: "100.00",
          currency_id: testCurrency.id,
          description: "Event 1",
          event_date: new Date("2025-10-01T00:00:00Z"),
        },
        {
          user_id: testUserId,
          type: EventType.EXPENSE,
          amount: "200.00",
          currency_id: testCurrency.id,
          description: "Event 2",
          event_date: new Date("2025-10-15T00:00:00Z"),
        },
        {
          user_id: testUserId,
          type: EventType.INCOME,
          amount: "5000.00",
          currency_id: testCurrency.id,
          description: "Event 3",
          event_date: new Date("2025-10-20T00:00:00Z"),
        },
      ]);
    });

    it("should filter events by user_id", async () => {
      const events = await Event.findAll({
        where: { user_id: testUserId },
      });

      expect(events).toHaveLength(3);
    });

    it("should filter events by type", async () => {
      const expenses = await Event.findAll({
        where: { type: EventType.EXPENSE },
      });

      const income = await Event.findAll({
        where: { type: EventType.INCOME },
      });

      expect(expenses).toHaveLength(2);
      expect(income).toHaveLength(1);
    });

    it("should filter events by date range", async () => {
      const { Op } = require("sequelize");
      const events = await Event.findAll({
        where: {
          event_date: {
            [Op.between]: [new Date("2025-10-01"), new Date("2025-10-16")],
          },
        },
      });

      expect(events).toHaveLength(2);
    });

    it("should sort events by date", async () => {
      const events = await Event.findAll({
        order: [["event_date", "ASC"]],
      });

      expect(events[0].description).toBe("Event 1");
      expect(events[1].description).toBe("Event 2");
      expect(events[2].description).toBe("Event 3");
    });
  });
});
