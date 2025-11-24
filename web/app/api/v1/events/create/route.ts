import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Currency } from "@expensecal/database/models/Currency";
import { Event, EventType } from "@expensecal/database/models/Event";
import { NextRequest, NextResponse } from "next/server";

import { CreateEventRequestBody, CreateEventResponse } from "./types";

import { stackServerApp } from "@/stack/server";
import {
  createValidationErrorResponse,
  validateEnum,
  validateISO8601Date,
  validatePositiveNumber,
  validateRequiredString,
  validateUUID,
} from "@/lib/validators";

/**
 * POST /api/v1/events/create
 * Create an expense/income event from structured data
 * Protected endpoint (requires authentication)
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<CreateEventResponse>> {
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

    const body: CreateEventRequestBody = await request.json();

    // Validate event type
    const typeError = validateEnum(body.type, "type", ["EXPENSE", "INCOME"]);

    if (typeError) {
      return createValidationErrorResponse(typeError);
    }

    // Validate amount
    const amountResult = validatePositiveNumber(body.amount, "amount");

    if (amountResult.error) {
      return createValidationErrorResponse(amountResult.error);
    }

    // Validate currency_id
    const currencyIdError = validateUUID(body.currency_id, "currency_id", true);

    if (currencyIdError) {
      return createValidationErrorResponse(currencyIdError);
    }

    // Validate description
    const descriptionError = validateRequiredString(
      body.description,
      "description",
    );

    if (descriptionError) {
      return createValidationErrorResponse(descriptionError);
    }

    // Validate event_date
    const eventDateResult = validateISO8601Date(
      body.event_date,
      "event_date",
      true,
    );

    if (eventDateResult.error) {
      return createValidationErrorResponse(eventDateResult.error);
    }
    const eventDate = eventDateResult.date!;

    // Validate quantity if provided
    const quantityResult = validatePositiveNumber(body.quantity, "quantity", {
      minValue: 0,
      isRequired: false,
    });

    if (quantityResult.error) {
      return createValidationErrorResponse(quantityResult.error);
    }
    const quantity = quantityResult.value ?? 1;

    // Initialize database models
    initModels(db);

    // Verify currency exists
    const currency = await Currency.findByPk(body.currency_id);

    if (!currency) {
      return NextResponse.json(
        {
          success: false,
          error: "Currency not found",
          details: `No currency found with id: ${body.currency_id}`,
        },
        { status: 404 },
      );
    }

    // Validate recurrence_end_date if provided
    const recurrenceEndDateResult = validateISO8601Date(
      body.recurrence_end_date,
      "recurrence_end_date",
      false,
    );

    if (recurrenceEndDateResult.error) {
      return createValidationErrorResponse(recurrenceEndDateResult.error);
    }
    const recurrenceEndDate = recurrenceEndDateResult.date;

    // Create the event
    const event = await Event.create({
      user_id: user.id,
      type: body.type as EventType,
      amount: String(body.amount),
      currency_id: body.currency_id,
      quantity,
      description: body.description.trim(),
      event_date: eventDate,
      parent_event_id: body.parent_event_id || null,
      recurrence_rule: body.recurrence_rule || null,
      recurrence_end_date: recurrenceEndDate,
    });

    // Return created event
    return NextResponse.json(
      {
        success: true,
        data: {
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
          created_at: event.created_at.toISOString(),
          updated_at: event.updated_at.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create event endpoint error:", error);

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
