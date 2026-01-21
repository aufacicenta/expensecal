import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Event } from "@expensecal/database/models/Event";
import { NextRequest, NextResponse } from "next/server";

import {
  MakeRecurringRequestBody,
  MakeRecurringResponse,
  RecurrenceFrequency,
} from "./types";

import { stackServerApp } from "@/stack/server";
import { createValidationErrorResponse, validateUUID } from "@/lib/validators";
import {
  createInstallments,
  createRecurringEvents,
} from "@/lib/events/createInstallments";

/**
 * Validates the recurrence frequency
 */
function isValidFrequency(freq: string): freq is RecurrenceFrequency {
  return ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq);
}

/**
 * Builds an RFC 5545 RRULE string from the request parameters
 */
function buildRRule(
  frequency: RecurrenceFrequency,
  interval: number,
  count: number,
): string {
  return `FREQ=${frequency};INTERVAL=${interval};COUNT=${count}`;
}

/**
 * POST /api/v1/events/[id]/make-recurring
 * Convert a single event into a recurring series
 * Protected endpoint (requires authentication)
 *
 * Takes a single event and converts it into a recurring event series by:
 * 1. Adding a recurrence_rule to the parent event
 * 2. Creating child events based on the recurrence pattern
 *
 * @example
 * POST /api/v1/events/550e8400-e29b-41d4-a716-446655440000/make-recurring
 * {
 *   "frequency": "MONTHLY",
 *   "interval": 1,
 *   "count": 12,
 *   "split_amount": false
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "parent_event": {...},
 *     "child_events": [...],
 *     "child_count": 12,
 *     "amount_per_event": "100.00",
 *     "is_split": false
 *   }
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<MakeRecurringResponse>> {
  try {
    // Authenticate user
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You must be logged in to make an event recurring",
        },
        { status: 401 },
      );
    }

    const { id: eventId } = await params;

    // Validate event ID
    const eventIdError = validateUUID(eventId, "id", true);

    if (eventIdError) {
      return createValidationErrorResponse(eventIdError);
    }

    // Parse request body
    const body: MakeRecurringRequestBody = await request.json();

    // Validate frequency
    if (!body.frequency || !isValidFrequency(body.frequency)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid frequency",
          details: "Frequency must be one of: DAILY, WEEKLY, MONTHLY, YEARLY",
        },
        { status: 400 },
      );
    }

    // Validate count
    if (!body.count || typeof body.count !== "number" || body.count < 2) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid count",
          details: "Count must be a number greater than or equal to 2",
        },
        { status: 400 },
      );
    }

    // Validate interval (default to 1 if not provided)
    const interval = body.interval ?? 1;

    if (typeof interval !== "number" || interval < 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid interval",
          details: "Interval must be a positive number",
        },
        { status: 400 },
      );
    }

    const splitAmount = body.split_amount ?? false;

    // Initialize models
    initModels(db);

    // Fetch the event
    const event = await Event.findByPk(eventId);

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: "Event not found",
          details: `No event found with id: ${eventId}`,
        },
        { status: 404 },
      );
    }

    // Verify ownership
    if (event.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You do not have permission to modify this event",
        },
        { status: 403 },
      );
    }

    // Verify event is a "single" type (no parent_event_id, no existing children)
    if (event.parent_event_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid event type",
          details:
            "Cannot make a child event recurring. Use the parent event instead.",
        },
        { status: 400 },
      );
    }

    // Check if event already has children
    const existingChildren = await Event.count({
      where: { parent_event_id: eventId },
    });

    if (existingChildren > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Event already has recurring instances",
          details:
            "This event already has child events. Delete them first to recreate the recurrence.",
        },
        { status: 400 },
      );
    }

    // Check if event already has a recurrence rule
    if (event.recurrence_rule) {
      return NextResponse.json(
        {
          success: false,
          error: "Event already has a recurrence rule",
          details: "This event already has a recurrence pattern defined.",
        },
        { status: 400 },
      );
    }

    // Build the RRULE
    const rrule = buildRRule(body.frequency, interval, body.count);

    // Update the parent event with the recurrence rule
    await event.update({
      recurrence_rule: rrule,
    });

    // Create child events
    let childEventIds: string[] = [];
    let childCount = 0;

    if (splitAmount) {
      // Create installments (amount is split)
      const result = await createInstallments({
        parentEventId: eventId,
        splitAmount: true,
      });

      if (!result.success) {
        // Rollback the recurrence rule update
        await event.update({ recurrence_rule: null });

        return NextResponse.json(
          {
            success: false,
            error: "Failed to create installments",
            details: result.error,
          },
          { status: 400 },
        );
      }

      childEventIds = result.installmentIds;
      childCount = result.installmentCount;
    } else {
      // Create recurring events (same amount for each)
      const result = await createRecurringEvents({
        parentEventId: eventId,
      });

      if (!result.success) {
        // Rollback the recurrence rule update
        await event.update({ recurrence_rule: null });

        return NextResponse.json(
          {
            success: false,
            error: "Failed to create recurring events",
            details: result.error,
          },
          { status: 400 },
        );
      }

      childEventIds = result.recurringEventIds;
      childCount = result.recurringEventCount;
    }

    // Fetch updated parent event
    const updatedParent = await Event.findByPk(eventId);

    if (!updatedParent) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to retrieve updated parent event",
        },
        { status: 500 },
      );
    }

    // Fetch all child events
    const childEvents = await Event.findAll({
      where: {
        id: childEventIds,
      },
      order: [["event_date", "ASC"]],
    });

    // Calculate amount per event
    const amountPerEvent =
      childEvents.length > 0 ? childEvents[0].amount : updatedParent.amount;

    return NextResponse.json(
      {
        success: true,
        data: {
          parent_event: updatedParent.toJSON(),
          child_events: childEvents.map((e) => e.toJSON()),
          child_count: childCount,
          amount_per_event: amountPerEvent,
          is_split: splitAmount,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Make recurring endpoint error:", error);

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
