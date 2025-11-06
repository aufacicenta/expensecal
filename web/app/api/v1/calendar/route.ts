import { stackServerApp } from "@/stack/server";
import { Op } from "@expensecal/database";
import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Currency } from "@expensecal/database/models/Currency";
import { Event } from "@expensecal/database/models/Event";
import { Decimal } from "decimal.js";
import { NextRequest, NextResponse } from "next/server";
import {
  CalendarDay,
  CalendarEventData,
  CalendarMonth,
  GetCalendarResponse,
} from "./types";

/**
 * GET /api/v1/calendar
 * Fetch calendar events for a given month range (default: 6 months before + current + 6 months after = 13 months total)
 * Protected endpoint (requires authentication)
 *
 * Query parameters:
 * - month: ISO format "YYYY-MM" (optional, defaults to current month)
 * - range: Number of months before and after (optional, default 6)
 *
 * Example: GET /api/v1/calendar?month=2025-11&range=6
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<GetCalendarResponse>> {
  try {
    // Authenticate user with Stackframe
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You must be logged in to access calendar",
        },
        { status: 401 },
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const monthParam = searchParams.get("month");
    const rangeParam = searchParams.get("range");

    // Validate and parse month parameter
    const requestedMonth = monthParam
      ? parseMonthParam(monthParam)
      : new Date();
    if (!requestedMonth) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid month format",
          details: "Please provide month in YYYY-MM format (e.g., 2025-11)",
          stage: "validation",
        },
        { status: 400 },
      );
    }

    // Parse range parameter
    const monthsRange = rangeParam ? parseInt(rangeParam) : 6;
    if (isNaN(monthsRange) || monthsRange < 0 || monthsRange > 24) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid range",
          details: "Range must be a number between 0 and 24",
          stage: "validation",
        },
        { status: 400 },
      );
    }

    // Initialize database models
    initModels(db);

    // Calculate date range for fetching events
    const rangeStart = new Date(requestedMonth);
    rangeStart.setMonth(rangeStart.getMonth() - monthsRange);
    rangeStart.setDate(1);
    rangeStart.setHours(0, 0, 0, 0);

    const rangeEnd = new Date(requestedMonth);
    rangeEnd.setMonth(rangeEnd.getMonth() + monthsRange + 1);
    rangeEnd.setDate(0);
    rangeEnd.setHours(23, 59, 59, 999);

    // Fetch all events for the date range
    const events = await Event.findAll({
      where: {
        user_id: user.id,
        event_date: {
          [Op.between]: [rangeStart, rangeEnd],
        },
      },
      include: [
        {
          model: Currency,
          attributes: ["id", "symbol", "code"],
        },
      ],
      order: [["event_date", "ASC"]],
    });

    // Group events by date for quick lookup
    const eventsByDate = new Map<string, Event[]>();
    events.forEach((event) => {
      const dateKey = event.event_date.toISOString().split("T")[0];
      if (!eventsByDate.has(dateKey)) {
        eventsByDate.set(dateKey, []);
      }
      eventsByDate.get(dateKey)!.push(event);
    });

    // Build calendar months
    const months: CalendarMonth[] = [];
    const currentMonthDate = new Date(requestedMonth);

    for (let i = -monthsRange; i <= monthsRange; i++) {
      const monthDate = new Date(currentMonthDate);
      monthDate.setMonth(monthDate.getMonth() + i);

      const month = buildCalendarMonth(monthDate, eventsByDate, user.id);
      months.push(month);
    }

    // Determine if more months exist in past/future
    const hasMorePast = rangeStart > new Date(rangeStart.getFullYear(), 0, 1);
    const hasMoreFuture = rangeEnd < new Date(rangeEnd.getFullYear(), 11, 31);

    // Format month string for response
    const monthStr = `${requestedMonth.getFullYear()}-${String(
      requestedMonth.getMonth() + 1,
    ).padStart(2, "0")}`;

    return NextResponse.json(
      {
        success: true,
        data: {
          months,
          metadata: {
            requestedMonth: monthStr,
            monthsRequested: monthsRange,
            totalMonths: 2 * monthsRange + 1,
            dateRange: {
              start: rangeStart.toISOString().split("T")[0],
              end: rangeEnd.toISOString().split("T")[0],
            },
            hasMore: {
              past: hasMorePast,
              future: hasMoreFuture,
            },
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Calendar endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
        stage: "calculation",
      },
      { status: 500 },
    );
  }
}

/**
 * Parse month parameter from query string
 * Accepts: "2025-11" or "202511"
 */
