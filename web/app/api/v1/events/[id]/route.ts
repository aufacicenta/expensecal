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
import { Category } from "@expensecal/database/models/Category";
import { Currency } from "@expensecal/database/models/Currency";
import { Event } from "@expensecal/database/models/Event";
import { EventCategories } from "@expensecal/database/models/EventCategories";
import { NextRequest, NextResponse } from "next/server";
import { deleteEventWithValidation } from "../delete-helpers";
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
    let event = await Event.findByPk(id);

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

    if (body.categoryIds !== undefined) {
      // Validate each category ID is a valid UUID
      if (!Array.isArray(body.categoryIds)) {
        return createValidationErrorResponse(
          new Error("categoryIds must be an array"),
        );
      }

      for (const categoryId of body.categoryIds) {
        const categoryIdError = validateUUID(categoryId, "categoryId", true);
        if (categoryIdError) {
          return createValidationErrorResponse(categoryIdError);
        }

        // Verify category exists and belongs to the user
        const category = await Category.findOne({
          where: {
            id: categoryId,
            user_id: user.id,
          },
        });
        if (!category) {
          return NextResponse.json(
            {
              success: false,
              error: "Category not found",
              details: `No category found with id: ${categoryId}`,
            },
            { status: 404 },
          );
        }
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

    // Handle category assignments if provided
    if (body.categoryIds !== undefined) {
      // Determine which events to update categories for
      // If this is a recurring event (has parent_event_id or recurrence_rule),
      // update categories for all related events (parent, self, and all children)
      let eventIdsToUpdate = [event.id];

      if (event.parent_event_id || event.recurrence_rule) {
        // Get the parent event ID
        const parentEventId = event.parent_event_id || event.id;

        // Find all events in this recurring series
        const allRelatedEvents = await Event.findAll({
          where: {
            user_id: user.id,
            [Op.or]: [
              { id: parentEventId },
              { parent_event_id: parentEventId },
            ],
          },
          attributes: ["id"],
        });

        eventIdsToUpdate = allRelatedEvents.map((e) => e.id);
      }

      // Delete existing category associations for all affected events
      await EventCategories.destroy({
        where: {
          event_id: eventIdsToUpdate,
        },
      });

      // Create new category associations for all affected events
      if (body.categoryIds !== undefined && body.categoryIds.length > 0) {
        const eventCategoriesData = eventIdsToUpdate.flatMap((eventId) =>
          body.categoryIds!.map((categoryId) => ({
            event_id: eventId,
            category_id: categoryId,
          })),
        );
        await EventCategories.bulkCreate(eventCategoriesData);
      }
    }

    // Refetch the event
    event = await Event.findByPk(id, {
      include: [
        {
          model: Currency,
          as: "currency",
          attributes: ["id", "symbol", "name"],
        },
        {
          model: Category,
          as: "categories",
          through: {
            as: "event_categories",
          },
        },
      ],
    });

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

    // Return updated event
    return NextResponse.json(
      {
        success: true,
        data: event,
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

    try {
      // Use shared deletion logic
      const event = await deleteEventWithValidation({
        eventId: id,
        userId: user.id,
        deleteMode: deleteMode as "single" | "all-future",
      });

      return NextResponse.json(
        {
          success: true,
          data: event,
        },
        { status: 200 },
      );
    } catch (error) {
      const errorType = (error as any).errorType;

      if (errorType === "NotFound") {
        return NextResponse.json(
          {
            success: false,
            error: "Event not found",
            details: error instanceof Error ? error.message : String(error),
          },
          { status: 404 },
        );
      }

      if (errorType === "Forbidden") {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden",
            details: error instanceof Error ? error.message : String(error),
          },
          { status: 403 },
        );
      }

      throw error;
    }
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
