import Decimal from "decimal.js";

import {
  addEventToStats,
  applyCarryForwardAndRecalculate,
  calculateNetFromSummary,
  calculatePercentChange,
  convertAmount,
  recalculateNetsAfterUpdate,
  subtractEventFromStats,
} from "@/lib/calendar/stats";
import { CalendarStatsData, MonthStats } from "@/app/api/v2/calendar/types";

// Mock the exchange rate service
jest.mock("@/lib/exchange-rates/exchangeRateService", () => ({
  convertCurrency: jest.fn((amount, rate, base) => {
    // Simple mock: amount / rate * base
    const a = new Decimal(amount);
    const r = new Decimal(rate);
    const b = new Decimal(base);

    return a.dividedBy(r).times(b).toString();
  }),
}));

describe("Calendar Stats Functions", () => {
  describe("calculateNetFromSummary", () => {
    it("should calculate net correctly with positive values", () => {
      const net = calculateNetFromSummary("100.50", "30.25");

      expect(net).toBe("70.25");
    });

    it("should calculate net as negative when expenses exceed income", () => {
      const net = calculateNetFromSummary("30.25", "100.50");

      expect(net).toBe("-70.25");
    });

    it("should handle zero values", () => {
      expect(calculateNetFromSummary("0", "0")).toBe("0");
      expect(calculateNetFromSummary("100", "0")).toBe("100");
      expect(calculateNetFromSummary("0", "100")).toBe("-100");
    });

    it("should handle large decimal precision", () => {
      const net = calculateNetFromSummary("1234.567890123", "567.890123456");

      expect(net).toBe("666.677766667");
    });
  });

  describe("convertAmount", () => {
    it("should return amount unchanged when currencies match", () => {
      const exchangeRates = new Map([["USD", "1"]]);
      const amount = new Decimal("100");
      const result = convertAmount(amount, "USD", "USD", exchangeRates);

      expect(result.toString()).toBe("100");
    });

    it("should return amount unchanged for UNKNOWN currency", () => {
      const exchangeRates = new Map([["USD", "1"]]);
      const amount = new Decimal("100");
      const result = convertAmount(amount, "UNKNOWN", "USD", exchangeRates);

      expect(result.toString()).toBe("100");
    });

    it("should convert amount when rate is available", () => {
      const exchangeRates = new Map([["EUR", "1.2"]]);
      const amount = new Decimal("100");
      const result = convertAmount(amount, "EUR", "USD", exchangeRates);

      // 100 / 1.2 * 1 = 83.33...
      expect(parseFloat(result.toString())).toBeCloseTo(83.333, 2);
    });

    it("should return unconverted amount when rate not found", () => {
      const exchangeRates = new Map([["UNKNOWN", "1"]]);
      const amount = new Decimal("100");
      const result = convertAmount(amount, "JPY", "USD", exchangeRates);

      expect(result.toString()).toBe("100");
    });
  });

  describe("calculatePercentChange", () => {
    it("should return 0 for first period", () => {
      const change = calculatePercentChange("100", undefined);

      expect(change).toBe("0.0");
    });

    it("should calculate percentage increase correctly", () => {
      const change = calculatePercentChange("100", "80");

      expect(change).toBe("25");
    });

    it("should calculate percentage decrease correctly", () => {
      const change = calculatePercentChange("80", "100");

      expect(change).toBe("-20");
    });

    it("should return 0 when previous value is zero", () => {
      const change = calculatePercentChange("100", "0");

      expect(change).toBe("0.0");
    });

    it("should handle decimal values", () => {
      const change = calculatePercentChange("115.5", "100");

      expect(change).toBe("15.5");
    });

    it("should return exactly 2 decimal places", () => {
      const change = calculatePercentChange("100.123", "100");

      // (100.123 - 100) / 100 * 100 = 0.123%
      expect(change).toBe("0.12");
    });

    it("should handle negative current values", () => {
      const change = calculatePercentChange("-100", "100");

      // (-100 - 100) / 100 * 100 = -200%
      expect(change).toBe("-200");
    });

    it("should handle negative previous values", () => {
      const change = calculatePercentChange("100", "-100");

      // (100 - (-100)) / (-100) * 100 = -200%
      expect(change).toBe("-200");
    });

    it("should handle negative to negative change", () => {
      const change = calculatePercentChange("-50", "-100");

      // (-50 - (-100)) / (-100) * 100 = 50 / -100 * 100 = -50%
      expect(change).toBe("-50");
    });

    it("should handle very small percentage changes", () => {
      const change = calculatePercentChange("100.001", "100");

      // (100.001 - 100) / 100 * 100 = 0.001%, rounds to 0.00%
      expect(change).toBe("0");
    });

    it("should handle large percentage increases", () => {
      const change = calculatePercentChange("10000", "100");

      // (10000 - 100) / 100 * 100 = 9900%
      expect(change).toBe("9900");
    });

    it("should handle large percentage decreases", () => {
      const change = calculatePercentChange("1", "1000");

      // (1 - 1000) / 1000 * 100 = -99.9%
      expect(change).toBe("-99.9");
    });

    it("should handle zero current value with positive previous", () => {
      const change = calculatePercentChange("0", "100");

      // (0 - 100) / 100 * 100 = -100%
      expect(change).toBe("-100");
    });

    it("should maintain precision through calculations", () => {
      const change = calculatePercentChange("1234.5678", "1000.1234");

      // (1234.5678 - 1000.1234) / 1000.1234 * 100 ≈ 23.44%
      expect(parseFloat(change)).toBeCloseTo(23.44, 1);
    });

    it("should use exact rounding to 2 decimal places (banker's rounding)", () => {
      // Test edge case where rounding matters
      const change = calculatePercentChange("100.5", "100");

      // (100.5 - 100) / 100 * 100 = 0.5%
      expect(change).toBe("0.5");
    });

    it("should have consistent decimal place representation", () => {
      // Check that decimal formatting is consistent
      const change1 = calculatePercentChange("100", "100");
      const change2 = calculatePercentChange("100", "99");
      const change3 = calculatePercentChange("100", "80");

      // This test reveals the actual Decimal.js behavior
      expect(change1).toBe("0");
      expect(parseFloat(change2)).toBeCloseTo(1.0101, 3);
      expect(change3).toBe("25");
    });

    it("should handle returns from toDecimalPlaces correctly", () => {
      // Direct test of the potential issue: does toDecimalPlaces drop trailing zeros?
      const test1 = new Decimal("0").toDecimalPlaces(2).toString(); // "0" or "0.00"?
      const test2 = new Decimal("0.5").toDecimalPlaces(2).toString(); // "0.5" or "0.50"?
      const test3 = new Decimal("1").toDecimalPlaces(2).toString(); // "1" or "1.00"?

      // These assertions document Decimal.js behavior
      // toDecimalPlaces doesn't add trailing zeros by default
      expect(test1).toBe("0");
      expect(test2).toBe("0.5");
      expect(test3).toBe("1");
    });
  });

  describe("addEventToStats", () => {
    it("should add income event to stats at all levels", () => {
      const stats: CalendarStatsData = {
        "2025": {
          stats: {
            totalIncome: "0",
            totalExpenses: "0",
            net: "0",
          },
          "01": {
            stats: {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
            "15": {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
          },
        },
      };

      addEventToStats(stats, new Decimal("100"), "INCOME", "2025", "01", "15");

      expect(stats["2025"].stats.totalIncome).toBe("100");
      expect((stats["2025"]["01"] as MonthStats).stats.totalIncome).toBe("100");
      expect((stats["2025"]["01"] as MonthStats)["15"].totalIncome).toBe("100");
    });

    it("should add expense event to stats at all levels", () => {
      const stats: CalendarStatsData = {
        "2025": {
          stats: {
            totalIncome: "0",
            totalExpenses: "0",
            net: "0",
          },
          "01": {
            stats: {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
            "15": {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
          },
        },
      };

      addEventToStats(stats, new Decimal("50"), "EXPENSE", "2025", "01", "15");

      expect(stats["2025"].stats.totalExpenses).toBe("50");
      expect((stats["2025"]["01"] as MonthStats).stats.totalExpenses).toBe(
        "50",
      );
      expect((stats["2025"]["01"] as MonthStats)["15"].totalExpenses).toBe(
        "50",
      );
    });

    it("should accumulate multiple events", () => {
      const stats: CalendarStatsData = {
        "2025": {
          stats: {
            totalIncome: "100",
            totalExpenses: "30",
            net: "0",
          },
          "01": {
            stats: {
              totalIncome: "100",
              totalExpenses: "30",
              net: "0",
            },
            "15": {
              totalIncome: "100",
              totalExpenses: "30",
              net: "0",
            },
          },
        },
      };

      addEventToStats(stats, new Decimal("50"), "INCOME", "2025", "01", "15");

      expect(stats["2025"].stats.totalIncome).toBe("150");
      expect((stats["2025"]["01"] as MonthStats).stats.totalIncome).toBe("150");
      expect((stats["2025"]["01"] as MonthStats)["15"].totalIncome).toBe("150");
    });

    it("should return FinancialSummary with string values after adding events", () => {
      const stats: CalendarStatsData = {
        "2025": {
          stats: {
            totalIncome: "0",
            totalExpenses: "0",
            net: "0",
          },
          "01": {
            stats: {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
            "15": {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
          },
        },
      };

      addEventToStats(
        stats,
        new Decimal("100.50"),
        "INCOME",
        "2025",
        "01",
        "15",
      );
      addEventToStats(
        stats,
        new Decimal("30.25"),
        "EXPENSE",
        "2025",
        "01",
        "15",
      );

      const dayStats = (stats["2025"]["01"] as MonthStats)["15"];

      expect(typeof dayStats.totalIncome).toBe("string");
      expect(typeof dayStats.totalExpenses).toBe("string");
      expect(dayStats.totalIncome).toBe("100.5");
      expect(dayStats.totalExpenses).toBe("30.25");
    });
  });

  describe("subtractEventFromStats", () => {
    it("should subtract income event from stats", () => {
      const stats: CalendarStatsData = {
        "2025": {
          stats: {
            totalIncome: "100",
            totalExpenses: "0",
            net: "0",
          },
          "01": {
            stats: {
              totalIncome: "100",
              totalExpenses: "0",
              net: "0",
            },
            "15": {
              totalIncome: "100",
              totalExpenses: "0",
              net: "0",
            },
          },
        },
      };

      subtractEventFromStats(
        stats,
        new Decimal("30"),
        "INCOME",
        "2025",
        "01",
        "15",
      );

      expect(stats["2025"].stats.totalIncome).toBe("70");
      expect((stats["2025"]["01"] as MonthStats).stats.totalIncome).toBe("70");
      expect((stats["2025"]["01"] as MonthStats)["15"].totalIncome).toBe("70");
    });

    it("should subtract expense event from stats", () => {
      const stats: CalendarStatsData = {
        "2025": {
          stats: {
            totalIncome: "0",
            totalExpenses: "50",
            net: "0",
          },
          "01": {
            stats: {
              totalIncome: "0",
              totalExpenses: "50",
              net: "0",
            },
            "15": {
              totalIncome: "0",
              totalExpenses: "50",
              net: "0",
            },
          },
        },
      };

      subtractEventFromStats(
        stats,
        new Decimal("20"),
        "EXPENSE",
        "2025",
        "01",
        "15",
      );

      expect(stats["2025"].stats.totalExpenses).toBe("30");
      expect((stats["2025"]["01"] as MonthStats).stats.totalExpenses).toBe(
        "30",
      );
      expect((stats["2025"]["01"] as MonthStats)["15"].totalExpenses).toBe(
        "30",
      );
    });
  });

  describe("recalculateNetsAfterUpdate", () => {
    it("should recalculate nets correctly", () => {
      const stats: CalendarStatsData = {
        "2025": {
          stats: {
            totalIncome: "100",
            totalExpenses: "30",
            net: "0",
          },
          "01": {
            stats: {
              totalIncome: "100",
              totalExpenses: "30",
              net: "0",
            },
            "15": {
              totalIncome: "100",
              totalExpenses: "30",
              net: "0",
            },
          },
        },
      };

      recalculateNetsAfterUpdate(stats, "2025", "01", "15");

      expect(stats["2025"].stats.net).toBe("70");
      expect((stats["2025"]["01"] as MonthStats).stats.net).toBe("70");
      expect((stats["2025"]["01"] as MonthStats)["15"].net).toBe("70");
    });

    it("should handle negative nets", () => {
      const stats: CalendarStatsData = {
        "2025": {
          stats: {
            totalIncome: "30",
            totalExpenses: "100",
            net: "0",
          },
          "01": {
            stats: {
              totalIncome: "30",
              totalExpenses: "100",
              net: "0",
            },
            "15": {
              totalIncome: "30",
              totalExpenses: "100",
              net: "0",
            },
          },
        },
      };

      recalculateNetsAfterUpdate(stats, "2025", "01", "15");

      expect(stats["2025"].stats.net).toBe("-70");
      expect((stats["2025"]["01"] as MonthStats).stats.net).toBe("-70");
      expect((stats["2025"]["01"] as MonthStats)["15"].net).toBe("-70");
    });

    it("should return FinancialSummary with string values", () => {
      const stats: CalendarStatsData = {
        "2025": {
          stats: {
            totalIncome: "123.45",
            totalExpenses: "67.89",
            net: "0",
          },
          "01": {
            stats: {
              totalIncome: "123.45",
              totalExpenses: "67.89",
              net: "0",
            },
            "15": {
              totalIncome: "123.45",
              totalExpenses: "67.89",
              net: "0",
            },
          },
        },
      };

      recalculateNetsAfterUpdate(stats, "2025", "01", "15");

      const dayStats = (stats["2025"]["01"] as MonthStats)["15"];

      expect(typeof dayStats.net).toBe("string");
      expect(dayStats.net).toBe("55.56");
    });
  });

  describe("applyCarryForwardAndRecalculate", () => {
    it("should apply day-level carry-forward", () => {
      const stats: CalendarStatsData = {
        "2025": {
          stats: {
            totalIncome: "0",
            totalExpenses: "0",
            net: "0",
          },
          "01": {
            stats: {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
            "15": {
              totalIncome: "50",
              totalExpenses: "10",
              net: "40",
            },
            "16": {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
          },
        },
      };

      applyCarryForwardAndRecalculate(
        stats,
        "2025",
        "01",
        "16",
        undefined,
        undefined,
        "40",
      );

      const dayStats = (stats["2025"]["01"] as MonthStats)["16"];

      expect(dayStats.totalIncome).toBe("40");
      expect(dayStats.net).toBe("40");
    });

    it("should apply month-level carry-forward", () => {
      const stats: CalendarStatsData = {
        "2025": {
          stats: {
            totalIncome: "0",
            totalExpenses: "0",
            net: "0",
          },
          "01": {
            stats: {
              totalIncome: "100",
              totalExpenses: "30",
              net: "70",
            },
          },
          "02": {
            stats: {
              totalIncome: "50",
              totalExpenses: "20",
              net: "0",
            },
            "01": {
              totalIncome: "50",
              totalExpenses: "20",
              net: "0",
            },
          },
        },
      };

      applyCarryForwardAndRecalculate(
        stats,
        "2025",
        "02",
        "01",
        undefined,
        "70",
        undefined,
      );

      expect((stats["2025"]["02"] as MonthStats).stats.totalIncome).toBe("120");
      expect((stats["2025"]["02"] as MonthStats).stats.net).toBe("100");
    });

    it("should apply year-level carry-forward", () => {
      const stats: CalendarStatsData = {
        "2025": {
          stats: {
            totalIncome: "100",
            totalExpenses: "30",
            net: "70",
          },
        },
        "2026": {
          stats: {
            totalIncome: "50",
            totalExpenses: "20",
            net: "0",
          },
          "01": {
            stats: {
              totalIncome: "50",
              totalExpenses: "20",
              net: "0",
            },
            "01": {
              totalIncome: "50",
              totalExpenses: "20",
              net: "0",
            },
          },
        },
      };

      applyCarryForwardAndRecalculate(
        stats,
        "2026",
        "01",
        "01",
        "70",
        undefined,
        undefined,
      );

      expect(stats["2026"].stats.totalIncome).toBe("120");
      expect(stats["2026"].stats.net).toBe("100");
    });
  });

  describe("Integration: Full workflow", () => {
    it("should process events and produce correct FinancialSummary", () => {
      // Initialize stats structure
      const stats: CalendarStatsData = {
        "2025": {
          stats: {
            totalIncome: "0",
            totalExpenses: "0",
            net: "0",
          },
          "01": {
            stats: {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
            "15": {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
          },
        },
      };

      // Add income event
      addEventToStats(
        stats,
        new Decimal("1000.50"),
        "INCOME",
        "2025",
        "01",
        "15",
      );
      addEventToStats(
        stats,
        new Decimal("250.75"),
        "EXPENSE",
        "2025",
        "01",
        "15",
      );

      // Recalculate nets
      recalculateNetsAfterUpdate(stats, "2025", "01", "15");

      // Verify FinancialSummary structure and values
      const dayStats = (stats["2025"]["01"] as MonthStats)["15"];

      expect(dayStats.totalIncome).toBe("1000.5");
      expect(dayStats.totalExpenses).toBe("250.75");
      expect(dayStats.net).toBe("749.75");

      const monthStats = (stats["2025"]["01"] as MonthStats).stats;

      expect(monthStats.totalIncome).toBe("1000.5");
      expect(monthStats.totalExpenses).toBe("250.75");
      expect(monthStats.net).toBe("749.75");

      const yearStats = stats["2025"].stats;

      expect(yearStats.totalIncome).toBe("1000.5");
      expect(yearStats.totalExpenses).toBe("250.75");
      expect(yearStats.net).toBe("749.75");

      // All values should be strings
      expect(typeof dayStats.totalIncome).toBe("string");
      expect(typeof dayStats.totalExpenses).toBe("string");
      expect(typeof dayStats.net).toBe("string");
    });

    it("should handle multi-day scenario with carry-forward", () => {
      const stats: CalendarStatsData = {
        "2025": {
          stats: {
            totalIncome: "0",
            totalExpenses: "0",
            net: "0",
          },
          "01": {
            stats: {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
            "14": {
              totalIncome: "500",
              totalExpenses: "100",
              net: "400",
            },
            "15": {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
          },
        },
      };

      // Apply carry-forward from day 14 to day 15
      applyCarryForwardAndRecalculate(
        stats,
        "2025",
        "01",
        "15",
        undefined,
        undefined,
        "400",
      );

      // Add new events on day 15
      addEventToStats(stats, new Decimal("200"), "INCOME", "2025", "01", "15");
      recalculateNetsAfterUpdate(stats, "2025", "01", "15");

      // Day 15 should have carried-forward amount + new income
      const day15Stats = (stats["2025"]["01"] as MonthStats)["15"];

      expect(day15Stats.totalIncome).toBe("600");
      expect(day15Stats.net).toBe("600");

      // Recalculate month from days
      let monthIncome = new Decimal(0);
      let monthExpenses = new Decimal(0);

      const day14 = (stats["2025"]["01"] as MonthStats)["14"];
      const day15 = (stats["2025"]["01"] as MonthStats)["15"];

      monthIncome = monthIncome.plus(day14.totalIncome).plus(day15.totalIncome);
      monthExpenses = monthExpenses
        .plus(day14.totalExpenses)
        .plus(day15.totalExpenses);

      (stats["2025"]["01"] as MonthStats).stats.totalIncome =
        monthIncome.toString();
      (stats["2025"]["01"] as MonthStats).stats.totalExpenses =
        monthExpenses.toString();
      (stats["2025"]["01"] as MonthStats).stats.net = calculateNetFromSummary(
        monthIncome.toString(),
        monthExpenses.toString(),
      );

      expect((stats["2025"]["01"] as MonthStats).stats.totalIncome).toBe(
        "1100",
      );
      expect((stats["2025"]["01"] as MonthStats).stats.totalExpenses).toBe(
        "100",
      );
      expect((stats["2025"]["01"] as MonthStats).stats.net).toBe("1000");
    });
  });

  describe("Real-world scenarios with Event data (replicating route.ts flow)", () => {
    /**
     * This test suite demonstrates how the calendar route processes actual Event data
     * and builds the CalendarStatsData structure with carry-forward logic.
     *
     * Flow in route.ts:
     * 1. Fetch events from database (sorted by event_date ASC)
     * 2. For each event, initialize year/month/day structures
     * 3. Detect boundaries (year, month, day transitions) and apply carry-forward
     * 4. Convert event amount based on currency and exchange rates
     * 5. Add event to stats at all levels
     * 6. Recalculate nets
     */

    it("should simulate single-day event processing with currency conversion", () => {
      /**
       * Scenario: User has one income event on 2025-01-15 in EUR
       * Expected: Event converted to USD, stats calculated at all levels
       */
      const stats: CalendarStatsData = {};
      const exchangeRates = new Map([["EUR", "1.1"]]);
      const baseCurrency = "USD";

      // Simulate processing first event
      const year = "2025";
      const month = "01";
      const day = "15";

      // Initialize structures (as done in route.ts)
      if (!stats[year]) {
        stats[year] = {
          stats: {
            totalIncome: "0",
            totalExpenses: "0",
            net: "0",
          },
        };
      }

      if (!(stats[year] as any)[month]) {
        (stats[year] as any)[month] = {
          stats: {
            totalIncome: "0",
            totalExpenses: "0",
            net: "0",
          },
        };
      }

      if (!(stats[year] as any)[month][day]) {
        (stats[year] as any)[month][day] = {
          totalIncome: "0",
          totalExpenses: "0",
          net: "0",
        };
      }

      // Simulate event: 100 EUR income (amount) × 1 (quantity) = 100 EUR
      const eventAmount = new Decimal("100");
      const quantity = 1;
      const totalAmount = eventAmount.times(quantity);

      // Convert from EUR to USD: 100 EUR / 1.1 = ~90.91 USD
      const convertedAmount = convertAmount(
        totalAmount,
        "EUR",
        baseCurrency,
        exchangeRates,
      );

      // Add to stats
      addEventToStats(stats, convertedAmount, "INCOME", year, month, day);
      recalculateNetsAfterUpdate(stats, year, month, day);

      // Verify conversions and calculations
      const dayStats = (stats[year][month] as MonthStats)[day];

      expect(parseFloat(dayStats.totalIncome)).toBeCloseTo(90.909, 2);
      expect(dayStats.totalExpenses).toBe("0");
      expect(parseFloat(dayStats.net)).toBeCloseTo(90.909, 2);

      const monthStats = (stats[year][month] as MonthStats).stats;

      expect(parseFloat(monthStats.totalIncome)).toBeCloseTo(90.909, 2);
      expect(parseFloat(monthStats.net)).toBeCloseTo(90.909, 2);

      const yearStats = stats[year].stats;

      expect(parseFloat(yearStats.totalIncome)).toBeCloseTo(90.909, 2);
      expect(parseFloat(yearStats.net)).toBeCloseTo(90.909, 2);
    });

    it("should simulate multi-day carry-forward with mixed events", () => {
      /**
       * Scenario: Multiple events across two days in same month
       * Day 1 (Jan 15): 500 USD income, 100 USD expense → net = 400
       * Day 2 (Jan 16): Carry-forward 400, add 200 USD expense → net = 200
       *
       * Expected cascade:
       * - Day 15 net: 400
       * - Day 16 net: 400 (carried) - 200 = 200
       * - Month net: 500 - 300 = 200 (sum of day totals)
       * - Year net: 200
       */
      const stats: CalendarStatsData = {
        "2025": {
          stats: {
            totalIncome: "0",
            totalExpenses: "0",
            net: "0",
          },
          "01": {
            stats: {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
          },
        },
      };

      const exchangeRates = new Map([["USD", "1"]]);

      // DAY 1: January 15
      (stats["2025"]["01"] as any)["15"] = {
        totalIncome: "0",
        totalExpenses: "0",
        net: "0",
      };

      // Event 1: 500 USD income
      addEventToStats(
        stats,
        convertAmount(new Decimal("500"), "USD", "USD", exchangeRates),
        "INCOME",
        "2025",
        "01",
        "15",
      );

      // Event 2: 100 USD expense
      addEventToStats(
        stats,
        convertAmount(new Decimal("100"), "USD", "USD", exchangeRates),
        "EXPENSE",
        "2025",
        "01",
        "15",
      );

      recalculateNetsAfterUpdate(stats, "2025", "01", "15");

      const day15 = (stats["2025"]["01"] as MonthStats)["15"];

      expect(day15.totalIncome).toBe("500");
      expect(day15.totalExpenses).toBe("100");
      expect(day15.net).toBe("400");

      // DAY 2: January 16 - Boundary detected, apply carry-forward
      (stats["2025"]["01"] as any)["16"] = {
        totalIncome: "0",
        totalExpenses: "0",
        net: "0",
      };

      // Apply day-level carry-forward (day 15 net → day 16 income)
      applyCarryForwardAndRecalculate(
        stats,
        "2025",
        "01",
        "16",
        undefined,
        undefined,
        "400",
      );

      // Event 3: 200 USD expense on day 16
      addEventToStats(
        stats,
        convertAmount(new Decimal("200"), "USD", "USD", exchangeRates),
        "EXPENSE",
        "2025",
        "01",
        "16",
      );

      recalculateNetsAfterUpdate(stats, "2025", "01", "16");

      const day16 = (stats["2025"]["01"] as MonthStats)["16"];

      expect(day16.totalIncome).toBe("400"); // Carried forward
      expect(day16.totalExpenses).toBe("200");
      expect(day16.net).toBe("200");

      // Update month totals (sum of all days in month)
      const monthStats = (stats["2025"]["01"] as MonthStats).stats;
      const monthIncome = new Decimal(day15.totalIncome).plus(
        day16.totalIncome,
      );
      const monthExpenses = new Decimal(day15.totalExpenses).plus(
        day16.totalExpenses,
      );

      monthStats.totalIncome = monthIncome.toString();
      monthStats.totalExpenses = monthExpenses.toString();
      monthStats.net = calculateNetFromSummary(
        monthIncome.toString(),
        monthExpenses.toString(),
      );

      expect(monthStats.totalIncome).toBe("900");
      expect(monthStats.totalExpenses).toBe("300");
      expect(monthStats.net).toBe("600");

      // Update year totals
      const yearStats = stats["2025"].stats;

      yearStats.totalIncome = monthIncome.toString();
      yearStats.totalExpenses = monthExpenses.toString();
      yearStats.net = calculateNetFromSummary(
        monthIncome.toString(),
        monthExpenses.toString(),
      );

      expect(yearStats.totalIncome).toBe("900");
      expect(yearStats.totalExpenses).toBe("300");
      expect(yearStats.net).toBe("600");
    });

    it("should simulate day and month carry-forward scenarios", () => {
      /**
       * Simplified scenario demonstrating carry-forward at different levels:
       * - Day 1 (Jan 15): 1000 income → net = 1000
       * - Day 2 (Jan 16): BOUNDARY - carry day 1 net, add 500 expense
       * - Month 2 (Feb 01): BOUNDARY - carry month 1 net, add 200 income
       *
       * Key learning: Carry-forward applies at the specified level only,
       * not automatically cascading to child levels.
       */
      const stats: CalendarStatsData = {
        "2025": {
          stats: {
            totalIncome: "0",
            totalExpenses: "0",
            net: "0",
          },
          "01": {
            stats: {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
          },
          "02": {
            stats: {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
          },
        },
      };

      // DAY 1: Jan 15 - 1000 income
      (stats["2025"]["01"] as any)["15"] = {
        totalIncome: "0",
        totalExpenses: "0",
        net: "0",
      };

      addEventToStats(stats, new Decimal("1000"), "INCOME", "2025", "01", "15");
      recalculateNetsAfterUpdate(stats, "2025", "01", "15");

      expect((stats["2025"]["01"] as MonthStats)["15"].net).toBe("1000");

      // DAY 2: Jan 16 - BOUNDARY
      (stats["2025"]["01"] as any)["16"] = {
        totalIncome: "0",
        totalExpenses: "0",
        net: "0",
      };

      // Carry-forward day 1 net to day 2 income
      applyCarryForwardAndRecalculate(
        stats,
        "2025",
        "01",
        "16",
        undefined,
        undefined,
        "1000", // prevDayNet
      );

      // Day 2 now has carried income from day 1
      expect((stats["2025"]["01"] as MonthStats)["16"].totalIncome).toBe(
        "1000",
      );

      // Add expense on day 2
      addEventToStats(stats, new Decimal("500"), "EXPENSE", "2025", "01", "16");
      recalculateNetsAfterUpdate(stats, "2025", "01", "16");

      expect((stats["2025"]["01"] as MonthStats)["16"].totalExpenses).toBe(
        "500",
      );
      expect((stats["2025"]["01"] as MonthStats)["16"].net).toBe("500");

      // MONTH 2: Feb 01 - BOUNDARY
      // First, set the month 1 net correctly
      (stats["2025"]["01"] as MonthStats).stats.totalIncome = "2000"; // 1000 + 1000 from days
      (stats["2025"]["01"] as MonthStats).stats.totalExpenses = "500";
      (stats["2025"]["01"] as MonthStats).stats.net = "1500";

      (stats["2025"]["02"] as any)["01"] = {
        totalIncome: "0",
        totalExpenses: "0",
        net: "0",
      };

      // Carry-forward month 1 net to month 2 income
      applyCarryForwardAndRecalculate(
        stats,
        "2025",
        "02",
        "01",
        undefined,
        "1500", // prevMonthNet
        undefined,
      );

      // Month 2 stats now have carried income
      expect((stats["2025"]["02"] as MonthStats).stats.totalIncome).toBe(
        "1500",
      );

      // Add income on day 01 of month 2
      addEventToStats(stats, new Decimal("200"), "INCOME", "2025", "02", "01");
      recalculateNetsAfterUpdate(stats, "2025", "02", "01");

      // Day level has the new event only
      expect((stats["2025"]["02"] as MonthStats)["01"].totalIncome).toBe("200");

      // After addEventToStats: month should have 1500 (carry-forward) + 200 (event) = 1700
      const month02_income = (stats["2025"]["02"] as MonthStats).stats
        .totalIncome;

      expect(month02_income).toBe("1700"); // 1500 + 200
    });

    it("should demonstrate the percentage change bug in route.ts", () => {
      /**
       * CRITICAL BUG: In route.ts, calculatePercentChange is called AFTER applyCarryForwardAndRecalculate
       *
       * Current flow (WRONG):
       * 1. Start new period with stats = { income: 0, expenses: 0, net: 0 }
       * 2. Call applyCarryForwardAndRecalculate -> stats = { income: prevNet, expenses: 0, net: prevNet }
       * 3. Call calculatePercentChange(newStats.income, prevStats.income)
       *    → This compares (prevNet + 0) vs prevStats.income, NOT 0 vs prevStats.income
       *
       * Expected flow (CORRECT):
       * 1. Calculate percentage change based on ORIGINAL period stats
       * 2. Then apply carry-forward
       *
       * Example scenario:
       * - Year 2025: Income=1000, Expenses=0, Net=1000
       * - Year 2026 starts: Income=0, Expenses=0, Net=0
       * - Current bug: calculatePercentChange("0", "1000") = -100% ✓ CORRECT BY ACCIDENT
       * - But this should be 0% (first period) because no events happened yet
       *
       * Better example:
       * - Day 1: Income=500, Expenses=100, Net=400
       * - Day 2 starts: Income=0, Expenses=0, Net=0
       * - applyCarryForward: Day 2 Income becomes 400 (carried from Day 1 net)
       * - calculatePercentChange("400", "500") = -20% ✗ WRONG!
       * - Should be: 0% (no events on day 2 yet) or undefined
       */

      const stats: CalendarStatsData = {
        "2025": {
          stats: {
            totalIncome: "0",
            totalExpenses: "0",
            net: "0",
          },
          "01": {
            stats: {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
          },
        },
      };

      // Day 1: 500 income, 100 expense
      (stats["2025"]["01"] as any)["15"] = {
        totalIncome: "500",
        totalExpenses: "100",
        net: "400",
      };

      // Update month/year totals
      (stats["2025"]["01"] as MonthStats).stats.totalIncome = "500";
      (stats["2025"]["01"] as MonthStats).stats.totalExpenses = "100";
      (stats["2025"]["01"] as MonthStats).stats.net = "400";

      stats["2025"].stats.totalIncome = "500";
      stats["2025"].stats.totalExpenses = "100";
      stats["2025"].stats.net = "400";

      const day1Stats = (stats["2025"]["01"] as MonthStats)["15"];

      // Day 2 starts fresh
      (stats["2025"]["01"] as any)["16"] = {
        totalIncome: "0",
        totalExpenses: "0",
        net: "0",
      };

      // PROBLEM: This is called AFTER applyCarryForwardAndRecalculate in route.ts
      // Save original values before carry-forward
      const day2OriginalIncome = "0"; // Should use this for percentage calculation
      const day1Income = day1Stats.totalIncome; // "500"

      // Apply carry-forward (modifies stats in place)
      applyCarryForwardAndRecalculate(
        stats,
        "2025",
        "01",
        "16",
        undefined,
        undefined,
        day1Stats.net, // "400"
      );

      const day2Stats = (stats["2025"]["01"] as MonthStats)["16"];

      // After carry-forward, day 2 income is now 400 (from day 1's net)
      expect(day2Stats.totalIncome).toBe("400");

      // BUG: Current code calls this with modified values
      const buggyPercentChange = calculatePercentChange(
        day2Stats.totalIncome, // "400" (modified by carry-forward!)
        day1Income, // "500"
      );

      expect(buggyPercentChange).toBe("-20"); // WRONG! Says it decreased 20%

      // CORRECT: Should calculate with original values
      const correctPercentChange = calculatePercentChange(
        day2OriginalIncome, // "0" (before carry-forward)
        day1Income, // "500"
      );

      expect(correctPercentChange).toBe("-100"); // More accurate, but ideally should be "0.0" for first period
    });

    it("should simulate events with multiple currencies and quantity", () => {
      /**
       * Scenario: Complex real-world case
       * Day 1:
       *   - Salary: 5000 USD (quantity 1)
       *   - Groceries: 150 EUR × 2 (quantity 2) = 300 EUR
       * Day 2:
       *   - Bonus: 2000 USD (quantity 1)
       *   - Expense: 50 BTC (no rate, use unconverted)
       *
       * Exchange rates: EUR=1.1, BTC not available
       * Expected conversions:
       *   - 5000 USD: stays 5000 USD
       *   - 300 EUR: ~272.73 USD (300/1.1)
       *   - 2000 USD: stays 2000 USD
       *   - 50 BTC: stays 50 (no conversion available)
       */
      const stats: CalendarStatsData = {
        "2025": {
          stats: {
            totalIncome: "0",
            totalExpenses: "0",
            net: "0",
          },
          "01": {
            stats: {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
          },
        },
      };

      const exchangeRates = new Map([
        ["USD", "1"],
        ["EUR", "1.1"],
      ]);

      // DAY 1: Multiple currencies
      (stats["2025"]["01"] as any)["15"] = {
        totalIncome: "0",
        totalExpenses: "0",
        net: "0",
      };

      // Event 1: 5000 USD salary
      const salary = new Decimal("5000").times(1);
      const salaryConverted = convertAmount(
        salary,
        "USD",
        "USD",
        exchangeRates,
      );

      addEventToStats(stats, salaryConverted, "INCOME", "2025", "01", "15");

      // Event 2: 150 EUR × 2 groceries
      const groceries = new Decimal("150").times(2);
      const groceriesConverted = convertAmount(
        groceries,
        "EUR",
        "USD",
        exchangeRates,
      );

      addEventToStats(stats, groceriesConverted, "EXPENSE", "2025", "01", "15");

      recalculateNetsAfterUpdate(stats, "2025", "01", "15");

      const day15 = (stats["2025"]["01"] as MonthStats)["15"];

      expect(day15.totalIncome).toBe("5000");
      expect(parseFloat(day15.totalExpenses)).toBeCloseTo(272.727, 2);

      // DAY 2: Bonus + unavailable currency
      (stats["2025"]["01"] as any)["16"] = {
        totalIncome: "0",
        totalExpenses: "0",
        net: "0",
      };

      // Apply carry-forward
      applyCarryForwardAndRecalculate(
        stats,
        "2025",
        "01",
        "16",
        undefined,
        undefined,
        day15.net,
      );

      // Event 3: 2000 USD bonus
      const bonus = new Decimal("2000").times(1);
      const bonusConverted = convertAmount(bonus, "USD", "USD", exchangeRates);

      addEventToStats(stats, bonusConverted, "INCOME", "2025", "01", "16");

      // Event 4: 50 BTC (no rate available)
      const btcExpense = new Decimal("50").times(1);
      const btcConverted = convertAmount(
        btcExpense,
        "BTC",
        "USD",
        exchangeRates,
      );

      addEventToStats(stats, btcConverted, "EXPENSE", "2025", "01", "16");

      recalculateNetsAfterUpdate(stats, "2025", "01", "16");

      const day16 = (stats["2025"]["01"] as MonthStats)["16"];
      // Carried: day15.net, plus 2000 bonus = day15.net + 2000
      const expectedDay16Income = new Decimal(day15.net)
        .plus("2000")
        .toString();

      expect(day16.totalIncome).toBe(expectedDay16Income);
      expect(day16.totalExpenses).toBe("50"); // BTC unconverted
    });

    it("should calculate percentage changes with boundary carry-forward (day level)", () => {
      /**
       * This test replicates the exact flow in route.ts for day boundaries:
       * 1. Apply carry-forward first
       * 2. Add events
       * 3. Recalculate nets
       * 4. Calculate percentage change on the RESULTING stats (after carry-forward)
       *
       * Flow:
       * - Day 1: Income=500, Expenses=100, Net=400
       * - Day 2 starts with carry-forward of 400
       * - After carry-forward: Income=400, Expenses=0, Net=400
       * - No new events on day 2
       * - Expected percentage change: (400 - 400) / 400 * 100 = 0%
       */
      const stats: CalendarStatsData = {
        "2025": {
          stats: {
            totalIncome: "0",
            totalExpenses: "0",
            net: "0",
          },
          "01": {
            stats: {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
          },
        },
      };

      // DAY 1: 500 income, 100 expense
      (stats["2025"]["01"] as any)["15"] = {
        totalIncome: "500",
        totalExpenses: "100",
        net: "400",
      };

      // Update month and year stats
      (stats["2025"]["01"] as MonthStats).stats.totalIncome = "500";
      (stats["2025"]["01"] as MonthStats).stats.totalExpenses = "100";
      (stats["2025"]["01"] as MonthStats).stats.net = "400";
      stats["2025"].stats.totalIncome = "500";
      stats["2025"].stats.totalExpenses = "100";
      stats["2025"].stats.net = "400";

      const day1Stats = (stats["2025"]["01"] as MonthStats)["15"];

      // DAY 2: New day starts, apply carry-forward
      (stats["2025"]["01"] as any)["16"] = {
        totalIncome: "0",
        totalExpenses: "0",
        net: "0",
      };

      // IMPORTANT: This is the flow in route.ts - carry-forward is applied BEFORE events are added
      applyCarryForwardAndRecalculate(
        stats,
        "2025",
        "01",
        "16",
        undefined,
        undefined,
        day1Stats.net, // "400"
      );

      // NO new events on day 2 - just carry-forward
      recalculateNetsAfterUpdate(stats, "2025", "01", "16");

      const day2Stats = (stats["2025"]["01"] as MonthStats)["16"];

      // After carry-forward, day 2 has the carried amount
      expect(day2Stats.totalIncome).toBe("400");
      expect(day2Stats.totalExpenses).toBe("0");
      expect(day2Stats.net).toBe("400");

      // Calculate percentage change as route.ts does: after carry-forward is applied
      const percentChange = calculatePercentChange(
        day2Stats.net,
        day1Stats.net,
      );

      // (400 - 400) / 400 * 100 = 0%
      expect(percentChange).toBe("0");
    });

    it("should calculate percentage changes before new events are added to a day", () => {
      /**
       * IMPORTANT: In route.ts (lines 131-233), the flow is:
       * 1. Initialize new day to 0/0/0 (line 131-137)
       * 2. IF boundary detected: apply carry-forward (line 183)
       * 3. IF boundary detected: calculate percentage change (line 196)
       * 4. THEN add events to day (line 223)
       * 5. THEN recalculate nets (line 233)
       *
       * This means percentage change is calculated BEFORE the current iteration's events are added!
       *
       * Scenario:
       * - Day 1 final: Income=1000, Expenses=100, Net=900
       * - Day 2 init: Income=0, Expenses=0, Net=0
       * - Day 2 after carry-forward: Income=900, Expenses=0, Net=900
       * - Percentage change calculated: (900 - 900) / 900 = 0%
       * - Day 2 then gets event: 200 expense added
       * - Day 2 final: Income=900, Expenses=200, Net=700
       *
       * Expected percentage change: 0% (calculated before the expense was added)
       */
      const stats: CalendarStatsData = {
        "2025": {
          stats: {
            totalIncome: "0",
            totalExpenses: "0",
            net: "0",
          },
          "01": {
            stats: {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
          },
        },
      };

      // DAY 1: 1000 income, 100 expense
      (stats["2025"]["01"] as any)["15"] = {
        totalIncome: "1000",
        totalExpenses: "100",
        net: "900",
      };

      (stats["2025"]["01"] as MonthStats).stats.totalIncome = "1000";
      (stats["2025"]["01"] as MonthStats).stats.totalExpenses = "100";
      (stats["2025"]["01"] as MonthStats).stats.net = "900";
      stats["2025"].stats.totalIncome = "1000";
      stats["2025"].stats.totalExpenses = "100";
      stats["2025"].stats.net = "900";

      const day1Stats = (stats["2025"]["01"] as MonthStats)["15"];

      // DAY 2: New day encountered
      (stats["2025"]["01"] as any)["16"] = {
        totalIncome: "0",
        totalExpenses: "0",
        net: "0",
      };

      // Step 1: Apply carry-forward
      applyCarryForwardAndRecalculate(
        stats,
        "2025",
        "01",
        "16",
        undefined,
        undefined,
        day1Stats.net, // "900"
      );

      // Step 2: Calculate percentage change (BEFORE adding events)
      const day2StatsAfterCarry = (stats["2025"]["01"] as MonthStats)["16"];

      const percentChange = calculatePercentChange(
        day2StatsAfterCarry.net,
        day1Stats.net,
      );

      // At this point (before events): (900 - 900) / 900 = 0%
      expect(percentChange).toBe("0");

      // Step 3: Then add new expense event (happens after percentage calculation in route.ts)
      addEventToStats(stats, new Decimal("200"), "EXPENSE", "2025", "01", "16");
      recalculateNetsAfterUpdate(stats, "2025", "01", "16");

      // Final state after event added
      const day2StatsFinal = (stats["2025"]["01"] as MonthStats)["16"];

      // But the percentage change was already set to 0% before the event was added
      expect(day2StatsFinal.totalIncome).toBe("900");
      expect(day2StatsFinal.totalExpenses).toBe("200");
      expect(day2StatsFinal.net).toBe("700");
      // Percentage change remains 0% (was calculated before the event)
      expect(percentChange).toBe("0");
    });

    it("should calculate percentage changes at month boundaries (before events added)", () => {
      /**
       * Scenario: Month boundary with carry-forward
       *
       * In route.ts, when a day in Feb 01 is first encountered:
       * 1. Month 01 (Jan) state: Net = 1000
       * 2. Month 02 (Feb) initialized: Income = 0, Net = 0
       * 3. Month boundary detected: apply carry-forward
       *    - After: Income = 1000 (carried from Jan), Net = 1000
       * 4. Percentage change calculated: (1000 - 1000) / 1000 = 0%
       * 5. THEN first day's event added to month: 200 income
       *    - Final: Income = 1200, Net = 1200
       *
       * Expected percentage change: 0% (calculated before the event)
       */
      const stats: CalendarStatsData = {
        "2025": {
          stats: {
            totalIncome: "0",
            totalExpenses: "0",
            net: "0",
          },
          "01": {
            stats: {
              totalIncome: "1000",
              totalExpenses: "0",
              net: "1000",
            },
          },
          "02": {
            stats: {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
          },
        },
      };

      const month1Net = "1000";

      // Month 2 starts - apply carry-forward
      applyCarryForwardAndRecalculate(
        stats,
        "2025",
        "02",
        "01",
        undefined,
        month1Net,
        undefined,
      );

      const month2StatsAfterCarry = (stats["2025"]["02"] as MonthStats).stats;

      // Calculate percentage change (before events are added)
      const percentChangeBeforeEvents = calculatePercentChange(
        month2StatsAfterCarry.net,
        month1Net,
      );

      // Before events: (1000 - 1000) / 1000 = 0%
      expect(percentChangeBeforeEvents).toBe("0");

      // Then add new income event in month 2
      (stats["2025"]["02"] as any)["01"] = {
        totalIncome: "0",
        totalExpenses: "0",
        net: "0",
      };

      addEventToStats(stats, new Decimal("200"), "INCOME", "2025", "02", "01");
      recalculateNetsAfterUpdate(stats, "2025", "02", "01");

      const month2StatsFinal = (stats["2025"]["02"] as MonthStats).stats;

      // After event added
      expect(month2StatsFinal.totalIncome).toBe("1200");
      expect(month2StatsFinal.totalExpenses).toBe("0");
      expect(month2StatsFinal.net).toBe("1200");

      // But percentage change was already set to 0% before the event
      expect(percentChangeBeforeEvents).toBe("0");
    });

    it("should calculate percentage changes at year boundaries (before events added)", () => {
      /**
       * Scenario: Year boundary with carry-forward
       *
       * In route.ts, when a day in 2026-01-01 is first encountered:
       * 1. Year 2025 state: Net = 5000
       * 2. Year 2026 initialized: Income = 0, Net = 0
       * 3. Year boundary detected: apply carry-forward
       *    - After: Income = 5000 (carried from 2025), Net = 5000
       * 4. Percentage change calculated: (5000 - 5000) / 5000 = 0%
       * 5. THEN first day's event added to year: 1000 expense
       *    - Final: Income = 5000, Expenses = 1000, Net = 4000
       *
       * Expected percentage change: 0% (calculated before the event)
       */
      const stats: CalendarStatsData = {
        "2025": {
          stats: {
            totalIncome: "10000",
            totalExpenses: "5000",
            net: "5000",
          },
        },
        "2026": {
          stats: {
            totalIncome: "0",
            totalExpenses: "0",
            net: "0",
          },
          "01": {
            stats: {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
          },
        },
      };

      const year2025Net = "5000";

      // Year 2026 starts - apply carry-forward
      applyCarryForwardAndRecalculate(
        stats,
        "2026",
        "01",
        "01",
        year2025Net,
        undefined,
        undefined,
      );

      const year2026StatsAfterCarry = stats["2026"].stats;

      // Calculate percentage change (before events are added)
      const percentChangeBeforeEvents = calculatePercentChange(
        year2026StatsAfterCarry.net,
        year2025Net,
      );

      // Before events: (5000 - 5000) / 5000 = 0%
      expect(percentChangeBeforeEvents).toBe("0");

      // Then add new expense event
      (stats["2026"]["01"] as any)["01"] = {
        totalIncome: "0",
        totalExpenses: "0",
        net: "0",
      };

      addEventToStats(
        stats,
        new Decimal("1000"),
        "EXPENSE",
        "2026",
        "01",
        "01",
      );
      recalculateNetsAfterUpdate(stats, "2026", "01", "01");

      const year2026StatsFinal = stats["2026"].stats;

      // After event added
      expect(year2026StatsFinal.totalIncome).toBe("5000");
      expect(year2026StatsFinal.totalExpenses).toBe("1000");
      expect(year2026StatsFinal.net).toBe("4000");

      // But percentage change was already set to 0% before the event
      expect(percentChangeBeforeEvents).toBe("0");
    });
  });
});
