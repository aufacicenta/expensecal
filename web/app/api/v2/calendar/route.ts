import db from "@expensecal/database/db";
import { Category, Currency, initModels } from "@expensecal/database/models";
import { Event, EventType } from "@expensecal/database/models/Event";
import Decimal from "decimal.js";
import { NextResponse } from "next/server";

import {
  CalendarData,
  CalendarEvent,
  CalendarStatsData,
  GetCalendarResponse,
} from "./types";

import {
  addEventToStats,
  applyCarryForwardAndRecalculate,
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

    // Fetch latest exchange rates for currency conversion
    const baseCurrencySymbol = "USD"; // TODO: Pull from user.base_currency once implemented
    const exchangeRates = await getLatestRatesFromCurrency(baseCurrencySymbol);

    // Group events by year/month/day and calculate stats with carry-forward in single pass
    const calendarData: CalendarData = {};
    const stats: CalendarStatsData = {};

    // Track previous periods for boundary detection and carry-forward
    let prevDayDate: string | undefined;
    let prevMonthDate: string | undefined;
    let prevYearDate: string | undefined;

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
        (stats[year][month] as any)[day] = {
          totalIncome: "0",
          totalExpenses: "0",
          net: "0",
        };

        // Detect year boundary and apply carry-forward
        if (prevYearDate && prevYearDate !== year) {
          const prevYearNet = stats[prevYearDate].stats.net;

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

        // Detect month boundary and apply carry-forward
        if (prevMonthDate && prevMonthDate !== currentMonth) {
          const [prevYear, prevMonth] = prevMonthDate.split("-");
          const prevMonthNet = (stats[prevYear][prevMonth] as any).stats.net;

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

        // Detect day boundary and apply carry-forward
        if (prevDayDate && prevDayDate !== dateStr) {
          const [prevYear, prevMonth, prevDay] = prevDayDate.split("-");
          const prevDayNet = (stats[prevYear][prevMonth] as any)[prevDay].net;

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

      // Track previous dates for boundary detection
      prevDayDate = dateStr;
      prevMonthDate = currentMonth;
      prevYearDate = year;
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
