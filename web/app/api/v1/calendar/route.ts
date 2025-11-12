import {
  addMonths,
  endOfMonth,
  getWeekNumber,
  parseMonthString,
  startOfMonth,
  toDateString,
  toMonthString,
} from "@/lib/date";
import {
  convertCurrency,
  getLatestRatesFromCurrency,
} from "@/lib/exchange-rates";
import { stackServerApp } from "@/stack/server";
import { Op } from "@expensecal/database";
import db from "@expensecal/database/db";
import { Category, initModels } from "@expensecal/database/models";
import { Currency } from "@expensecal/database/models/Currency";
import { Event, EventType } from "@expensecal/database/models/Event";
import { Decimal } from "decimal.js";
import { NextRequest, NextResponse } from "next/server";
import {
  CalendarDay,
  CalendarEventData,
  CalendarMonth,
  GetCalendarResponse,
  MonthlyFinancialSummary,
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
    let requestedMonth: Date;
    try {
      requestedMonth = monthParam ? parseMonthString(monthParam) : new Date();
    } catch (err) {
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
    const rangeStart = startOfMonth(addMonths(requestedMonth, -monthsRange));
    const rangeEnd = endOfMonth(addMonths(requestedMonth, monthsRange));

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
          as: "currency",
          attributes: ["id", "symbol", "name"],
        },
        {
          model: Category,
          as: "categories",
          through: {
            as: "event_categories",
          },
        },
      ],
      order: [["event_date", "ASC"]],
    });

    // Fetch latest exchange rates for currency conversion
    const baseCurrencySymbol = "USD"; // TODO: Pull from user.base_currency once implemented
    const exchangeRates = await getLatestRatesFromCurrency(baseCurrencySymbol);

    // Group events by date for quick lookup
    const eventsByDate = new Map<string, Event[]>();
    events.forEach((event) => {
      const dateKey = toDateString(event.event_date);
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
      monthDate.setUTCMonth(monthDate.getUTCMonth() + i);

      const month = buildCalendarMonth(
        monthDate,
        eventsByDate,
        baseCurrencySymbol,
        exchangeRates,
      );
      months.push(month);
    }

    // Determine if more months exist in past/future
    const hasMorePast =
      rangeStart > new Date(Date.UTC(rangeStart.getUTCFullYear(), 0, 1));
    const hasMoreFuture =
      rangeEnd < new Date(Date.UTC(rangeEnd.getUTCFullYear(), 11, 31));

    // Format month string for response
    const monthStr = toMonthString(requestedMonth);

    // Calculate monthly financial summary for the requested month
    const requestedMonthStart = startOfMonth(requestedMonth);
    const requestedMonthEnd = endOfMonth(requestedMonth);

    const requestedMonthEvents = events.filter(
      (event) =>
        event.event_date >= requestedMonthStart &&
        event.event_date <= requestedMonthEnd,
    );

    const monthlyFinancialSummary = calculateMonthlyFinancialSummary(
      requestedMonthEvents,
      baseCurrencySymbol,
      exchangeRates,
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          months,
          monthlyFinancialSummary,
          metadata: {
            requestedMonth: monthStr,
            monthsRequested: monthsRange,
            totalMonths: 2 * monthsRange + 1,
            dateRange: {
              start: toDateString(rangeStart),
              end: toDateString(rangeEnd),
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
 * Build calendar month structure with all days and events
 */
function buildCalendarMonth(
  monthDate: Date,
  eventsByDate: Map<string, Event[]>,
  baseCurrencySymbol: string,
  exchangeRates: Map<string, string>,
): CalendarMonth {
  const year = monthDate.getUTCFullYear();
  const month = monthDate.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstDayOfWeek = new Date(Date.UTC(year, month, 1)).getUTCDay();

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
      cellDate = new Date(Date.UTC(year, month, dayOfMonth));
    } else if (i < firstDayOfWeek) {
      // Previous month
      const prevMonth = new Date(Date.UTC(year, month, 0));
      const prevMonthDays = prevMonth.getUTCDate();
      cellDate = new Date(
        Date.UTC(year, month - 1, prevMonthDays - (firstDayOfWeek - i - 1)),
      );
    } else {
      // Next month
      cellDate = new Date(
        Date.UTC(year, month + 1, i - firstDayOfWeek - daysInMonth + 1),
      );
    }

    const dateKey = toDateString(cellDate);
    const isToday = cellDate.getTime() === today.getTime();
    const weekOfYear = getWeekNumber(cellDate);
    const dayOfWeek = cellDate.getUTCDay();

    // Get events for this day
    const dayEvents = eventsByDate.get(dateKey) || [];

    // Calculate financial summary for the day (with currency conversion)
    const financialSummary = calculateDayFinancialSummary(
      dayEvents,
      baseCurrencySymbol,
      exchangeRates,
    );

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
 * Converts all events to the base currency using exchange rates
 */
function calculateDayFinancialSummary(
  events: Event[],
  baseCurrencySymbol: string,
  exchangeRates: Map<string, string>,
): CalendarDay["financialSummary"] {
  let totalIncome = new Decimal(0);
  let totalExpenses = new Decimal(0);

  for (const event of events) {
    const amount = new Decimal(event.amount).times(event.quantity || 1);
    const currencySymbol = event.currency?.symbol || "UNKNOWN";

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
    eventCount: events.length,
    baseCurrencySymbol,
  };
}

/**
 * Calculate monthly financial summary for all events in a given month
 * Returns totals grouped by currency and converted to base currency
 *
 * Uses hub-and-spoke exchange rate model where all rates are relative to USD.
 *
 * TODO: Future enhancements to this function:
 * - Add category-wise breakdown (e.g., Food, Transport, Utilities)
 * - Include expense/income distribution percentages
 * - Add trend analysis (comparison with previous months)
 * - Add average daily spending/income
 * - Include recurring vs one-time event totals
 * - Add most frequent categories and top transactions
 * - Support user preference for base currency (currently assumes USD)
 */
function calculateMonthlyFinancialSummary(
  events: Event[],
  baseCurrencySymbol: string,
  exchangeRates: Map<string, string>,
): MonthlyFinancialSummary {
  const currencySummaries = new Map<
    string,
    {
      symbol: string;
      totalIncome: Decimal;
      totalExpenses: Decimal;
      eventCount: number;
    }
  >();

  for (const event of events) {
    const currencyId = event.currency_id;
    const amount = new Decimal(event.amount).times(event.quantity || 1);

    if (!currencySummaries.has(currencyId)) {
      currencySummaries.set(currencyId, {
        symbol: event.currency?.symbol || "UNKNOWN",
        totalIncome: new Decimal(0),
        totalExpenses: new Decimal(0),
        eventCount: 0,
      });
    }

    const summary = currencySummaries.get(currencyId)!;
    summary.eventCount++;

    if (event.type === EventType.INCOME) {
      summary.totalIncome = summary.totalIncome.plus(amount);
    } else if (event.type === EventType.EXPENSE) {
      summary.totalExpenses = summary.totalExpenses.plus(amount);
    }
  }

  // Build response grouped by currency
  const byCurrency: MonthlyFinancialSummary["byCurrency"] = {};

  let totalIncome = new Decimal(0);
  let totalExpenses = new Decimal(0);
  let eventCount = 0;

  currencySummaries.forEach((summary, currencyId) => {
    const net = summary.totalIncome.minus(summary.totalExpenses);
    byCurrency[currencyId] = {
      symbol: summary.symbol,
      totalIncome: summary.totalIncome.toString(),
      totalExpenses: summary.totalExpenses.toString(),
      net: net.toString(),
      eventCount: summary.eventCount,
    };

    // Convert amounts to base currency if not already
    const currencySymbol = summary.symbol;
    if (currencySymbol === baseCurrencySymbol) {
      // Direct sum, no conversion needed
      totalIncome = totalIncome.plus(summary.totalIncome);
      totalExpenses = totalExpenses.plus(summary.totalExpenses);
    } else if (currencySymbol !== "UNKNOWN") {
      // Get exchange rate for this currency
      const rate = exchangeRates.get(currencySymbol);
      if (rate) {
        // Convert using hub-and-spoke model: (amount / rate) * 1
        // Since we're converting to USD (base 1.0), we divide by the rate
        const convertedIncome = new Decimal(
          convertCurrency(
            summary.totalIncome.toString(),
            rate,
            "1", // Base currency rate is always 1
          ),
        );
        const convertedExpenses = new Decimal(
          convertCurrency(summary.totalExpenses.toString(), rate, "1"),
        );
        totalIncome = totalIncome.plus(convertedIncome);
        totalExpenses = totalExpenses.plus(convertedExpenses);
      } else {
        // Rate not found, log warning but continue
        console.warn(
          `Exchange rate not found for ${currencySymbol}, skipping conversion`,
        );
      }
    }
    eventCount++;
  });

  const net = totalIncome.minus(totalExpenses);

  return {
    byCurrency,
    baseCurrency: {
      totalIncome: totalIncome.toString(),
      totalExpenses: totalExpenses.toString(),
      net: net.toString(),
      symbol: baseCurrencySymbol,
      eventCount,
    },
  };
}
