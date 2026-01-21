import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Currency } from "@expensecal/database/models/Currency";
import { Event, EventType } from "@expensecal/database/models/Event";
import { NextRequest, NextResponse } from "next/server";

import {
  CreateFromTextRequestBody,
  CreateFromTextResponse,
  CreateFromTextSuccessResponse,
} from "./types";

import {
  createInstallments,
  createRecurringEvents,
} from "@/lib/events/createInstallments";
import { getParserInstance } from "@/lib/parser/parserFactory";
import {
  createValidationErrorResponse,
  validateISO8601Date,
  validateRequiredString,
} from "@/lib/validators";
import { stackServerApp } from "@/stack/server";

/**
 * POST /api/v1/events/create-from-text
 * Parse natural language text, create an event, and optionally create recurring events or installments in one call
 * Protected endpoint (requires authentication)
 *
 * Request body:
 * - text: Natural language text to parse (required)
 * - current_date: ISO 8601 format date for context (optional)
 * - create_installments: If true and event has recurrence_rule, automatically create installments (optional, default false)
 *
 * Behavior:
 * - If split_installments from parser is true: creates installments (amount split across instances)
 * - If split_installments from parser is false: creates recurring events (same amount for each instance)
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

    // Get parser instance (Local LM Studio for dev, LiteLLM for production/staging)
    const parser = getParserInstance();

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
      recurrence_rule: parseResult.recurrence_rule || null,
      recurrence_end_date: parseResult.recurrence_end_date
        ? new Date(parseResult.recurrence_end_date)
        : null,
      original_text: body.text,
    });

    // Prepare response data
    const eventData = {
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
      recurrence_end_date: event.recurrence_end_date?.toISOString() || null,
      original_text: event.original_text || null,
      created_at: event.created_at.toISOString(),
      updated_at: event.updated_at.toISOString(),
    };

    const responseData: CreateFromTextSuccessResponse["data"] = {
      event: eventData,
      parsed: parseResult,
    };

    // Create installments or recurring events if event has recurrence rule
    if (event.recurrence_rule && parseResult.recurrence_rule) {
      try {
        const shouldSplitAmount = parseResult.split_installments === true;

        if (shouldSplitAmount) {
          // Create installments (split amount across instances)
          const installmentsResult = await createInstallments({
            parentEventId: event.id,
            splitAmount: true,
          });

          if (!installmentsResult.success) {
            return NextResponse.json(
              {
                success: false,
                error: "Failed to create installments",
                details: installmentsResult.error,
                stage: "installments",
              },
              { status: 400 },
            );
          }

          // Fetch installment events with fresh data
          const installmentEvents = await Event.findAll({
            where: {
              id: installmentsResult.installmentIds,
            },
            order: [["event_date", "ASC"]],
          });

          // Calculate amount per installment
          const amountPerInstallment = installmentEvents.length
            ? installmentEvents[0].amount
            : "0";

          // Fetch updated parent event
          const updatedParent = await Event.findByPk(event.id);

          if (!updatedParent) {
            return NextResponse.json(
              {
                success: false,
                error:
                  "Failed to retrieve parent event after installment creation",
                stage: "installments",
              },
              { status: 500 },
            );
          }

          responseData.installments = {
            parent_event: updatedParent.toJSON(),
            installments: installmentEvents.map((inst) => inst),
            installment_count: installmentsResult.installmentCount,
            amount_per_installment: amountPerInstallment,
          };
        } else {
          // Create recurring events (same amount for each instance)
          const recurringResult = await createRecurringEvents({
            parentEventId: event.id,
          });

          if (!recurringResult.success) {
            return NextResponse.json(
              {
                success: false,
                error: "Failed to create recurring events",
                details: recurringResult.error,
                stage: "installments",
              },
              { status: 400 },
            );
          }

          // Fetch recurring events with fresh data
          const recurringEvents = await Event.findAll({
            where: {
              id: recurringResult.recurringEventIds,
            },
            order: [["event_date", "ASC"]],
          });

          // Fetch updated parent event
          const updatedParent = await Event.findByPk(event.id);

          if (!updatedParent) {
            return NextResponse.json(
              {
                success: false,
                error:
                  "Failed to retrieve parent event after recurring events creation",
                stage: "installments",
              },
              { status: 500 },
            );
          }

          responseData.recurring_events = {
            parent_event: updatedParent.toJSON(),
            recurring_events: recurringEvents.map((evt) => evt),
            recurring_event_count: recurringResult.recurringEventCount,
          };
        }
      } catch (error) {
        console.error("Error creating recurrence events:", error);

        return NextResponse.json(
          {
            success: false,
            error: "Failed to create recurrence events",
            details: error instanceof Error ? error.message : String(error),
            stage: "installments",
          },
          { status: 400 },
        );
      }
    }

    // Return created event with parsed data and optional installments or recurring events
    return NextResponse.json(
      {
        success: true,
        data: responseData,
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
