import { Sequelize } from "sequelize";
import { initModels } from "../models";
import { Currency } from "../models/Currency";
import { Event, EventType } from "../models/Event";
import { EventInstallment } from "../models/EventInstallment";

describe("EventInstallment Model", () => {
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
    // Clean up after each test
    await EventInstallment.destroy({ where: {}, force: true });
    await Event.destroy({ where: {}, force: true });
  });

  describe("EventInstallment Creation", () => {
    it("should create an installment relationship", async () => {
      // Create parent event (total amount)
      const parentEvent = await Event.create({
        quantity: 1,
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "1000.00",
        currency_id: testCurrency.id,
        description: "New car tires (Total)",
        event_date: new Date("2025-10-01T00:00:00Z"),
      });

      // Create installment event
      const installmentEvent = await Event.create({
        quantity: 1,
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "100.00",
        currency_id: testCurrency.id,
        description: "New car tires - Installment",
        event_date: new Date("2025-10-01T00:00:00Z"),
        parent_event_id: parentEvent.id,
      });

      // Create installment relationship
      const eventInstallment = await EventInstallment.create({
        parent_event_id: parentEvent.id,
        installment_event_id: installmentEvent.id,
      });

      expect(eventInstallment.id).toBeDefined();
      expect(eventInstallment.parent_event_id).toBe(parentEvent.id);
      expect(eventInstallment.installment_event_id).toBe(installmentEvent.id);
      expect(eventInstallment.created_at).toBeDefined();
    });

    it("should prevent duplicate installment relationships", async () => {
      const parentEvent = await Event.create({
        quantity: 1,
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "1000.00",
        currency_id: testCurrency.id,
        description: "Parent",
        event_date: new Date(),
      });

      const installmentEvent = await Event.create({
        quantity: 1,
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "100.00",
        currency_id: testCurrency.id,
        description: "Installment",
        event_date: new Date(),
        parent_event_id: parentEvent.id,
      });

      await EventInstallment.create({
        parent_event_id: parentEvent.id,
        installment_event_id: installmentEvent.id,
      });

      // Try to create duplicate
      await expect(
        EventInstallment.create({
          parent_event_id: parentEvent.id,
          installment_event_id: installmentEvent.id,
        }),
      ).rejects.toThrow();
    });
  });

  describe("Installment Plan Example", () => {
    it("should create a complete installment plan (10 installments)", async () => {
      // Create parent event
      const parentEvent = await Event.create({
        quantity: 1,
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "1000.00",
        currency_id: testCurrency.id,
        description: "New car tires (Total)",
        event_date: new Date("2025-10-01T00:00:00Z"),
      });

      // Create 10 installment events
      const installmentEvents: Event[] = [];
      for (let i = 0; i < 10; i++) {
        const installmentDate = new Date("2025-10-01T00:00:00Z");
        installmentDate.setMonth(installmentDate.getMonth() + i);

        const installmentEvent = await Event.create({
          quantity: 1,
          user_id: testUserId,
          type: EventType.EXPENSE,
          amount: "100.00",
          currency_id: testCurrency.id,
          description: `New car tires - Installment`,
          event_date: installmentDate,
          parent_event_id: parentEvent.id,
        });

        installmentEvents.push(installmentEvent);

        // Create installment relationship
        await EventInstallment.create({
          parent_event_id: parentEvent.id,
          installment_event_id: installmentEvent.id,
        });
      }

      // Query all installments
      const installments = await EventInstallment.findAll({
        where: { parent_event_id: parentEvent.id },
      });

      expect(installments).toHaveLength(10);
    });

    it("should calculate total installments using COUNT", async () => {
      const parentEvent = await Event.create({
        quantity: 1,
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "1200.00",
        currency_id: testCurrency.id,
        description: "New bike (Total)",
        event_date: new Date(),
      });

      // Create 12 installments
      for (let i = 0; i < 12; i++) {
        const installmentEvent = await Event.create({
          quantity: 1,
          user_id: testUserId,
          type: EventType.EXPENSE,
          amount: "100.00",
          currency_id: testCurrency.id,
          description: "New bike - Installment",
          event_date: new Date(),
          parent_event_id: parentEvent.id,
        });

        await EventInstallment.create({
          parent_event_id: parentEvent.id,
          installment_event_id: installmentEvent.id,
        });
      }

      // Count installments
      const totalInstallments = await EventInstallment.count({
        where: { parent_event_id: parentEvent.id },
      });

      expect(totalInstallments).toBe(12);
    });

    it("should get installment order by event_date", async () => {
      const parentEvent = await Event.create({
        quantity: 1,
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "300.00",
        currency_id: testCurrency.id,
        description: "Payment plan",
        event_date: new Date(),
      });

      // Create 3 installments with different dates
      const dates = [
        new Date("2025-10-01T00:00:00Z"),
        new Date("2025-11-01T00:00:00Z"),
        new Date("2025-12-01T00:00:00Z"),
      ];

      for (const date of dates) {
        const installmentEvent = await Event.create({
          quantity: 1,
          user_id: testUserId,
          type: EventType.EXPENSE,
          amount: "100.00",
          currency_id: testCurrency.id,
          description: "Installment",
          event_date: date,
          parent_event_id: parentEvent.id,
        });

        await EventInstallment.create({
          parent_event_id: parentEvent.id,
          installment_event_id: installmentEvent.id,
        });
      }

      // Query installments with events ordered by date
      const installments = await EventInstallment.findAll({
        where: { parent_event_id: parentEvent.id },
        include: [
          {
            model: Event,
            as: "installmentEvent",
          },
        ],
        order: [[{ model: Event, as: "installmentEvent" }, "event_date", "ASC"]],
      });

      expect(installments).toHaveLength(3);
      expect(installments[0].installmentEvent?.event_date.getUTCMonth()).toBe(9); // October
      expect(installments[1].installmentEvent?.event_date.getUTCMonth()).toBe(10); // November
      expect(installments[2].installmentEvent?.event_date.getUTCMonth()).toBe(11); // December
    });
  });

  describe("Associations", () => {
    it("should load parent event with installment", async () => {
      const parentEvent = await Event.create({
        quantity: 1,
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "500.00",
        currency_id: testCurrency.id,
        description: "Parent event",
        event_date: new Date(),
      });

      const installmentEvent = await Event.create({
        quantity: 1,
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "100.00",
        currency_id: testCurrency.id,
        description: "Installment event",
        event_date: new Date(),
        parent_event_id: parentEvent.id,
      });

      const eventInstallment = await EventInstallment.create({
        parent_event_id: parentEvent.id,
        installment_event_id: installmentEvent.id,
      });

      const installmentWithParent = await EventInstallment.findByPk(eventInstallment.id, {
        include: [{ model: Event, as: "parentEvent" }],
      });

      expect(installmentWithParent?.parentEvent).toBeDefined();
      expect(installmentWithParent?.parentEvent?.description).toBe("Parent event");
      expect(Number(installmentWithParent?.parentEvent?.amount)).toBe(500.0);
    });

    it("should load installment event with relationship", async () => {
      const parentEvent = await Event.create({
        quantity: 1,
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "500.00",
        currency_id: testCurrency.id,
        description: "Parent event",
        event_date: new Date(),
      });

      const installmentEvent = await Event.create({
        quantity: 1,
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "100.00",
        currency_id: testCurrency.id,
        description: "Installment event",
        event_date: new Date(),
        parent_event_id: parentEvent.id,
      });

      const eventInstallment = await EventInstallment.create({
        parent_event_id: parentEvent.id,
        installment_event_id: installmentEvent.id,
      });

      const installmentWithEvent = await EventInstallment.findByPk(eventInstallment.id, {
        include: [{ model: Event, as: "installmentEvent" }],
      });

      expect(installmentWithEvent?.installmentEvent).toBeDefined();
      expect(installmentWithEvent?.installmentEvent?.description).toBe("Installment event");
      expect(Number(installmentWithEvent?.installmentEvent?.amount)).toBe(100.0);
    });
  });

  describe("Cascade Deletes", () => {
    it("should cascade delete installment relationships when parent event is deleted", async () => {
      const parentEvent = await Event.create({
        quantity: 1,
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "300.00",
        currency_id: testCurrency.id,
        description: "Parent",
        event_date: new Date(),
      });

      const installmentEvent = await Event.create({
        quantity: 1,
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "100.00",
        currency_id: testCurrency.id,
        description: "Installment",
        event_date: new Date(),
        parent_event_id: parentEvent.id,
      });

      await EventInstallment.create({
        parent_event_id: parentEvent.id,
        installment_event_id: installmentEvent.id,
      });

      // Delete parent event (force delete to test cascade)
      await parentEvent.destroy({ force: true });

      // Installment relationship should be deleted
      const installments = await EventInstallment.findAll({
        where: { parent_event_id: parentEvent.id },
      });

      expect(installments).toHaveLength(0);
    });
  });

  describe("Complex Queries", () => {
    it("should get all installment events with parent and currency info", async () => {
      const parentEvent = await Event.create({
        quantity: 1,
        user_id: testUserId,
        type: EventType.EXPENSE,
        amount: "600.00",
        currency_id: testCurrency.id,
        description: "Laptop (Total)",
        event_date: new Date(),
      });

      // Create 6 installments
      for (let i = 0; i < 6; i++) {
        const installmentEvent = await Event.create({
          quantity: 1,
          user_id: testUserId,
          type: EventType.EXPENSE,
          amount: "100.00",
          currency_id: testCurrency.id,
          description: "Laptop - Installment",
          event_date: new Date(),
          parent_event_id: parentEvent.id,
        });

        await EventInstallment.create({
          parent_event_id: parentEvent.id,
          installment_event_id: installmentEvent.id,
        });
      }

      // Complex query with all associations
      const installments = await EventInstallment.findAll({
        where: { parent_event_id: parentEvent.id },
        include: [
          {
            model: Event,
            as: "parentEvent",
            include: [{ model: Currency, as: "currency" }],
          },
          {
            model: Event,
            as: "installmentEvent",
            include: [{ model: Currency, as: "currency" }],
          },
        ],
      });

      expect(installments).toHaveLength(6);
      expect(installments[0].parentEvent?.description).toBe("Laptop (Total)");
      expect(installments[0].parentEvent?.currency?.symbol).toBe("USD");
      expect(Number(installments[0].installmentEvent?.amount)).toBe(100.0);
    });
  });
});
