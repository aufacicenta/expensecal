import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Category } from "@expensecal/database/models/Category";
import { Currency } from "@expensecal/database/models/Currency";
import { Event } from "@expensecal/database/models/Event";
import { EventGroup } from "@expensecal/database/models/EventGroup";
import { EventGroupEvents } from "@expensecal/database/models/EventGroupEvents";
import { NextRequest, NextResponse } from "next/server";

import {
  DeleteEventGroupResponse,
  GetEventGroupResponse,
  UpdateEventGroupRequestBody,
  UpdateEventGroupResponse,
} from "./types";

import { stackServerApp } from "@/stack/server";
import {
  createValidationErrorResponse,
  validateRequiredString,
  validateUUID,
} from "@/lib/validators";

/**
 * GET /api/v1/event-groups/[id]
 * Get a single event group with its events
 * Protected endpoint (requires authentication)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<GetEventGroupResponse>> {
  try {
    const { id } = await params;

    // Authenticate user with Stackframe
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You must be logged in to fetch event groups",
        },
        { status: 401 },
      );
    }

    // Validate event group ID
    const idError = validateUUID(id, "id", true);

    if (idError) {
      return createValidationErrorResponse(idError);
    }

    // Initialize database models
    initModels(db);

    // Find the event group with its events
    const eventGroup = await EventGroup.findByPk(id, {
      include: [
        {
          model: Event,
          as: "events",
          include: [
            {
              model: Currency,
              as: "currency",
              attributes: ["id", "symbol", "name"],
            },
            {
              model: Category,
              as: "categories",
              attributes: ["id", "name", "color"],
            },
          ],
        },
      ],
    });

    if (!eventGroup) {
      return NextResponse.json(
        {
          success: false,
          error: "Event group not found",
          details: `No event group found with id: ${id}`,
        },
        { status: 404 },
      );
    }

    // Verify ownership
    if (eventGroup.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          details: "You do not have permission to access this event group",
        },
        { status: 403 },
      );
    }

    // Format the response
    const events = (eventGroup.events || []).map((event) => ({
      id: event.id,
      type: event.type,
      amount: event.amount,
      currency_id: event.currency_id,
      quantity: event.quantity,
      description: event.description,
      event_date: event.event_date.toISOString(),
      original_text: event.original_text,
      inventory_metadata: event.inventory_metadata,
      currency: event.currency
        ? {
            id: event.currency.id,
            symbol: event.currency.symbol,
            name: event.currency.name,
          }
        : undefined,
      categories: event.categories?.map((cat) => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
      })),
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          group: {
            id: eventGroup.id,
            user_id: eventGroup.user_id,
            name: eventGroup.name,
            event_count: events.length,
            created_at: eventGroup.created_at.toISOString(),
            updated_at: eventGroup.updated_at.toISOString(),
          },
          events,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get event group endpoint error:", error);

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
 * PUT /api/v1/event-groups/[id]
 * Update an event group (name and/or events)
 * Protected endpoint (requires authentication)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<UpdateEventGroupResponse>> {
  try {
    const { id } = await params;

    // Authenticate user with Stackframe
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You must be logged in to update event groups",
        },
        { status: 401 },
      );
    }

    // Validate event group ID
    const idError = validateUUID(id, "id", true);

    if (idError) {
      return createValidationErrorResponse(idError);
    }

    const body: UpdateEventGroupRequestBody = await request.json();

    // Initialize database models
    initModels(db);

    // Find the event group
    const eventGroup = await EventGroup.findByPk(id);

    if (!eventGroup) {
      return NextResponse.json(
        {
          success: false,
          error: "Event group not found",
          details: `No event group found with id: ${id}`,
        },
        { status: 404 },
      );
    }

    // Verify ownership
    if (eventGroup.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          details: "You do not have permission to update this event group",
        },
        { status: 403 },
      );
    }

    // Update name if provided
    if (body.name !== undefined) {
      const nameError = validateRequiredString(body.name, "name");

      if (nameError) {
        return createValidationErrorResponse(nameError);
      }

      eventGroup.name = body.name.trim();
      await eventGroup.save();
    }

    // Update events if provided (replace all)
    let eventCount = 0;

    if (body.eventIds !== undefined) {
      // Remove all existing event associations
      await EventGroupEvents.destroy({
        where: { event_group_id: id },
      });

      // Add new events
      if (body.eventIds.length > 0) {
        // Verify all events exist and belong to the user
        const events = await Event.findAll({
          where: {
            id: body.eventIds,
            user_id: user.id,
          },
        });

        if (events.length > 0) {
          const eventGroupEventsData = events.map((event) => ({
            event_group_id: id,
            event_id: event.id,
          }));

          await EventGroupEvents.bulkCreate(eventGroupEventsData);
          eventCount = events.length;
        }
      }
    } else {
      // Count existing events
      eventCount = await EventGroupEvents.count({
        where: { event_group_id: id },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: eventGroup.id,
          user_id: eventGroup.user_id,
          name: eventGroup.name,
          event_count: eventCount,
          created_at: eventGroup.created_at.toISOString(),
          updated_at: eventGroup.updated_at.toISOString(),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update event group endpoint error:", error);

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
 * DELETE /api/v1/event-groups/[id]
 * Delete an event group (does not delete the events themselves)
 * Protected endpoint (requires authentication)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<DeleteEventGroupResponse>> {
  try {
    const { id } = await params;

    // Authenticate user with Stackframe
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You must be logged in to delete event groups",
        },
        { status: 401 },
      );
    }

    // Validate event group ID
    const idError = validateUUID(id, "id", true);

    if (idError) {
      return createValidationErrorResponse(idError);
    }

    // Initialize database models
    initModels(db);

    // Find the event group
    const eventGroup = await EventGroup.findByPk(id);

    if (!eventGroup) {
      return NextResponse.json(
        {
          success: false,
          error: "Event group not found",
          details: `No event group found with id: ${id}`,
        },
        { status: 404 },
      );
    }

    // Verify ownership
    if (eventGroup.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          details: "You do not have permission to delete this event group",
        },
        { status: 403 },
      );
    }

    // Delete the event group (cascade will handle event_group_events)
    await eventGroup.destroy();

    return NextResponse.json(
      {
        success: true,
        data: {
          deleted_id: id,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete event group endpoint error:", error);

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
