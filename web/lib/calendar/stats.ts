import {
  CalendarData,
  CalendarStatsData,
  FinancialSummary,
} from "@/app/api/v2/calendar/types";
import Decimal from "decimal.js";
import { convertCurrency } from "../exchange-rates/exchangeRateService";

/**
 * Calculate financial summary for a day
 * Converts all events to the base currency using exchange rates
 */
export function convertAmount(
  amount: Decimal,
  currencySymbol: string | "UNKNOWN",
  baseCurrencySymbol: string,
  exchangeRates: Map<string, string>,
): Decimal {
  // Convert amount to base currency if needed
  let convertedAmount = amount;
  if (currencySymbol !== baseCurrencySymbol && currencySymbol !== "UNKNOWN") {
    const rate = exchangeRates.get(currencySymbol);
    if (rate) {
      // Convert using hub-and-spoke model: (amount / rate) * 1
      convertedAmount = new Decimal(
        convertCurrency(amount.toString(), rate, "1"),
      );
    } else {
      // Rate not found, log warning and use unconverted amount
      console.warn(
        `Exchange rate not found for ${currencySymbol}, using unconverted amount`,
      );
    }
  }

  return convertedAmount;
}

/**
 * Aggregate two financial summaries by adding their values
 */
export function aggregateFinancialSummaries(
  summary1: FinancialSummary,
  summary2: FinancialSummary,
): FinancialSummary {
  const totalIncome = new Decimal(summary1.totalIncome).plus(
    summary2.totalIncome,
  );
  const totalExpenses = new Decimal(summary1.totalExpenses).plus(
    summary2.totalExpenses,
  );
  const net = totalIncome.minus(totalExpenses);

  return {
    totalIncome: totalIncome.toString(),
    totalExpenses: totalExpenses.toString(),
    net: net.toString(),
  };
}

/**
 * Calculate net amount from income and expenses strings
 * Handles conversion from string to Decimal and back for precision
 *
 * @param totalIncome - Income amount as string (Decimal.toString())
 * @param totalExpenses - Expenses amount as string (Decimal.toString())
 * @returns Net amount as string (income - expenses)
 *
 * @example
 * const net = calculateNetFromSummary("100.50", "30.25"); // "70.25"
 */
export function calculateNetFromSummary(
  totalIncome: string,
  totalExpenses: string,
): string {
  return new Decimal(totalIncome).minus(totalExpenses).toString();
}

/**
 * Aggregate multiple financial summaries into a single summary
 * Useful for combining day stats into month totals or month stats into year totals
 *
 * @param summaries - Array of FinancialSummary objects to aggregate
 * @returns Aggregated FinancialSummary with combined values
 *
 * @example
 * const monthStats = aggregateFinancialSummariesArray(dayStatsArray);
 */
export function aggregateFinancialSummariesArray(
  summaries: FinancialSummary[],
): FinancialSummary {
  let totalIncome = new Decimal(0);
  let totalExpenses = new Decimal(0);

  for (const summary of summaries) {
    totalIncome = totalIncome.plus(summary.totalIncome);
    totalExpenses = totalExpenses.plus(summary.totalExpenses);
  }

  const net = totalIncome.minus(totalExpenses);

  return {
    totalIncome: totalIncome.toString(),
    totalExpenses: totalExpenses.toString(),
    net: net.toString(),
  };
}

/**
 * Calculate percentage change between two periods
 * For the first period (prevValue is undefined), returns "0.0"
 * For zero previous values, returns "0.0" to avoid division by zero
 *
 * @param currentValue - Current period value as string (Decimal.toString())
 * @param prevValue - Previous period value as string, undefined for first period
 * @returns Percentage change as string, e.g., "15.5" for 15.5% increase
 *
 * @example
 * const change = calculatePercentChange("100", "80"); // "25.0"
 * const firstPeriod = calculatePercentChange("100", undefined); // "0.0"
 */
export function calculatePercentChange(
  currentValue: string,
  prevValue: string | undefined,
): string {
  if (prevValue === undefined) {
    return "0.0";
  }

  const prev = new Decimal(prevValue);
  const curr = new Decimal(currentValue);

  if (prev.isZero()) {
    return "0.0";
  }

  const percentChange = curr
    .minus(prev)
    .dividedBy(prev)
    .times(100)
    .toDecimalPlaces(2)
    .toString();

  return percentChange;
}

/**
 * Subtract an event's contribution from stats at all levels (day, month, year)
 * Mutates the stats object in place
 *
 * @param stats - CalendarStatsData to update
 * @param convertedAmount - The event's converted amount as Decimal
 * @param eventType - Event type ("INCOME" or "EXPENSE")
 * @param year - Year key (string, e.g., "2025")
 * @param month - Month key (string, e.g., "01")
 * @param day - Day key (string, e.g., "15")
 *
 * @example
 * subtractEventFromStats(stats, new Decimal("50"), "INCOME", "2025", "01", "15");
 */
