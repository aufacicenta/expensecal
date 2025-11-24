import {
  addEventToStats,
  applyCascadeForwardStats,
  calculateNetFromSummary,
  calculatePercentChange,
  convertAmount,
} from "@/lib/calendar/stats";
import { toDateString } from "@/lib/date";
import { getLatestRatesFromCurrency } from "@/lib/exchange-rates";
import { stackServerApp } from "@/stack/server";
import db from "@expensecal/database/db";
import { Category, Currency, initModels } from "@expensecal/database/models";
import { Event, EventType } from "@expensecal/database/models/Event";
import Decimal from "decimal.js";
import { NextResponse } from "next/server";
import {
  CalendarData,
  CalendarEvent,
  CalendarStatsData,
  FinancialSummary,
  GetCalendarResponse,
} from "./types";

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

    // Group events by year/month/day and calculate stats in single pass
    const calendarData: CalendarData = {};
    const stats: CalendarStatsData = {};

    for (const event of events) {
      const dateStr = toDateString(event.event_date);
      const [year, month, day] = dateStr.split("-");

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

      // Use helper to add event to stats at all levels
      addEventToStats(
        stats,
        convertedAmount,
        event.type === EventType.INCOME ? "INCOME" : "EXPENSE",
        year,
        month,
        day,
      );
    }

    // Calculate net for all stats levels
    for (const year in stats) {
      const yearData = stats[year];
      yearData.stats.net = calculateNetFromSummary(
        yearData.stats.totalIncome,
        yearData.stats.totalExpenses,
      );

      for (const month in yearData) {
        if (month !== "stats") {
          const monthData = yearData[month] as Record<string, FinancialSummary>;
          if ("stats" in monthData) {
            (monthData as any).stats.net = calculateNetFromSummary(
              (monthData as any).stats.totalIncome,
              (monthData as any).stats.totalExpenses,
            );

            for (const day in monthData) {
              if (day !== "stats") {
                const dayStats = monthData[day];
                dayStats.net = calculateNetFromSummary(
                  dayStats.totalIncome,
                  dayStats.totalExpenses,
                );
              }
            }
          }
        }
      }
    }

    // Apply carry-forward cascade to propagate net balances
    const sortedYearsForCarryForward = Object.keys(stats).sort();
    if (sortedYearsForCarryForward.length > 0) {
      applyCascadeForwardStats(stats, sortedYearsForCarryForward[0]);
    }

    // Calculate percentage changes for all stats levels
    const sortedYears = Object.keys(stats).sort();
    let prevYearStats: FinancialSummary | undefined;

    for (const year of sortedYears) {
      const yearData = stats[year];

      // Calculate year-level percentage changes
      (yearData.stats as any).totalIncomePercentChange = calculatePercentChange(
        yearData.stats.totalIncome,
        prevYearStats?.totalIncome,
      );
      (yearData.stats as any).totalExpensesPercentChange =
        calculatePercentChange(
          yearData.stats.totalExpenses,
          prevYearStats?.totalExpenses,
        );
      (yearData.stats as any).netPercentChange = calculatePercentChange(
        yearData.stats.net,
        prevYearStats?.net,
      );

      // Track previous year for next iteration
      prevYearStats = {
        totalIncome: yearData.stats.totalIncome,
        totalExpenses: yearData.stats.totalExpenses,
        net: yearData.stats.net,
      };

      // Process months within this year
      const sortedMonths = Object.keys(yearData)
        .filter((key) => key !== "stats")
        .sort();
      let prevMonthStats: FinancialSummary | undefined;

      for (const month of sortedMonths) {
        const monthData = yearData[month] as any;

        // Calculate month-level percentage changes
        monthData.stats.totalIncomePercentChange = calculatePercentChange(
          monthData.stats.totalIncome,
          prevMonthStats?.totalIncome,
        );
        monthData.stats.totalExpensesPercentChange = calculatePercentChange(
          monthData.stats.totalExpenses,
          prevMonthStats?.totalExpenses,
        );
        monthData.stats.netPercentChange = calculatePercentChange(
          monthData.stats.net,
          prevMonthStats?.net,
        );

        // Track previous month for next iteration
        prevMonthStats = {
          totalIncome: monthData.stats.totalIncome,
          totalExpenses: monthData.stats.totalExpenses,
          net: monthData.stats.net,
        };

        // Process days within this month
        const sortedDays = Object.keys(monthData)
          .filter((key) => key !== "stats")
          .sort();
        let prevDayStats: FinancialSummary | undefined;

        for (const day of sortedDays) {
          const dayStats = monthData[day];

          // Calculate day-level percentage changes
          dayStats.totalIncomePercentChange = calculatePercentChange(
            dayStats.totalIncome,
            prevDayStats?.totalIncome,
          );
          dayStats.totalExpensesPercentChange = calculatePercentChange(
            dayStats.totalExpenses,
            prevDayStats?.totalExpenses,
          );
          dayStats.netPercentChange = calculatePercentChange(
            dayStats.net,
            prevDayStats?.net,
          );

          // Track previous day for next iteration
          prevDayStats = {
            totalIncome: dayStats.totalIncome,
            totalExpenses: dayStats.totalExpenses,
            net: dayStats.net,
          };
        }
      }
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
