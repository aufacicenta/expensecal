import { toDateString } from "@/lib/date";
import { stackServerApp } from "@/stack/server";
import db from "@expensecal/database/db";
import { Category, Currency, initModels } from "@expensecal/database/models";
import { Event } from "@expensecal/database/models/Event";
import { NextResponse } from "next/server";
import { CalendarData, GetCalendarResponse } from "./types";

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

    // Group events by year/month/day
    const calendarData: CalendarData = {};

    events.forEach((event) => {
      const dateStr = toDateString(event.event_date);
      const [year, month, day] = dateStr.split("-");

      // Initialize year if not exists
      if (!calendarData[year]) {
        calendarData[year] = {};
      }

      // Initialize month if not exists
      if (!calendarData[year][month]) {
        calendarData[year][month] = {};
      }

      // Initialize day if not exists
      if (!calendarData[year][month][day]) {
        calendarData[year][month][day] = [];
      }

      // Add event to the day
      calendarData[year][month][day].push(event);
    });

    return NextResponse.json(
      {
        success: true,
        data: calendarData,
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
