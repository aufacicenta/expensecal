import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Currency } from "@expensecal/database/models/Currency";
import { NextRequest, NextResponse } from "next/server";

import { GetCurrenciesResponse } from "./types";

import { stackServerApp } from "@/stack/server";

/**
 * GET /api/v1/currencies
 * Fetch all available currencies
 * Protected endpoint (requires authentication)
 */
export async function GET(
  _request: NextRequest,
): Promise<NextResponse<GetCurrenciesResponse>> {
  try {
    // Authenticate user with Stackframe
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You must be logged in to fetch currencies",
        },
        { status: 401 },
      );
    }

    // Initialize database models
    initModels(db);

    // Fetch all currencies
    const currencies = await Currency.findAll({
      order: [["name", "ASC"]],
    });

    // Return currencies
    return NextResponse.json(
      {
        success: true,
        data: currencies,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get currencies endpoint error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
