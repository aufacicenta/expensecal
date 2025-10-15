import { stackServerApp } from "@/stack/server";
import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Currency } from "@expensecal/database/models/Currency";
import { Event, EventType } from "@expensecal/database/models/Event";
import { NextRequest, NextResponse } from "next/server";
import { CreateEventRequestBody, CreateEventResponse } from "./types";

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

    // Validate required fields
    if (!body.type || !["EXPENSE", "INCOME"].includes(body.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid event type",
          details: "Type must be either 'EXPENSE' or 'INCOME'",
        },
        { status: 400 },
      );
    }

    if (
      !body.amount ||
      isNaN(Number(body.amount)) ||
      Number(body.amount) <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid amount",
          details: "Amount must be a positive number",
        },
        { status: 400 },
      );
    }

    if (!body.currency_id || typeof body.currency_id !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid currency_id",
          details: "currency_id is required and must be a valid UUID",
        },
        { status: 400 },
      );
    }

    if (
      !body.description ||
      typeof body.description !== "string" ||
      body.description.trim().length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid description",
          details: "Description is required and must be a non-empty string",
        },
        { status: 400 },
      );
    }

    if (!body.event_date || typeof body.event_date !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid event_date",
          details: "event_date is required and must be an ISO 8601 date string",
        },
        { status: 400 },
      );
    }

    // Validate event_date format
    const eventDate = new Date(body.event_date);
    if (isNaN(eventDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid event_date format",
          details: "event_date must be a valid ISO 8601 date string",
        },
        { status: 400 },
      );
    }

    // Validate quantity if provided
    const quantity = body.quantity !== undefined ? Number(body.quantity) : 1;
    if (isNaN(quantity) || quantity < 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid quantity",
          details: "Quantity must be a positive integer",
        },
        { status: 400 },
      );
    }

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
    let recurrenceEndDate: Date | null = null;
    if (body.recurrence_end_date) {
      recurrenceEndDate = new Date(body.recurrence_end_date);
      if (isNaN(recurrenceEndDate.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid recurrence_end_date format",
            details: "recurrence_end_date must be a valid ISO 8601 date string",
          },
          { status: 400 },
        );
      }
    }

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
