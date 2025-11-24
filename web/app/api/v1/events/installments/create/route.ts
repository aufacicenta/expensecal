import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Event } from "@expensecal/database/models/Event";
import { NextRequest, NextResponse } from "next/server";

import {
  CreateInstallmentsRequestBody,
  CreateInstallmentsResponse,
} from "../types";

import { stackServerApp } from "@/stack/server";
import {
  createValidationErrorResponse,
  validateISO8601Date,
  validateUUID,
} from "@/lib/validators";
import { createInstallments } from "@/lib/events/createInstallments";

/**
 * POST /api/v1/events/installments/create
 * Create installment events from a parent recurring event
 * Protected endpoint (requires authentication)
 *
 * Takes a parent event with a recurrence_rule and generates individual
 * installment events based on the recurrence pattern. The parent event's
 * amount is distributed equally across all installments.
 *
 * @example
 * POST /api/v1/events/installments/create
 * {
 *   "parent_event_id": "550e8400-e29b-41d4-a716-446655440000"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "parent_event": {...},
 *     "installments": [...],
 *     "installment_count": 12,
 *     "amount_per_installment": "125.00"
 *   }
 * }
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<CreateInstallmentsResponse>> {
  try {
    // Authenticate user with Stackframe
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You must be logged in to create installments",
        },
        { status: 401 },
      );
    }

    const body: CreateInstallmentsRequestBody = await request.json();

    // Validate parent_event_id
    const parentEventIdError = validateUUID(
      body.parent_event_id,
      "parent_event_id",
      true,
    );

    if (parentEventIdError) {
      return createValidationErrorResponse(parentEventIdError);
    }

    // Validate end_date if provided
    const endDateResult = validateISO8601Date(body.end_date, "end_date", false);

    if (endDateResult.error) {
      return createValidationErrorResponse(endDateResult.error);
    }
    const endDate = endDateResult.date ?? undefined;

    // Initialize models
    initModels(db);

    // Verify parent event exists and belongs to the user
    const parentEvent = await Event.findByPk(body.parent_event_id);

    if (!parentEvent) {
      return NextResponse.json(
        {
          success: false,
          error: "Parent event not found",
          details: `No event found with id: ${body.parent_event_id}`,
        },
        { status: 404 },
      );
    }

    // Verify the parent event belongs to the authenticated user
    if (parentEvent.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You do not have permission to access this event",
        },
        { status: 403 },
      );
    }

    // Verify the parent event has a recurrence rule
    if (!parentEvent.recurrence_rule) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid parent event",
          details:
            "Parent event must have a recurrence_rule to generate installments",
        },
        { status: 400 },
      );
    }

    // Create the installments
    const result = await createInstallments({
      parentEventId: body.parent_event_id,
      endDate,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create installments",
          details: result.error,
        },
        { status: 400 },
      );
    }

    // Fetch the parent event again with fresh data
    const updatedParent = await Event.findByPk(body.parent_event_id);

    if (!updatedParent) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to retrieve parent event",
        },
        { status: 500 },
      );
    }

    // Fetch all installment events
    const installmentEvents = await Event.findAll({
      where: {
        id: result.installmentIds,
      },
      order: [["event_date", "ASC"]],
    });

    // Calculate amount per installment
    const amountPerInstallment = installmentEvents.length
      ? installmentEvents[0].amount
      : "0";

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          parent_event: updatedParent,
          installments: installmentEvents.map((event) => event),
          installment_count: result.installmentCount,
          amount_per_installment: amountPerInstallment,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create installments endpoint error:", error);

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
