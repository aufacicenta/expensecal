import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Currency } from "@expensecal/database/models/Currency";
import { UserPreferences } from "@expensecal/database/models/UserPreferences";
import { NextRequest, NextResponse } from "next/server";

import {
  GetUserPreferencesResponse,
  UpdateUserPreferencesRequest,
  UpdateUserPreferencesResponse,
  UserPreferencesData,
} from "./types";

import { stackServerApp } from "@/stack/server";

/**
 * Helper function to get or create user preferences with USD as default
 */
async function getOrCreateUserPreferences(
  userId: string,
): Promise<UserPreferences> {
  // Try to find existing preferences
  let preferences = await UserPreferences.findOne({
    where: { user_id: userId },
    include: [
      {
        model: Currency,
        as: "baseCurrency",
        attributes: ["id", "symbol", "name"],
      },
    ],
  });

  // If no preferences exist, create with USD as default
  if (!preferences) {
    // Find USD currency
    const usdCurrency = await Currency.findOne({
      where: { symbol: "USD" },
    });

    if (!usdCurrency) {
      throw new Error("USD currency not found in database");
    }

    // Create default preferences
    preferences = await UserPreferences.create({
      user_id: userId,
      base_currency_id: usdCurrency.id,
    });

    // Reload with currency association
    preferences = await UserPreferences.findOne({
      where: { id: preferences.id },
      include: [
        {
          model: Currency,
          as: "baseCurrency",
          attributes: ["id", "symbol", "name"],
        },
      ],
    });

    if (!preferences) {
      throw new Error("Failed to create user preferences");
    }
  }

  return preferences;
}

/**
 * Helper function to format preferences for API response
 */
function formatPreferencesResponse(
  preferences: UserPreferences,
): UserPreferencesData {
  return {
    id: preferences.id,
    baseCurrency: {
      id: preferences.baseCurrency!.id,
      symbol: preferences.baseCurrency!.symbol,
      name: preferences.baseCurrency!.name,
    },
  };
}

/**
 * GET /api/v1/user-preferences
 * Fetch user preferences (creates default if not exists)
 * Protected endpoint (requires authentication)
 */
export async function GET(): Promise<NextResponse<GetUserPreferencesResponse>> {
  try {
    // Authenticate user with Stackframe
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You must be logged in to access preferences",
        },
        { status: 401 },
      );
    }

    // Initialize database models
    initModels(db);

    // Get or create preferences
    const preferences = await getOrCreateUserPreferences(user.id);

    return NextResponse.json(
      {
        success: true,
        data: formatPreferencesResponse(preferences),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get user preferences endpoint error:", error);

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

/**
 * PUT /api/v1/user-preferences
 * Update user preferences (base currency)
 * Protected endpoint (requires authentication)
 */
export async function PUT(
  request: NextRequest,
): Promise<NextResponse<UpdateUserPreferencesResponse>> {
  try {
    // Authenticate user with Stackframe
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You must be logged in to update preferences",
        },
        { status: 401 },
      );
    }

    // Parse request body
    const body: UpdateUserPreferencesRequest = await request.json();

    if (!body.baseCurrencyId) {
      return NextResponse.json(
        {
          success: false,
          error: "Bad request",
          details: "baseCurrencyId is required",
        },
        { status: 400 },
      );
    }

    // Initialize database models
    initModels(db);

    // Verify the currency exists
    const currency = await Currency.findByPk(body.baseCurrencyId);

    if (!currency) {
      return NextResponse.json(
        {
          success: false,
          error: "Bad request",
          details: "Currency not found",
        },
        { status: 400 },
      );
    }

    // Get or create preferences
    let preferences = await UserPreferences.findOne({
      where: { user_id: user.id },
    });

    if (preferences) {
      // Update existing preferences
      await preferences.update({
        base_currency_id: body.baseCurrencyId,
      });
    } else {
      // Create new preferences
      preferences = await UserPreferences.create({
        user_id: user.id,
        base_currency_id: body.baseCurrencyId,
      });
    }

    // Reload with currency association
    preferences = await UserPreferences.findOne({
      where: { id: preferences.id },
      include: [
        {
          model: Currency,
          as: "baseCurrency",
          attributes: ["id", "symbol", "name"],
        },
      ],
    });

    if (!preferences) {
      throw new Error("Failed to update user preferences");
    }

    return NextResponse.json(
      {
        success: true,
        data: formatPreferencesResponse(preferences),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update user preferences endpoint error:", error);

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
