import { getLiteLLMParser } from "@/lib/parser/litellmParser";
import { stackServerApp } from "@/stack/server";
import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Currency } from "@expensecal/database/models/Currency";
import { Event, EventType } from "@expensecal/database/models/Event";
import { NextRequest, NextResponse } from "next/server";
import { CreateFromTextRequestBody, CreateFromTextResponse } from "./types";

/**
 * POST /api/v1/events/create-from-text
 * Parse natural language text and create an event in one call
 * Protected endpoint (requires authentication)
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<CreateFromTextResponse>> {
  try {
    // Authenticate user with Stackframe
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You must be logged in to create events",
        },
        { status: 401 },
      );
    }

    const body: CreateFromTextRequestBody = await request.json();

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

    // Get parser instance (Ollama or LiteLLM based on env)
    const parser = getLiteLLMParser();

    // Check if Ollama is available
    const health = await parser.checkHealth();
    if (!health.available) {
      return NextResponse.json(
        {
          success: false,
          error: "LLM parser unavailable",
          details: health.error || "Ollama service is not running",
          stage: "parsing",
        },
        { status: 503 },
      );
    }

    // Parse the text
    const parseResult = await parser.parse(body.text, currentDate);

    // Check if parsing failed
    if ("error" in parseResult) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error,
          details: parseResult.details,
          stage: "parsing",
        },
        { status: 422 },
      );
    }

    // Initialize database models
    initModels(db);

    // Look up currency by symbol
    const currency = await Currency.findOne({
      where: {
        symbol: parseResult.currency,
      },
    });

    if (!currency) {
      return NextResponse.json(
        {
          success: false,
          error: "Currency not found",
          details: `No currency found with symbol: ${parseResult.currency}. Please use a supported currency.`,
          stage: "currency_lookup",
        },
        { status: 404 },
      );
    }

    // Create the event
    const event = await Event.create({
      user_id: user.id,
      type: parseResult.type as EventType,
      amount: String(parseResult.amount),
      currency_id: currency.id,
      quantity: parseResult.quantity,
      description: parseResult.description,
      event_date: new Date(parseResult.event_date),
      parent_event_id: null,
      recurrence_rule: null,
      recurrence_end_date: null,
    });

    // Return created event with parsed data
    return NextResponse.json(
      {
        success: true,
        data: {
          event: {
            id: event.id,
            user_id: event.user_id,
            type: event.type,
            amount: event.amount,
            currency_id: event.currency_id,
            quantity: event.quantity,
            description: event.description,
            event_date: event.event_date.toISOString(),
            parent_event_id: event.parent_event_id,
            recurrence_rule: event.recurrence_rule,
            recurrence_end_date:
              event.recurrence_end_date?.toISOString() || null,
            created_at: event.created_at.toISOString(),
            updated_at: event.updated_at.toISOString(),
          },
          parsed: parseResult,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create from text endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
        stage: "creation",
      },
      { status: 500 },
    );
  }
}