export function subtractEventFromStats(
  stats: CalendarStatsData,
  convertedAmount: Decimal,
  eventType: "INCOME" | "EXPENSE",
  year: string,
  month: string,
  day: string,
): void {
  const dayStats = (stats[year][month] as any)[day];
  const monthStats = (stats[year][month] as any).stats;
  const yearStats = stats[year].stats;

  if (eventType === "INCOME") {
    if (dayStats) {
      dayStats.totalIncome = new Decimal(dayStats.totalIncome)
        .minus(convertedAmount)
        .toString();
    }
    monthStats.totalIncome = new Decimal(monthStats.totalIncome)
      .minus(convertedAmount)
      .toString();
    yearStats.totalIncome = new Decimal(yearStats.totalIncome)
      .minus(convertedAmount)
      .toString();
  } else if (eventType === "EXPENSE") {
    if (dayStats) {
      dayStats.totalExpenses = new Decimal(dayStats.totalExpenses)
        .minus(convertedAmount)
        .toString();
    }
    monthStats.totalExpenses = new Decimal(monthStats.totalExpenses)
      .minus(convertedAmount)
      .toString();
    yearStats.totalExpenses = new Decimal(yearStats.totalExpenses)
      .minus(convertedAmount)
      .toString();
  }
}

/**
 * Add an event's contribution to stats at all levels (day, month, year)
 * Mutates the stats object in place
 *
 * @param stats - CalendarStatsData to update
 * @param convertedAmount - The event's converted amount as Decimal
 * @param eventType - Event type ("INCOME" or "EXPENSE")
 * @param year - Year key (string, e.g., "2025")
 * @param month - Month key (string, e.g., "01")
 * @param day - Day key (string, e.g., "15")
 *
 * @example
 * addEventToStats(stats, new Decimal("50"), "EXPENSE", "2025", "01", "15");
 */
export function addEventToStats(
  stats: CalendarStatsData,
  convertedAmount: Decimal,
  eventType: "INCOME" | "EXPENSE",
  year: string,
  month: string,
  day: string,
): void {
  const dayStats = (stats[year][month] as any)[day];
  const monthStats = (stats[year][month] as any).stats;
  const yearStats = stats[year].stats;

  if (eventType === "INCOME") {
    if (dayStats) {
      dayStats.totalIncome = new Decimal(dayStats.totalIncome)
        .plus(convertedAmount)
        .toString();
    }
    monthStats.totalIncome = new Decimal(monthStats.totalIncome)
      .plus(convertedAmount)
      .toString();
    yearStats.totalIncome = new Decimal(yearStats.totalIncome)
      .plus(convertedAmount)
      .toString();
  } else if (eventType === "EXPENSE") {
    if (dayStats) {
      dayStats.totalExpenses = new Decimal(dayStats.totalExpenses)
        .plus(convertedAmount)
        .toString();
    }
    monthStats.totalExpenses = new Decimal(monthStats.totalExpenses)
      .plus(convertedAmount)
      .toString();
    yearStats.totalExpenses = new Decimal(yearStats.totalExpenses)
      .plus(convertedAmount)
      .toString();
  }
}

/**
 * Recalculate day, month, and year net values from their income and expenses
 * Mutates the stats object in place
 *
 * @param stats - CalendarStatsData to update
 * @param year - Year key (string, e.g., "2025")
 * @param month - Month key (string, e.g., "01")
 * @param day - Day key (string, e.g., "15")
 *
 * @example
 * recalculateNetsAfterUpdate(stats, "2025", "01", "15");
 */
export function recalculateNetsAfterUpdate(
  stats: CalendarStatsData,
  year: string,
  month: string,
  day: string,
): void {
  const dayStats = (stats[year][month] as any)[day];
  const monthStats = (stats[year][month] as any).stats;
  const yearStats = stats[year].stats;

  // Recalculate day net
  if (dayStats) {
    dayStats.net = calculateNetFromSummary(
      dayStats.totalIncome,
      dayStats.totalExpenses,
    );
  }

  // Recalculate month net
  monthStats.net = calculateNetFromSummary(
    monthStats.totalIncome,
    monthStats.totalExpenses,
  );

  // Recalculate year net
  yearStats.net = calculateNetFromSummary(
    yearStats.totalIncome,
    yearStats.totalExpenses,
  );
}

