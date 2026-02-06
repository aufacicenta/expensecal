import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Event } from "@expensecal/database/models/Event";
import { EventGroup } from "@expensecal/database/models/EventGroup";
import { EventGroupEvents } from "@expensecal/database/models/EventGroupEvents";
import { NextRequest, NextResponse } from "next/server";

import { CreateEventGroupRequestBody, CreateEventGroupResponse } from "./types";

import { stackServerApp } from "@/stack/server";
import {
  createValidationErrorResponse,
  validateRequiredString,
} from "@/lib/validators";

/**
 * POST /api/v1/event-groups/create
 * Create a new event group with optional initial events
 * Protected endpoint (requires authentication)
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<CreateEventGroupResponse>> {
  try {
    // Authenticate user with Stackframe
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You must be logged in to create event groups",
        },
        { status: 401 },
      );
    }

    const body: CreateEventGroupRequestBody = await request.json();

    // Validate name
    const nameError = validateRequiredString(body.name, "name");

    if (nameError) {
      return createValidationErrorResponse(nameError);
    }

    // Initialize database models
    initModels(db);

    // Create the event group
    const eventGroup = await EventGroup.create({
      user_id: user.id,
      name: body.name.trim(),
    });

    let eventsAdded = 0;

    // Add events to the group if provided
    if (body.eventIds && body.eventIds.length > 0) {
      // Verify all events exist and belong to the user
      const events = await Event.findAll({
        where: {
          id: body.eventIds,
          user_id: user.id,
        },
      });

      if (events.length > 0) {
        const eventGroupEventsData = events.map((event) => ({
          event_group_id: eventGroup.id,
          event_id: event.id,
        }));

        await EventGroupEvents.bulkCreate(eventGroupEventsData);
        eventsAdded = events.length;
      }
    }

    // Return created event group
    return NextResponse.json(
      {
        success: true,
        data: {
          id: eventGroup.id,
          user_id: eventGroup.user_id,
          name: eventGroup.name,
          events_added: eventsAdded,
          created_at: eventGroup.created_at.toISOString(),
          updated_at: eventGroup.updated_at.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create event group endpoint error:", error);

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
