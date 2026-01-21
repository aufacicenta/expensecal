import Decimal from "decimal.js";

import { convertCurrency } from "../exchange-rates/exchangeRateService";

import {
  CalendarStatsData,
  MonthStats,
  YearStats,
} from "@/app/api/v2/calendar/types";

/**
 * Calculate financial summary for a day
 * Converts all events to the base currency using exchange rates
 *
 * Uses hub-and-spoke model where all rates are stored as USD -> X
 * To convert from currency A to currency B:
 * 1. Convert A to USD: amount / USD->A rate
 * 2. Convert USD to B: result * USD->B rate
 *
 * @param amount - Amount to convert as Decimal
 * @param currencySymbol - Source currency symbol (e.g., "MXN")
 * @param baseCurrencySymbol - Target base currency symbol (e.g., "EUR")
 * @param exchangeRates - Map of currency symbols to their USD->X rates
 * @returns Converted amount as Decimal
 */
export function convertAmount(
  amount: Decimal,
  currencySymbol: string | "UNKNOWN",
  baseCurrencySymbol: string,
  exchangeRates: Map<string, string>,
): Decimal {
  // No conversion needed if same currency
  if (currencySymbol === baseCurrencySymbol) {
    return amount;
  }

  // Cannot convert unknown currencies
  if (currencySymbol === "UNKNOWN") {
    return amount;
  }

  // Get the source currency's rate (USD -> source)
  const sourceRate = exchangeRates.get(currencySymbol);

  if (!sourceRate) {
    // Rate not found, log warning and use unconverted amount
    console.warn(
      `Exchange rate not found for ${currencySymbol}, using unconverted amount`,
    );

    return amount;
  }

  // If converting to USD, target rate is "1" (1 USD = 1 USD)
  // Otherwise, get the target currency's rate (USD -> target)
  let targetRate = "1";

  if (baseCurrencySymbol !== "USD") {
    const fetchedTargetRate = exchangeRates.get(baseCurrencySymbol);

    if (!fetchedTargetRate) {
      console.warn(
        `Exchange rate not found for base currency ${baseCurrencySymbol}, converting to USD instead`,
      );
    } else {
      targetRate = fetchedTargetRate;
    }
  }

  // Convert using hub-and-spoke model: (amount / sourceRate) * targetRate
  // This converts: source currency -> USD -> target currency
  const convertedAmount = new Decimal(
    convertCurrency(amount.toString(), sourceRate, targetRate),
  );

  return convertedAmount;
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
) {
  const dayStats = (stats[year][month] as MonthStats)[day];
  const monthStats = (stats[year][month] as YearStats).stats;
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
  const dayStats = (stats[year][month] as MonthStats)[day];
  const monthStats = (stats[year][month] as YearStats).stats;
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
 * Apply carry-forward from previous periods and recalculate nets
 * Called when transitioning to a new day/month/year to apply running balance
 * Mutates the stats object in place
 *
 * @param stats - CalendarStatsData to update
 * @param year - Year key (string, e.g., "2025")
 * @param month - Month key (string, e.g., "01")
 * @param day - Day key (string, e.g., "15")
 * @param prevYearNet - Previous year's net to carry forward, if any
 * @param prevMonthNet - Previous month's net to carry forward, if any
 * @param prevDayNet - Previous day's net to carry forward, if any
 *
 * @example
 * applyCarryForwardAndRecalculate(stats, "2025", "01", "15", "1000", undefined, undefined);
 */
export function applyCarryForwardAndRecalculate(
  stats: CalendarStatsData,
  year: string,
  month: string,
  day: string,
  prevYearNet?: string,
  prevMonthNet?: string,
  prevDayNet?: string,
): void {
  const dayStats = (stats[year][month] as MonthStats)[day];
  const monthStats = (stats[year][month] as YearStats).stats;
  const yearStats = stats[year].stats;

  // Apply day-level carry-forward (previous day's net -> current day's income)
  if (dayStats && prevDayNet !== undefined) {
    dayStats.totalIncome = new Decimal(dayStats.totalIncome)
      .plus(prevDayNet)
      .toString();
  }

  // Apply month-level carry-forward (previous month's net -> current month's income)
  if (prevMonthNet !== undefined) {
    monthStats.totalIncome = new Decimal(monthStats.totalIncome)
      .plus(prevMonthNet)
      .toString();
  }

  // Apply year-level carry-forward (previous year's net -> current year's income)
  if (prevYearNet !== undefined) {
    yearStats.totalIncome = new Decimal(yearStats.totalIncome)
      .plus(prevYearNet)
      .toString();
  }

  // Now recalculate nets with carried-forward values
  recalculateNetsAfterUpdate(stats, year, month, day);
}