function parseMonthParam(monthStr: string): Date | null {
  // Try format: "2025-11"
  if (monthStr.includes("-")) {
    const parts = monthStr.split("-");
    if (parts.length === 2) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      if (!isNaN(year) && !isNaN(month) && month >= 0 && month <= 11) {
        return new Date(year, month, 1);
      }
    }
  }

  // Try format: "202511"
  if (monthStr.length === 6) {
    const year = parseInt(monthStr.substring(0, 4));
    const month = parseInt(monthStr.substring(4, 6)) - 1;
    if (!isNaN(year) && !isNaN(month) && month >= 0 && month <= 11) {
      return new Date(year, month, 1);
    }
  }

  return null;
}

/**
 * Build calendar month structure with all days and events
 */
function buildCalendarMonth(
  monthDate: Date,
  eventsByDate: Map<string, Event[]>,
  userId: string,
): CalendarMonth {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const days: CalendarDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate calendar grid (5-6 weeks * 7 days)
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const isCurrentMonth =
      i >= firstDayOfWeek && i < firstDayOfWeek + daysInMonth;
    const dayOfMonth = isCurrentMonth ? i - firstDayOfWeek + 1 : 0;

    let cellDate: Date;
    if (isCurrentMonth) {
      cellDate = new Date(year, month, dayOfMonth);
    } else if (i < firstDayOfWeek) {
      // Previous month
      const prevMonth = new Date(year, month, 0);
      const prevMonthDays = prevMonth.getDate();
      cellDate = new Date(
        year,
        month - 1,
        prevMonthDays - (firstDayOfWeek - i - 1),
      );
    } else {
      // Next month
      cellDate = new Date(
        year,
        month + 1,
        i - firstDayOfWeek - daysInMonth + 1,
      );
    }

    const dateKey = cellDate.toISOString().split("T")[0];
    const isToday = cellDate.getTime() === today.getTime();
    const weekOfYear = getWeekNumber(cellDate);
    const dayOfWeek = cellDate.getDay();

    // Get events for this day
    const dayEvents = eventsByDate.get(dateKey) || [];

    // Calculate financial summary for the day
    const financialSummary = calculateDayFinancialSummary(dayEvents);

    // Build CalendarEventData for each event
    const calendarEvents: CalendarEventData[] = dayEvents.map((event) => event);

    days.push({
      date: dateKey,
      dayOfMonth: isCurrentMonth ? dayOfMonth : 0,
      isCurrentMonth,
      isToday,
      weekOfYear,
      dayOfWeek,
      events: calendarEvents,
      financialSummary,
    });
  }

  return {
    year,
    month: month + 1,
    firstDayOfWeek,
    daysInMonth,
    days,
  };
}

/**
 * Calculate financial summary for a day
 */
function calculateDayFinancialSummary(events: Event[]): {
  totalIncome: string;
  totalExpenses: string;
  net: string;
  eventCount: number;
} {
  const totalIncome = new Decimal(0);
  const totalExpenses = new Decimal(0);

  events.forEach((event) => {
    const amount = new Decimal(event.amount);
    if (event.type === "INCOME") {
      totalIncome.plus(amount);
    } else if (event.type === "EXPENSE") {
      totalExpenses.plus(amount);
    }
  });

  const net = totalIncome.minus(totalExpenses);

  return {
    totalIncome: totalIncome.toString(),
    totalExpenses: totalExpenses.toString(),
    net: net.toString(),
    eventCount: events.length,
  };
}

/**
 * Get ISO week number for a date
 */
function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
