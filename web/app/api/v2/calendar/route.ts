import db from "@expensecal/database/db";
import {
  Category,
  Currency,
  initModels,
  UserPreferences,
} from "@expensecal/database/models";
import { Event, EventType } from "@expensecal/database/models/Event";
import Decimal from "decimal.js";
import { NextResponse } from "next/server";

import {
  CalendarData,
  CalendarEvent,
  CalendarStatsData,
  GetCalendarResponse,
  MonthStats,
} from "./types";

import {
  addEventToStats,
  applyCarryForwardAndRecalculate,
  calculatePercentChange,
  convertAmount,
  recalculateNetsAfterUpdate,
} from "@/lib/calendar/stats";
import { toDateString } from "@/lib/date";
import { getLatestRatesFromCurrency } from "@/lib/exchange-rates";
import { stackServerApp } from "@/stack/server";

/**
 * GET /api/v2/calendar
 * Fetch all calendar events for user, organized by year/month/day
 * Protected endpoint (requires authentication)
 *
 * Returns events grouped by year > month > day structure without calculations or conversions
 */
export async function GET(): Promise<NextResponse<GetCalendarResponse>> {
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

    // Initialize database models
    initModels(db);

    // Fetch all events for the user
    const events = await Event.findAll({
      where: {
        user_id: user.id,
      },
      include: [
        {
          model: Event,
          as: "childEvents",
          include: [
            {
              model: Currency,
              as: "currency",
              attributes: ["id", "symbol", "name"],
            },
          ],
        },
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

    // Get user's base currency preference
    const userPrefs = await UserPreferences.findOne({
      where: { user_id: user.id },
      include: [
        {
          model: Currency,
          as: "baseCurrency",
          attributes: ["id", "symbol", "name"],
        },
      ],
    });
    const baseCurrencySymbol = userPrefs?.baseCurrency?.symbol || "USD";

    // Fetch latest exchange rates for currency conversion
    // Always fetch from USD as the hub currency, then convert to user's base currency
    const exchangeRates = await getLatestRatesFromCurrency("USD");

    // Group events by year/month/day and calculate stats with carry-forward in single pass
    const calendarData: CalendarData = {};
    const stats: CalendarStatsData = {};

    // Track previous periods for boundary detection, carry-forward, and percentage calculations
    let prevDayDate: string | undefined;
    let prevMonthDate: string | undefined;
    let prevYearDate: string | undefined;
    let prevDayNet: string | undefined;
    let prevMonthNet: string | undefined;
    let prevYearNet: string | undefined;

    // Track last closed period's nets for percentage change calculation
    let lastClosedDayNet: string | undefined;
    let lastClosedMonthNet: string | undefined;
    let lastClosedYearNet: string | undefined;

    for (const event of events) {
      const dateStr = toDateString(event.event_date);
      const [year, month, day] = dateStr.split("-");
      const currentMonth = `${year}-${month}`;

      // Initialize year structure if not exists
      if (!calendarData[year]) {
        calendarData[year] = {};
        stats[year] = {
          stats: {
            totalIncome: "0",
            totalExpenses: "0",
            net: "0",
          },
        };
      }

      // Initialize month structure if not exists
      if (!calendarData[year][month]) {
        calendarData[year][month] = {};
        stats[year][month] = {
          stats: {
            totalIncome: "0",
            totalExpenses: "0",
            net: "0",
          },
        };
      }

      // Initialize day structure if not exists
      if (!calendarData[year][month][day]) {
        calendarData[year][month][day] = [];
        (stats[year][month] as MonthStats)[day] = {
          totalIncome: "0",
          totalExpenses: "0",
          net: "0",
        };

        // Detect year boundary
        if (prevYearDate && prevYearDate !== year) {
          // Calculate % change for year we're leaving (after all events added to it)
          const prevYearStats = stats[prevYearDate!].stats;

          prevYearStats.netPercentChange = calculatePercentChange(
            prevYearStats.net,
            lastClosedYearNet,
          );

          lastClosedYearNet = prevYearStats.net;

          // Apply carry-forward for new year
          applyCarryForwardAndRecalculate(
            stats,
            year,
            month,
            day,
            prevYearNet,
            undefined,
            undefined,
          );
        }

        // Detect month boundary
        if (prevMonthDate && prevMonthDate !== currentMonth) {
          // Calculate % change for month we're leaving (after all events added to it)
          const [prevYear, prevMonth] = prevMonthDate.split("-");
          const prevMonthStats = (stats[prevYear][prevMonth] as MonthStats)
            .stats;

          prevMonthStats.netPercentChange = calculatePercentChange(
            prevMonthStats.net,
            lastClosedMonthNet,
          );

          lastClosedMonthNet = prevMonthStats.net;

          // Apply carry-forward for new month
          applyCarryForwardAndRecalculate(
            stats,
            year,
            month,
            day,
            undefined,
            prevMonthNet,
            undefined,
          );
        }

        // Detect day boundary
        if (prevDayDate && prevDayDate !== dateStr) {
          // Calculate % change for day we're leaving (after all events added to it)
          const prevDayComponent = prevDayDate!.split("-")[2];
          const prevDayStats = (
            stats[prevYearDate!][prevMonthDate!.split("-")[1]] as MonthStats
          )[prevDayComponent];

          if (prevDayStats) {
            prevDayStats.netPercentChange = calculatePercentChange(
              prevDayStats.net,
              lastClosedDayNet,
            );

            lastClosedDayNet = prevDayStats.net;
          }

          // Apply carry-forward for new day
          applyCarryForwardAndRecalculate(
            stats,
            year,
            month,
            day,
            undefined,
            undefined,
            prevDayNet,
          );
        }
      }

      // Convert amount once
      const amount = new Decimal(event.amount).times(event.quantity);
      const currencySymbol = event.currency?.symbol || "UNKNOWN";
      const convertedAmount = convertAmount(
        amount,
        currencySymbol,
        baseCurrencySymbol,
        exchangeRates,
      );

      // Create calendar event with converted exchange rate
      const calendarEvent: CalendarEvent = {
        ...event.toJSON(),
        exchangeRate: convertedAmount.toString(),
      };

      // Add event to the day
      calendarData[year][month][day].push(calendarEvent);

      // Add event to stats at all levels
      addEventToStats(
        stats,
        convertedAmount,
        event.type === EventType.INCOME ? "INCOME" : "EXPENSE",
        year,
        month,
        day,
      );

      // Recalculate nets after adding event
      recalculateNetsAfterUpdate(stats, year, month, day);

      // Track previous dates and net values for boundary detection
      prevDayDate = dateStr;
      prevMonthDate = currentMonth;
      prevYearDate = year;
      prevDayNet = (stats[year][month] as MonthStats)[day].net;
      prevMonthNet = (stats[year][month] as MonthStats).stats.net;
      prevYearNet = stats[year].stats.net;
    }

    // Calculate % change for final day/month/year (after all events processed)
    if (prevDayDate && prevYearDate && prevMonthDate) {
      const prevDayComponent = prevDayDate.split("-")[2];
      const lastDayStats = (
        stats[prevYearDate][prevMonthDate.split("-")[1]] as MonthStats
      )[prevDayComponent];

      if (lastDayStats) {
        lastDayStats.netPercentChange = calculatePercentChange(
          lastDayStats.net,
          lastClosedDayNet,
        );
      }
    }

    if (prevMonthDate && prevYearDate) {
      const [prevYear, prevMonth] = prevMonthDate.split("-");
      const lastMonthStats = (stats[prevYear][prevMonth] as MonthStats).stats;

      lastMonthStats.netPercentChange = calculatePercentChange(
        lastMonthStats.net,
        lastClosedMonthNet,
      );
    }

    if (prevYearDate) {
      const lastYearStats = stats[prevYearDate].stats;

      lastYearStats.netPercentChange = calculatePercentChange(
        lastYearStats.net,
        lastClosedYearNet,
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          calendar: calendarData,
          stats,
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
