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

export type GetCalendarV2SuccessResponse = {
  data: {
    calendar: CalendarData;
    stats: CalendarStatsData;
  };
} & BaseSuccessResponse;

export type GetCalendarErrorResponse = {
  details?: string;
  stage?: "validation" | "database" | "calculation"; // Which stage failed
} & BaseErrorResponse;

export type GetCalendarResponse =
  | GetCalendarV2SuccessResponse
  | GetCalendarErrorResponse;
