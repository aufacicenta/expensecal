import { FinancialSummary } from "@/app/api/v2/calendar/types";
import { Event } from "@expensecal/database";
import { EventType } from "@expensecal/database/models/Event";
import Decimal from "decimal.js";
import { convertCurrency } from "../exchange-rates";

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
 * Calculate financial summary for a day
 * Converts all events to the base currency using exchange rates
 */
export function calculateDayFinancialSummary(
  events: Event[],
  baseCurrencySymbol: string,
  exchangeRates: Map<string, string>,
): FinancialSummary {
  let totalIncome = new Decimal(0);
  let totalExpenses = new Decimal(0);

  for (const event of events) {
    const amount = new Decimal(event.amount).times(event.quantity || 1);
    const currencySymbol = event.currency?.symbol || "UNKNOWN";

    // Convert amount to base currency if needed
    let convertedAmount = convertAmount(
      amount,
      currencySymbol,
      baseCurrencySymbol,
      exchangeRates,
    );

    if (event.type === EventType.INCOME) {
      totalIncome = totalIncome.plus(convertedAmount);
    } else if (event.type === EventType.EXPENSE) {
      totalExpenses = totalExpenses.plus(convertedAmount);
    }
  }

  const net = totalIncome.minus(totalExpenses);

  return {
    totalIncome: totalIncome.toString(),
    totalExpenses: totalExpenses.toString(),
    net: net.toString(),
  };
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