/**
 * Rebuild stats for a specific month from its calendar events
 * Used when events are updated/deleted and stats need to be recalculated from source
 * Mutates the stats object in place
 *
 * @param calendar - CalendarData with events
 * @param stats - CalendarStatsData to update
 * @param year - Year key (string, e.g., "2025")
 * @param month - Month key (string, e.g., "01")
 *
 * @example
 * rebuildMonthStatsFromCalendar(calendar, stats, "2025", "01");
 */
export function rebuildMonthStatsFromCalendar(
  calendar: CalendarData,
  stats: CalendarStatsData,
  year: string,
  month: string,
): void {
  if (!calendar[year]?.[month]) {
    return;
  }

  const monthDays = Object.keys(calendar[year][month]).sort();

  // Recalculate each day's stats from events
  for (const day of monthDays) {
    const dayEvents = calendar[year][month][day] || [];
    let dayIncome = new Decimal(0);
    let dayExpenses = new Decimal(0);

    for (const event of dayEvents) {
      const convertedAmount = new Decimal(event.exchangeRate);
      if (event.type === "INCOME") {
        dayIncome = dayIncome.plus(convertedAmount);
      } else if (event.type === "EXPENSE") {
        dayExpenses = dayExpenses.plus(convertedAmount);
      }
    }

    // Ensure day stats object exists
    if (!(stats[year][month] as any)[day]) {
      (stats[year][month] as any)[day] = {
        totalIncome: "0",
        totalExpenses: "0",
        net: "0",
      };
    }

    // Update day stats
    (stats[year][month] as any)[day].totalIncome = dayIncome.toString();
    (stats[year][month] as any)[day].totalExpenses = dayExpenses.toString();
    (stats[year][month] as any)[day].net = calculateNetFromSummary(
      dayIncome.toString(),
      dayExpenses.toString(),
    );
  }

  // Recalculate month stats from day stats
  let monthIncome = new Decimal(0);
  let monthExpenses = new Decimal(0);

  for (const day of monthDays) {
    const dayStats = (stats[year][month] as any)[day];
    monthIncome = monthIncome.plus(dayStats.totalIncome);
    monthExpenses = monthExpenses.plus(dayStats.totalExpenses);
  }

  const monthStats = (stats[year][month] as any).stats;
  monthStats.totalIncome = monthIncome.toString();
  monthStats.totalExpenses = monthExpenses.toString();
  monthStats.net = calculateNetFromSummary(
    monthIncome.toString(),
    monthExpenses.toString(),
  );
}

/**
 * Rebuild stats for specific years from their month stats
 * Used when month-level or higher changes require full year recalculation
 * Mutates the stats object in place
 *
 * @param stats - CalendarStatsData to update
 * @param yearsToRecalc - Array of year keys to recalculate (string, e.g., ["2025", "2026"])
 *
 * @example
 * rebuildYearStatsFromMonths(stats, ["2025"]);
 */
export function rebuildYearStatsFromMonths(
  stats: CalendarStatsData,
  yearsToRecalc: string[],
): void {
  for (const year of yearsToRecalc.sort()) {
    if (!stats[year]) {
      continue;
    }

    let yearIncome = new Decimal(0);
    let yearExpenses = new Decimal(0);

    const yearMonths = Object.keys(stats[year])
      .filter((k) => k !== "stats")
      .sort();

    for (const month of yearMonths) {
      const monthStats = (stats[year][month] as any).stats;
      yearIncome = yearIncome.plus(monthStats.totalIncome);
      yearExpenses = yearExpenses.plus(monthStats.totalExpenses);
    }

    stats[year].stats.totalIncome = yearIncome.toString();
    stats[year].stats.totalExpenses = yearExpenses.toString();
    stats[year].stats.net = calculateNetFromSummary(
      yearIncome.toString(),
      yearExpenses.toString(),
    );
  }
}

/**
 * Apply carry-forward cascade to propagate net balances through periods
 * The cascade adds each period's net to the next period's income (rolling balance)
 * This is used to show cumulative net balance over time
 * Mutates the stats object in place
 *
 * @param stats - CalendarStatsData to update
 * @param startYear - Starting year for cascade (string, e.g., "2025")
 * @param startMonth - Starting month for cascade, if only cascading from specific month (string, e.g., "01")
 * @param startDay - Starting day for cascade, if only cascading from specific day (string, e.g., "15")
 *
 * @example
 * // Cascade from beginning of 2025 forward
 * applyCascadeForwardStats(stats, "2025");
 *
 * @example
 * // Cascade from January 2025 forward
 * applyCascadeForwardStats(stats, "2025", "01");
 *
 * @example
 * // Cascade from Jan 15, 2025 forward (including partial cascade in month)
 * applyCascadeForwardStats(stats, "2025", "01", "15");
 */
