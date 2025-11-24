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

    // Fetch latest exchange rates from USD
    const baseCurrency = "USD"; // @TODO get from user_id preferences in the future
    const ratesMap = await getLatestRatesFromCurrency(baseCurrency);

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
