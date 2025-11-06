/**
 * API Types for /api/v1/calendar
 * Protected endpoint for fetching calendar events for a given month range
 */

import { EventAttributes } from "@expensecal/database/models/Event";
import { BaseErrorResponse, BaseSuccessResponse } from "../types";

export type CalendarDay = {
  date: string; // ISO 8601 format (YYYY-MM-DD)
  dayOfMonth: number; // 1-31
  isCurrentMonth: boolean; // true if day belongs to the requested month
  isToday: boolean; // true if day is today
  weekOfYear: number; // ISO week number
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  events: CalendarEventData[];
  financialSummary: {
    totalIncome: string; // Decimal as string
    totalExpenses: string; // Decimal as string
    net: string; // income - expenses
    eventCount: number;
  };
};

export type CalendarMonth = {
  year: number;
  month: number; // 1-12
  firstDayOfWeek: number; // 0-6 (which weekday the 1st falls on)
  daysInMonth: number; // 28-31
  days: CalendarDay[]; // Always 35-42 elements (5-6 weeks * 7 days)
};

export type CalendarEventData = EventAttributes;

export type GetCalendarRequestQuery = {
  month?: string; // ISO format: "2025-11" (defaults to current month)
  range?: number; // Months before and after to fetch (default 6, so 13 months total)
};

export type GetCalendarSuccessResponse = {
  data: {
    months: CalendarMonth[];
    metadata: {
      requestedMonth: string; // The month user requested
      monthsRequested: number; // Range size (default 6)
      totalMonths: number; // Total months in response (2*range + 1)
      dateRange: {
        start: string; // ISO 8601
        end: string; // ISO 8601
      };
      hasMore: {
        past: boolean; // true if more months exist before dateRange.start
        future: boolean; // true if more months exist after dateRange.end
      };
    };
  };
} & BaseSuccessResponse;

export type GetCalendarErrorResponse = {
  details?: string;
  stage?: "validation" | "database" | "calculation"; // Which stage failed
} & BaseErrorResponse;

export type GetCalendarResponse =
  | GetCalendarSuccessResponse
  | GetCalendarErrorResponse;