export function applyCascadeForwardStats(
  stats: CalendarStatsData,
  startYear: string,
  startMonth?: string,
  startDay?: string,
): void {
  const allYears = Object.keys(stats).sort();
  const startYearIdx = allYears.indexOf(startYear);

  if (startYearIdx === -1) {
    return;
  }

  // Get previous year's net if cascade doesn't start at first year
  let prevYearNet: string | undefined;
  if (startYearIdx > 0) {
    prevYearNet = stats[allYears[startYearIdx - 1]].stats.net;
  }

  for (let yearIdx = startYearIdx; yearIdx < allYears.length; yearIdx++) {
    const year = allYears[yearIdx];
    const yearData = stats[year];
    const isStartYear = yearIdx === startYearIdx;

    // Add previous year's net to current year's income
    if (prevYearNet !== undefined) {
      yearData.stats.totalIncome = new Decimal(yearData.stats.totalIncome)
        .plus(prevYearNet)
        .toString();
    }

    // Recalculate year net after income adjustment
    yearData.stats.net = calculateNetFromSummary(
      yearData.stats.totalIncome,
      yearData.stats.totalExpenses,
    );

    prevYearNet = yearData.stats.net;

    // Process months within this year
    const months = Object.keys(yearData)
      .filter((k) => k !== "stats")
      .sort();

    const startMonthIdx =
      isStartYear && startMonth ? months.indexOf(startMonth) : 0;

    let prevMonthNet: string | undefined;
    if (startMonthIdx > 0) {
      prevMonthNet = (yearData[months[startMonthIdx - 1]] as any).stats.net;
    }

    for (let monthIdx = startMonthIdx; monthIdx < months.length; monthIdx++) {
      const month = months[monthIdx];
      const monthData = yearData[month] as any;

      // Add previous month's net to current month's income
      if (prevMonthNet !== undefined) {
        monthData.stats.totalIncome = new Decimal(monthData.stats.totalIncome)
          .plus(prevMonthNet)
          .toString();
      }

      // Recalculate month net after income adjustment
      monthData.stats.net = calculateNetFromSummary(
        monthData.stats.totalIncome,
        monthData.stats.totalExpenses,
      );

      prevMonthNet = monthData.stats.net;

      // Process days within this month if specified
      if (startDay && isStartYear && monthIdx === startMonthIdx) {
        const days = Object.keys(monthData)
          .filter((k) => k !== "stats")
          .sort();

        const startDayIdx = days.indexOf(startDay);
        let prevDayNet: string | undefined;

        if (startDayIdx > 0) {
          prevDayNet = monthData[days[startDayIdx - 1]].net;
        }

        for (let dayIdx = startDayIdx; dayIdx < days.length; dayIdx++) {
          const day = days[dayIdx];
          const dayStats = monthData[day];

          if (!dayStats) {
            continue;
          }

          // Add previous day's net to current day's income
          if (prevDayNet !== undefined) {
            dayStats.totalIncome = new Decimal(dayStats.totalIncome)
              .plus(prevDayNet)
              .toString();
          }

          // Recalculate day net after income adjustment
          dayStats.net = calculateNetFromSummary(
            dayStats.totalIncome,
            dayStats.totalExpenses,
          );

          prevDayNet = dayStats.net;
        }
      } else if (!startDay && isStartYear && monthIdx === startMonthIdx) {
        // If no specific day, cascade through all days in month
        const days = Object.keys(monthData)
          .filter((k) => k !== "stats")
          .sort();

        let prevDayNet: string | undefined;

        for (const day of days) {
          const dayStats = monthData[day];

          if (!dayStats) {
            continue;
          }

          // Add previous day's net to current day's income
          if (prevDayNet !== undefined) {
            dayStats.totalIncome = new Decimal(dayStats.totalIncome)
              .plus(prevDayNet)
              .toString();
          }

          // Recalculate day net after income adjustment
          dayStats.net = calculateNetFromSummary(
            dayStats.totalIncome,
            dayStats.totalExpenses,
          );

          prevDayNet = dayStats.net;
        }
      } else if (!isStartYear || monthIdx > startMonthIdx) {
        // Cascade through all days in month for non-start months
        const days = Object.keys(monthData)
          .filter((k) => k !== "stats")
          .sort();

        let prevDayNet: string | undefined;

        for (const day of days) {
          const dayStats = monthData[day];

          if (!dayStats) {
            continue;
          }

          // Add previous day's net to current day's income
          if (prevDayNet !== undefined) {
            dayStats.totalIncome = new Decimal(dayStats.totalIncome)
              .plus(prevDayNet)
              .toString();
          }

          // Recalculate day net after income adjustment
          dayStats.net = calculateNetFromSummary(
            dayStats.totalIncome,
            dayStats.totalExpenses,
          );

          prevDayNet = dayStats.net;
        }
      }
    }
  }
}
