import db from "@expensecal/database/db";
import {
  Currency,
  initModels,
  UserPreferences,
} from "@expensecal/database/models";
import { NextResponse } from "next/server";

import { GetExchangeRatesResponse } from "./types";

import { getLatestRatesFromCurrency } from "@/lib/exchange-rates";
import { stackServerApp } from "@/stack/server";

/**
 * GET /api/v1/exchange-rates
 * Fetch the latest exchange rates for all currencies
 * Protected endpoint (requires authentication)
 *
 * Returns exchange rates from USD as base currency to all available currencies
 */
export async function GET(): Promise<NextResponse<GetExchangeRatesResponse>> {
  try {
    // Authenticate user with Stackframe
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You must be logged in to access exchange rates",
        },
        { status: 401 },
      );
    }

    // Initialize database models
    initModels(db);

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
    const baseCurrency = userPrefs?.baseCurrency?.symbol || "USD";

    // Fetch latest exchange rates from USD (always the hub currency)
    const ratesMap = await getLatestRatesFromCurrency("USD");

    // Convert Map to plain object for JSON serialization
    const rates: Record<string, string> = {};

    ratesMap.forEach((rate, symbol) => {
      rates[symbol] = rate;
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          rates,
          baseCurrency,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Exchange rates endpoint error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
        stage: "fetch",
      },
      { status: 500 },
    );
  }
}
