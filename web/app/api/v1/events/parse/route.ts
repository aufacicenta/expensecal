import { getLocalLMStudioParser } from "@/lib/parser/localLMStudioParser";
import {
  createValidationErrorResponse,
  validateISO8601Date,
  validateRequiredString,
} from "@/lib/validators";
import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Currency } from "@expensecal/database/models/Currency";
import { NextRequest, NextResponse } from "next/server";
import { ParseRequestBody, ParseResponse } from "./types";

/**
 * POST /api/v1/events/parse
 * Parse natural language expense text into structured data
 * Public endpoint (no authentication required)
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ParseResponse>> {
  try {
    const body: ParseRequestBody = await request.json();

    // Validate text
    const textError = validateRequiredString(body.text, "text");
    if (textError) {
      return createValidationErrorResponse(textError);
    }

    // Validate current_date if provided
    const currentDateResult = validateISO8601Date(
      body.current_date,
      "current_date",
      false,
    );
    if (currentDateResult.error) {
      return createValidationErrorResponse(currentDateResult.error);
    }
    const currentDate = currentDateResult.date ?? undefined;

    const parser = getLocalLMStudioParser();

    // Check if LM Studio is available
    const health = await parser.checkHealth();
    if (!health.available) {
      return NextResponse.json(
        {
          success: false,
          error: "LLM parser unavailable",
          details: health.error || "LM Studio service is not running",
        },
        { status: 503 },
      );
    }

    // Parse the text
    const result = await parser.parse(body.text, currentDate);

    // Check if parsing failed
    if ("error" in result) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          details: result.details,
        },
        { status: 422 },
      );
    }

    // Initialize database models and lookup currency by symbol
    initModels(db);
    const currency = await Currency.findOne({
      where: { symbol: result.currency },
    });

    if (!currency) {
      return NextResponse.json(
        {
          success: false,
          error: "Currency not found",
          details: `No currency found with symbol: ${result.currency}`,
        },
        { status: 422 },
      );
    }

    // Add currency_id to the result
    const resultWithCurrencyId = {
      ...result,
      currency_id: currency.id,
    };

    // Return parsed data with currency_id
    return NextResponse.json(
      {
        success: true,
        data: resultWithCurrencyId,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Parse endpoint error:", error);
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
