import { getLocalLMStudioParser } from "@/lib/parser/localLMStudioParser";
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

    // Validate request body
    if (
      !body.text ||
      typeof body.text !== "string" ||
      body.text.trim().length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: "Field 'text' is required and must be a non-empty string",
        },
        { status: 400 },
      );
    }

    // Parse current_date if provided
    let currentDate: Date | undefined;
    if (body.current_date) {
      currentDate = new Date(body.current_date);
      if (isNaN(currentDate.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid current_date",
            details: "current_date must be a valid ISO 8601 date string",
          },
          { status: 400 },
        );
      }
    }

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

    // Return parsed data
    return NextResponse.json(
      {
        success: true,
        data: result,
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
