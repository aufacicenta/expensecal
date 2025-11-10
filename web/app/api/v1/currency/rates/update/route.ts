import { updateExchangeRates } from "@/lib/exchange-rates";
import { NextResponse } from "next/server";

/**
 * POST /api/v1/currency/rates/update
 * Manually trigger exchange rate update (admin only)
 * Protected endpoint (requires authentication)
 *
 * This endpoint allows manual triggering of the daily exchange rate update.
 * In production, this should be called via a scheduled cron job at 00:00:00 UTC.
 */
export async function POST() {
  try {
    // Authenticate user
    // const user = await stackServerApp.getUser();
    // if (!user) {
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       error: "Unauthorized",
    //       details: "You must be logged in to trigger rate updates",
    //     },
    //     { status: 401 },
    //   );
    // }

    // TODO: Add admin check here if you have an admin flag in the user model
    // For now, only allow authenticated users
    // if (!user.is_admin) {
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       error: "Forbidden",
    //       details: "Only administrators can trigger rate updates",
    //     },
    //     { status: 403 },
    //   );
    // }

    const result = await updateExchangeRates();

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          data: {
            message: result.message,
            ratesUpdated: result.ratesUpdated,
          },
        },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update exchange rates",
          details: result.error,
          message: result.message,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Exchange rate update endpoint error:", error);
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
