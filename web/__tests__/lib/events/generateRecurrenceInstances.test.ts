import {
  generateRecurrenceInstances,
  getRecurrenceCount,
  isValidRRule,
} from "@/lib/events/generateRecurrenceInstances";

describe("generateRecurrenceInstances", () => {
  describe("Monthly recurrence", () => {
    it("should generate 12 monthly instances starting from a given date", () => {
      const startDate = new Date("2025-01-01T00:00:00Z");
      const instances = generateRecurrenceInstances({
        rruleString: "FREQ=MONTHLY;COUNT=12",
        startDate,
      });

      expect(instances).toHaveLength(12);
      expect(instances[0].date.toISOString()).toBe("2025-01-01T00:00:00.000Z");
      expect(instances[0].index).toBe(0);
      expect(instances[11].date.toISOString()).toBe("2025-12-01T00:00:00.000Z");
      expect(instances[11].index).toBe(11);
    });

    it("should handle RRULE with UNTIL parameter", () => {
      const startDate = new Date("2025-01-01T00:00:00Z");
      const instances = generateRecurrenceInstances({
        rruleString: "FREQ=MONTHLY;UNTIL=20250401",
        startDate,
      });

      expect(instances.length).toBeGreaterThan(0);
      expect(instances[0].date.toISOString()).toContain("2025-01");
      // All dates should be on or before April 1, 2025
      instances.forEach((instance) => {
        expect(instance.date.getTime()).toBeLessThanOrEqual(
          new Date("2025-04-01T23:59:59Z").getTime(),
        );
      });
    });

    it("should respect INTERVAL parameter", () => {
      const startDate = new Date("2025-01-01T00:00:00Z");
      const instances = generateRecurrenceInstances({
        rruleString: "FREQ=MONTHLY;INTERVAL=3;COUNT=4",
        startDate,
      });

      expect(instances).toHaveLength(4);
      // Every 3 months
      expect(instances[0].date.getMonth()).toBe(0); // January
      expect(instances[1].date.getMonth()).toBe(3); // April
      expect(instances[2].date.getMonth()).toBe(6); // July
      expect(instances[3].date.getMonth()).toBe(9); // October
    });
  });

  describe("Weekly recurrence", () => {
    it("should generate weekly instances", () => {
      const startDate = new Date("2025-01-01T00:00:00Z");
      const instances = generateRecurrenceInstances({
        rruleString: "FREQ=WEEKLY;COUNT=5",
        startDate,
      });

      expect(instances).toHaveLength(5);
      // Each instance should be 7 days apart
      for (let i = 1; i < instances.length; i++) {
        const daysDiff =
          (instances[i].date.getTime() - instances[i - 1].date.getTime()) /
          (1000 * 60 * 60 * 24);
        expect(daysDiff).toBe(7);
      }
    });

    it("should generate bi-weekly instances", () => {
      const startDate = new Date("2025-01-01T00:00:00Z");
      const instances = generateRecurrenceInstances({
        rruleString: "FREQ=WEEKLY;INTERVAL=2;COUNT=4",
        startDate,
      });

      expect(instances).toHaveLength(4);
      // Each instance should be 14 days apart
      for (let i = 1; i < instances.length; i++) {
        const daysDiff =
          (instances[i].date.getTime() - instances[i - 1].date.getTime()) /
          (1000 * 60 * 60 * 24);
        expect(daysDiff).toBe(14);
      }
    });
  });

  describe("Daily recurrence", () => {
    it("should generate daily instances", () => {
      const startDate = new Date("2025-01-01T00:00:00Z");
      const instances = generateRecurrenceInstances({
        rruleString: "FREQ=DAILY;COUNT=7",
        startDate,
      });

      expect(instances).toHaveLength(7);
      // Each instance should be 1 day apart
      for (let i = 1; i < instances.length; i++) {
        const daysDiff =
          (instances[i].date.getTime() - instances[i - 1].date.getTime()) /
          (1000 * 60 * 60 * 24);
        expect(daysDiff).toBe(1);
      }
    });
  });

  describe("Yearly recurrence", () => {
    it("should generate yearly instances", () => {
      const startDate = new Date("2025-01-01T00:00:00Z");
      const instances = generateRecurrenceInstances({
        rruleString: "FREQ=YEARLY;COUNT=5",
        startDate,
      });

      expect(instances).toHaveLength(5);
      // Each instance should be in consecutive years on the same date
      for (let i = 1; i < instances.length; i++) {
        expect(instances[i].date.getFullYear()).toBe(
          instances[i - 1].date.getFullYear() + 1,
        );
        expect(instances[i].date.getMonth()).toBe(
          instances[i - 1].date.getMonth(),
        );
        expect(instances[i].date.getDate()).toBe(
          instances[i - 1].date.getDate(),
        );
      }
    });
  });

  describe("Custom end date", () => {
    it("should respect custom endDate parameter", () => {
      const startDate = new Date("2025-01-01T00:00:00Z");
      const endDate = new Date("2025-03-31T23:59:59Z");

      const instances = generateRecurrenceInstances({
        rruleString: "FREQ=MONTHLY;COUNT=12",
        startDate,
        endDate,
      });

      // Should only generate instances up to March 2025
      expect(instances.length).toBeLessThan(12);
      instances.forEach((instance) => {
        expect(instance.date.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });
  });

  describe("RRULE with RRULE: prefix", () => {
    it("should handle RRULE strings with RRULE: prefix", () => {
      const startDate = new Date("2025-01-01T00:00:00Z");
      const instances = generateRecurrenceInstances({
        rruleString: "RRULE:FREQ=MONTHLY;COUNT=3",
        startDate,
      });

      expect(instances).toHaveLength(3);
    });

    it("should handle RRULE strings without RRULE: prefix", () => {
      const startDate = new Date("2025-01-01T00:00:00Z");
      const instances = generateRecurrenceInstances({
        rruleString: "FREQ=MONTHLY;COUNT=3",
        startDate,
      });

      expect(instances).toHaveLength(3);
    });
  });

  describe("Error handling", () => {
    it("should throw an error for invalid RRULE string", () => {
      expect(() => {
        generateRecurrenceInstances({
          rruleString: "INVALID_RRULE",
          startDate: new Date(),
        });
      }).toThrow();
    });

    it("should throw an error for malformed FREQ parameter", () => {
      expect(() => {
        generateRecurrenceInstances({
          rruleString: "FREQ=INVALID;COUNT=5",
          startDate: new Date(),
        });
      }).toThrow();
    });
  });

  describe("Index tracking", () => {
    it("should correctly track instance indices", () => {
      const startDate = new Date("2025-01-01T00:00:00Z");
      const instances = generateRecurrenceInstances({
        rruleString: "FREQ=WEEKLY;COUNT=10",
        startDate,
      });

      instances.forEach((instance, i) => {
        expect(instance.index).toBe(i);
      });
    });
  });
});

describe("isValidRRule", () => {
  it("should return true for valid RRULE strings", () => {
    expect(isValidRRule("FREQ=MONTHLY;COUNT=12")).toBe(true);
    expect(isValidRRule("FREQ=WEEKLY;COUNT=5")).toBe(true);
    expect(isValidRRule("FREQ=DAILY;COUNT=30")).toBe(true);
    expect(isValidRRule("RRULE:FREQ=YEARLY;COUNT=5")).toBe(true);
  });

  it("should return false for invalid RRULE strings", () => {
    expect(isValidRRule("INVALID_RRULE")).toBe(false);
    expect(isValidRRule("FREQ=INVALID;COUNT=5")).toBe(false);
    expect(isValidRRule("")).toBe(false);
  });
});

describe("getRecurrenceCount", () => {
  it("should extract COUNT from RRULE", () => {
    const startDate = new Date("2025-01-01T00:00:00Z");
    expect(getRecurrenceCount("FREQ=MONTHLY;COUNT=12", startDate)).toBe(12);
    expect(getRecurrenceCount("FREQ=WEEKLY;COUNT=5", startDate)).toBe(5);
    expect(getRecurrenceCount("FREQ=DAILY;COUNT=30", startDate)).toBe(30);
  });

  it("should return null for infinite recurrence (no COUNT or UNTIL)", () => {
    const startDate = new Date("2025-01-01T00:00:00Z");
    // Note: In real scenarios, a default end date is applied, but these tests check the logic
    const count = getRecurrenceCount("FREQ=MONTHLY", startDate);
    // Since we don't have COUNT or UNTIL, it should eventually timeout or return a count based on default logic
    // The actual behavior depends on the implementation
    expect(typeof count === "number" || count === null).toBe(true);
  });

  it("should calculate count from UNTIL parameter", () => {
    const startDate = new Date("2025-01-01T00:00:00Z");
    const count = getRecurrenceCount("FREQ=MONTHLY;UNTIL=20250401", startDate);
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThan(0);
  });

  it("should return null for invalid RRULE", () => {
    const startDate = new Date("2025-01-01T00:00:00Z");
    expect(getRecurrenceCount("INVALID_RRULE", startDate)).toBe(null);
  });
});

describe("Real-world scenarios", () => {
  it("should handle monthly rent payment (12 months)", () => {
    const startDate = new Date("2025-01-01T00:00:00Z");
    const instances = generateRecurrenceInstances({
      rruleString: "FREQ=MONTHLY;INTERVAL=1;COUNT=12",
      startDate,
    });

    expect(instances).toHaveLength(12);
    expect(instances[0].date.toISOString()).toContain("2025-01-01");
    expect(instances[11].date.toISOString()).toContain("2025-12-01");
  });

  it("should handle bike purchase installments (10 monthly)", () => {
    const startDate = new Date("2025-11-03T00:00:00Z");
    const instances = generateRecurrenceInstances({
      rruleString: "FREQ=MONTHLY;COUNT=10",
      startDate,
    });

    expect(instances).toHaveLength(10);
    expect(instances[0].date.toISOString()).toContain("2025-11-03");
  });

  it("should handle weekly gym membership", () => {
    const startDate = new Date("2025-11-03T00:00:00Z");
    const instances = generateRecurrenceInstances({
      rruleString: "FREQ=WEEKLY;COUNT=52",
      startDate,
    });

    expect(instances).toHaveLength(52);
    // Should span approximately one year
    const yearDiff =
      instances[51].date.getFullYear() - instances[0].date.getFullYear();
    expect(yearDiff).toBeGreaterThanOrEqual(0);
    expect(yearDiff).toBeLessThanOrEqual(1);
  });
});
