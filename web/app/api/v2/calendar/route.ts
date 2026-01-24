import db from "@expensecal/database/db";
import {
  Category,
  Currency,
  initModels,
  UserPreferences,
} from "@expensecal/database/models";
import { Event } from "@expensecal/database/models/Event";
import { NextResponse } from "next/server";

import { GetCalendarResponse } from "./types";

import { stackServerApp } from "@/stack/server";

/**
 * GET /api/v2/calendar
 * Fetch all calendar events for user as a flat array
 * Protected endpoint (requires authentication)
 *
 * Returns raw events for client-side processing.
 * Stats calculation and calendar structuring happens on the client
 * using exchange rates from ExchangeRatesContext.
 *
 * This approach accelerates fetching for growing event lists by:
 * - Eliminating server-side O(n) stats calculation loop
 * - Removing server-side currency conversion (client has rates)
 * - Reducing payload size (flat array vs nested structure)
 * - Enabling client-side caching of raw events
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

    // Fetch all events for the user - simple query, no processing
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

    // Return raw events - client will handle structuring and stats
    return NextResponse.json(
      {
        success: true,
        data: {
          events: events.map((e) => e.toJSON()),
          baseCurrency: baseCurrencySymbol,
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
        stage: "database",
      },
      { status: 500 },
    );
  }
}
