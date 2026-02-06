import { NextRequest, NextResponse } from "next/server";

import {
  ValuateInventoryRequestBody,
  ValuateInventoryResponse,
  ValuationResultData,
} from "./types";

import { stackServerApp } from "@/stack/server";
import { valuateItems } from "@/lib/inventory/valuationService";
import { tavilyClient } from "@/lib/inventory/tavilyClient";

/**
 * POST /api/v1/inventory/valuate
 * Trigger valuation for specific inventory events
 * Protected endpoint (requires authentication)
 *
 * Request body:
 * - event_ids: Array of event IDs to valuate
 *
 * Behavior:
 * 1. Validate Tavily API availability
 * 2. Run valuation for each event in parallel
 * 3. Return results with success/failure for each
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ValuateInventoryResponse>> {
  try {
    // Authenticate user
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You must be logged in to valuate inventory items",
          stage: "validation",
        },
        { status: 401 },
      );
    }

    const body: ValuateInventoryRequestBody = await request.json();

    // Validate event_ids
    if (!body.event_ids || !Array.isArray(body.event_ids)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: "event_ids must be a non-empty array",
          stage: "validation",
        },
        { status: 400 },
      );
    }

    if (body.event_ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: "event_ids array cannot be empty",
          stage: "validation",
        },
        { status: 400 },
      );
    }

    // Limit batch size to prevent overload
    const MAX_BATCH_SIZE = 10;

    if (body.event_ids.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "Batch size exceeded",
          details: `Maximum ${MAX_BATCH_SIZE} items per request`,
          stage: "validation",
        },
        { status: 400 },
      );
    }

    // Check Tavily availability
    if (!tavilyClient.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Valuation service unavailable",
          details: "TAVILY_API_KEY is not configured",
          stage: "valuation",
        },
        { status: 503 },
      );
    }

    // Run valuations
    const valuationResults = await valuateItems(body.event_ids);

    // Transform results
    const results: ValuationResultData[] = valuationResults.map((r) => {
      if (r.success) {
        return {
          event_id: r.event_id,
          success: true,
          valuation: r.valuation,
          midpoint_value: r.midpoint_value,
        };
      } else {
        return {
          event_id: r.event_id,
          success: false,
          error: r.error,
          stage: r.stage,
        };
      }
    });

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json(
      {
        success: true,
        data: {
          results,
          summary: {
            total_requested: body.event_ids.length,
            successful,
            failed,
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Valuate inventory endpoint error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
        stage: "valuation",
      },
      { status: 500 },
    );
  }
}
