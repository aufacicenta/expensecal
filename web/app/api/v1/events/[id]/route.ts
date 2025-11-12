import {
  createValidationErrorResponse,
  validateEnum,
  validateISO8601Date,
  validatePositiveNumber,
  validateRequiredString,
  validateUUID,
} from "@/lib/validators";
import { stackServerApp } from "@/stack/server";
import { Op } from "@expensecal/database";
import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Currency } from "@expensecal/database/models/Currency";
import { Event } from "@expensecal/database/models/Event";
import { NextRequest, NextResponse } from "next/server";
import { UpdateEventRequestBody, UpdateEventResponse } from "./types";

/**
 * PUT /api/v1/events/[id]
 * Update an event
 * Protected endpoint (requires authentication)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<UpdateEventResponse>> {
  try {
    const { id } = await params;

    // Authenticate user with Stackframe
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You must be logged in to update events",
        },
        { status: 401 },
      );
    }

    // Validate event ID
    const idError = validateUUID(id, "id", true);
    if (idError) {
      return createValidationErrorResponse(idError);
    }

    const body: UpdateEventRequestBody = await request.json();

    // Initialize database models
    initModels(db);

    // Find the event
    const event = await Event.findByPk(id);
    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: "Event not found",
          details: `No event found with id: ${id}`,
        },
        { status: 404 },
      );
    }

    // Verify ownership
    if (event.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          details: "You do not have permission to update this event",
        },
        { status: 403 },
      );
    }

    // Validate updatable fields if provided
    if (body.type !== undefined) {
      const typeError = validateEnum(body.type, "type", ["EXPENSE", "INCOME"]);
      if (typeError) {
        return createValidationErrorResponse(typeError);
      }
    }

    if (body.amount !== undefined) {
      const amountResult = validatePositiveNumber(body.amount, "amount");
      if (amountResult.error) {
        return createValidationErrorResponse(amountResult.error);
      }
    }

    if (body.currency_id !== undefined) {
      const currencyIdError = validateUUID(
        body.currency_id,
        "currency_id",
        true,
      );
      if (currencyIdError) {
        return createValidationErrorResponse(currencyIdError);
      }

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
    }

    if (body.description !== undefined) {
      const descriptionError = validateRequiredString(
        body.description,
        "description",
      );
      if (descriptionError) {
        return createValidationErrorResponse(descriptionError);
      }
    }

    if (body.event_date !== undefined) {
      const eventDateResult = validateISO8601Date(
        body.event_date,
        "event_date",
        true,
      );
      if (eventDateResult.error) {
        return createValidationErrorResponse(eventDateResult.error);
      }
    }

    if (body.quantity !== undefined) {
      const quantityResult = validatePositiveNumber(body.quantity, "quantity", {
        minValue: 0,
        isRequired: false,
      });
      if (quantityResult.error) {
        return createValidationErrorResponse(quantityResult.error);
      }
    }

    if (body.recurrence_end_date !== undefined) {
      const recurrenceEndDateResult = validateISO8601Date(
        body.recurrence_end_date,
        "recurrence_end_date",
        false,
      );
      if (recurrenceEndDateResult.error) {
        return createValidationErrorResponse(recurrenceEndDateResult.error);
      }
    }

    // Update event with provided fields
    const updateData: Partial<UpdateEventRequestBody> = {};

    if (body.type !== undefined) updateData.type = body.type;
    if (body.amount !== undefined) updateData.amount = String(body.amount);
    if (body.currency_id !== undefined)
      updateData.currency_id = body.currency_id;
    if (body.quantity !== undefined) updateData.quantity = body.quantity;
    if (body.description !== undefined)
      updateData.description = body.description.trim();
    if (body.event_date !== undefined)
      updateData.event_date = new Date(body.event_date);
    if (body.recurrence_end_date !== undefined)
      updateData.recurrence_end_date = body.recurrence_end_date
        ? new Date(body.recurrence_end_date)
        : null;

    await event.update(updateData);

    // Return updated event
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
          event_date: event.event_date,
          parent_event_id: event.parent_event_id,
          recurrence_rule: event.recurrence_rule,
          recurrence_end_date: event.recurrence_end_date || null,
          created_at: event.created_at,
          updated_at: event.updated_at,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update event endpoint error:", error);
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

/**
 * DELETE /api/v1/events/[id]
 * Delete an event
 * Query parameters:
 *   - deleteMode: "single" (default) | "all-future"
 * Protected endpoint (requires authentication)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<UpdateEventResponse>> {
  try {
    const { id } = await params;

    // Authenticate user with Stackframe
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You must be logged in to delete events",
        },
        { status: 401 },
      );
    }

    // Validate event ID
    const idError = validateUUID(id, "id", true);
    if (idError) {
      return createValidationErrorResponse(idError);
    }

    // Get query parameters
    const deleteMode =
      request.nextUrl.searchParams.get("deleteMode") || "single";
    if (!["single", "all-future"].includes(deleteMode)) {
      return createValidationErrorResponse(
        new Error("deleteMode must be 'single' or 'all-future'"),
      );
    }

    // Initialize database models
    initModels(db);

    // Find the event
    const event = await Event.findByPk(id);
    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: "Event not found",
          details: `No event found with id: ${id}`,
        },
        { status: 404 },
      );
    }

    // Verify ownership
    if (event.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          details: "You do not have permission to delete this event",
        },
        { status: 403 },
      );
    }

    if (deleteMode === "all-future") {
      // Delete this event and all future child events if recurring
      if (event.parent_event_id || event.recurrence_rule) {
        // Get parent event if this is a child
        const parentId = event.parent_event_id || event.id;

        // Delete this event and all child events with event_date >= this event's date
        await Event.destroy({
          where: {
            user_id: user.id,
            [Op.or]: [
              {
                id: event.id,
              },
              {
                parent_event_id: parentId,
                event_date: {
                  [Op.gte]: event.event_date,
                },
              },
            ],
          },
        });
      } else {
        // Not a recurring event, just delete it
        await event.destroy();
      }
    } else {
      // Delete only this single event
      await event.destroy();
    }

    // Return success response with deleted event info
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
          event_date: event.event_date,
          parent_event_id: event.parent_event_id,
          recurrence_rule: event.recurrence_rule,
          recurrence_end_date: event.recurrence_end_date || null,
          created_at: event.created_at,
          updated_at: event.updated_at,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete event endpoint error:", error);
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
