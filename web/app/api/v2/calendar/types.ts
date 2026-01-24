import { EventAttributes } from "@expensecal/database/models/Event";

import { BaseErrorResponse, BaseSuccessResponse } from "../../v1/types";

export type FinancialSummary = {
  totalIncome: string;
  totalExpenses: string;
  net: string;
  totalIncomePercentChange?: string;
  totalExpensesPercentChange?: string;
  netPercentChange?: string;
};

export type CalendarEvent = EventAttributes & { exchangeRate: string };

/**
 * Raw event from API (before client-side processing)
 * Does not include exchangeRate - this is calculated client-side
 */
export type RawCalendarEvent = EventAttributes;

type Day = Array<CalendarEvent>;
type Month = Record<string, Day>;
type Year = Record<string, Month>;
export type CalendarData = Record<string, Year>;

export type DayStats = FinancialSummary;

export type MonthStats = {
  stats: FinancialSummary;
  [day: string]: DayStats;
};

export type YearStats = {
  stats: FinancialSummary;
  [month: string]: MonthStats | FinancialSummary;
};

export type CalendarStatsData = Record<string, YearStats>;

/**
 * Processed calendar data (after client-side calculation)
 * Used by components for rendering
 */
export type ProcessedCalendarData = {
  calendar: CalendarData;
  stats: CalendarStatsData;
};

/**
 * New lightweight API response - returns raw events for client-side processing
 * Stats calculation happens on the client using exchange rates from ExchangeRatesContext
 */
export type GetCalendarV2SuccessResponse = {
  data: {
    events: RawCalendarEvent[];
    baseCurrency: string;
  };
} & BaseSuccessResponse;

export type GetCalendarErrorResponse = {
  details?: string;
  stage?: "validation" | "database"; // Which stage failed (no more "calculation" stage)
} & BaseErrorResponse;

export type GetCalendarResponse =
  | GetCalendarV2SuccessResponse
  | GetCalendarErrorResponse;
