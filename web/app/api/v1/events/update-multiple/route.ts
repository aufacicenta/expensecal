import { Op } from "@expensecal/database";
import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Category } from "@expensecal/database/models/Category";
import { Currency } from "@expensecal/database/models/Currency";
import { Event } from "@expensecal/database/models/Event";
import { EventCategories } from "@expensecal/database/models/EventCategories";
import { NextRequest, NextResponse } from "next/server";

import { UpdateEventRequestBody } from "../[id]/types";

import {
  UpdateMultipleEventsRequestBody,
  UpdateMultipleEventsResponse,
  UpdatedEventData,
} from "./types";

import { stackServerApp } from "@/stack/server";
import { createValidationErrorResponse, validateUUID } from "@/lib/validators";

/**
 * Helper function to update a single event with validation
 */
async function updateEventWithValidation({
  eventId,
  userId,
  data,
}: {
  eventId: string;
  userId: string;
  data: UpdateEventRequestBody;
}): Promise<UpdatedEventData> {
  // Find the event
  let event = await Event.findByPk(eventId);

  if (!event) {
    const error = new Error(`No event found with id: ${eventId}`);

    (error as any).status = 404;
    (error as any).errorType = "NotFound";
    throw error;
  }

  // Verify ownership
  if (event.user_id !== userId) {
    const error = new Error("You do not have permission to update this event");

    (error as any).status = 403;
    (error as any).errorType = "Forbidden";
    throw error;
  }

  // Validate currency_id if provided
  if (data.currency_id !== undefined) {
    const currency = await Currency.findByPk(data.currency_id);

    if (!currency) {
      const error = new Error(`No currency found with id: ${data.currency_id}`);

      (error as any).status = 404;
      (error as any).errorType = "NotFound";
      throw error;
    }
  }

  // Validate categoryIds if provided
  if (data.categoryIds !== undefined && data.categoryIds.length > 0) {
    for (const categoryId of data.categoryIds) {
      const category = await Category.findOne({
        where: {
          id: categoryId,
          user_id: userId,
        },
      });

      if (!category) {
        const error = new Error(`No category found with id: ${categoryId}`);

        (error as any).status = 404;
        (error as any).errorType = "NotFound";
        throw error;
      }
    }
  }

  // Build update data
  const updateData: Record<string, unknown> = {};

  if (data.type !== undefined) updateData.type = data.type;
  if (data.amount !== undefined) updateData.amount = String(data.amount);
  if (data.currency_id !== undefined) updateData.currency_id = data.currency_id;
  if (data.quantity !== undefined) updateData.quantity = data.quantity;
  if (data.description !== undefined)
    updateData.description = data.description.trim();
  if (data.event_date !== undefined)
    updateData.event_date = new Date(data.event_date as unknown as string);
  if (data.recurrence_end_date !== undefined)
    updateData.recurrence_end_date = data.recurrence_end_date
      ? new Date(data.recurrence_end_date as unknown as string)
      : null;

  await event.update(updateData);

  // Handle category assignments if provided
  if (data.categoryIds !== undefined) {
    // Determine which events to update categories for
    let eventIdsToUpdate = [event.id];

    if (event.parent_event_id || event.recurrence_rule) {
      const parentEventId = event.parent_event_id || event.id;

      const allRelatedEvents = await Event.findAll({
        where: {
          user_id: userId,
          [Op.or]: [{ id: parentEventId }, { parent_event_id: parentEventId }],
        },
        attributes: ["id"],
      });

      eventIdsToUpdate = allRelatedEvents.map((e) => e.id);
    }

    // Delete existing category associations
    await EventCategories.destroy({
      where: {
        event_id: eventIdsToUpdate,
      },
    });

    // Create new category associations
    if (data.categoryIds.length > 0) {
      const eventCategoriesData = eventIdsToUpdate.flatMap((evtId) =>
        data.categoryIds!.map((categoryId) => ({
          event_id: evtId,
          category_id: categoryId,
        })),
      );

      await EventCategories.bulkCreate(eventCategoriesData);
    }
  }

  // Refetch the event with associations
  event = await Event.findByPk(eventId, {
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
    const error = new Error(`Failed to refetch event with id: ${eventId}`);

    (error as any).status = 500;
    throw error;
  }

  return event.toJSON() as UpdatedEventData;
}

/**
 * POST /api/v1/events/update-multiple
 * Update multiple events in a single request
 * Protected endpoint (requires authentication)
 *
 * Request body: { updates: [{ eventId: string, data: UpdateEventRequestBody }] }
 * Returns array of updated events and count
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<UpdateMultipleEventsResponse>> {
  try {
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

    const body: UpdateMultipleEventsRequestBody = await request.json();

    // Validate updates array
    if (!body.updates || !Array.isArray(body.updates)) {
      return createValidationErrorResponse(
        new Error("updates must be an array"),
      );
    }

    if (body.updates.length === 0) {
      return createValidationErrorResponse(
        new Error("updates array cannot be empty"),
      );
    }

    // Validate each update has an eventId
    for (const update of body.updates) {
      const idError = validateUUID(update.eventId, "eventId", true);

      if (idError) {
        return createValidationErrorResponse(idError);
      }

      if (!update.data || typeof update.data !== "object") {
        return createValidationErrorResponse(
          new Error(
            `update for eventId ${update.eventId} must have a data object`,
          ),
        );
      }
    }

    // Initialize database models
    initModels(db);

    const updatedEvents: UpdatedEventData[] = [];
    const failedUpdates: Array<{ eventId: string; reason: string }> = [];

    // Update each event
    for (const update of body.updates) {
      try {
        const updatedEvent = await updateEventWithValidation({
          eventId: update.eventId,
          userId: user.id,
          data: update.data,
        });

        updatedEvents.push(updatedEvent);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Unknown error";
        const status = (error as any).status || 500;

        // For authorization/not-found errors, continue with other events
        if (status === 403 || status === 404) {
          failedUpdates.push({ eventId: update.eventId, reason });
        } else {
          // For other errors, fail the entire operation
          throw error;
        }
      }
    }

    // If all events failed, return error
    if (updatedEvents.length === 0 && failedUpdates.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update events",
          details: "All requested updates failed",
          stage: "authorization",
          failedUpdates,
        },
        { status: 403 },
      );
    }

    // Return success with updated events and any failures
    return NextResponse.json(
      {
        success: true,
        data: {
          updatedCount: updatedEvents.length,
          updatedEvents,
          failedUpdates: failedUpdates.length > 0 ? failedUpdates : undefined,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update multiple events endpoint error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
        stage: "database",
      },
      { status: 500 },
    );
  }
}
