import { createValidationErrorResponse, validateUUID } from "@/lib/validators";
import { stackServerApp } from "@/stack/server";
import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { NextRequest, NextResponse } from "next/server";
import { DeleteMode } from "../[id]/types";
import { deleteEventWithValidation } from "../delete-helpers";
import {
  DeleteMultipleEventsRequestBody,
  DeleteMultipleEventsResponse,
} from "./types";

/**
 * POST /api/v1/events/delete-multiple
 * Delete multiple events in a single request
 * Query parameters:
 *   - deleteMode: "single" (default) | "all-future"
 * Protected endpoint (requires authentication)
 *
 * Request body: { eventIds: string[], deleteMode?: "single" | "all-future" }
 * Returns array of deleted events and count
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<DeleteMultipleEventsResponse>> {
  try {
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

    const body: DeleteMultipleEventsRequestBody = await request.json();

    // Validate eventIds array
    if (!body.eventIds || !Array.isArray(body.eventIds)) {
      return createValidationErrorResponse(
        new Error("eventIds must be an array"),
      );
    }

    if (body.eventIds.length === 0) {
      return createValidationErrorResponse(
        new Error("eventIds array cannot be empty"),
      );
    }

    // Validate each event ID is a valid UUID
    for (const eventId of body.eventIds) {
      const idError = validateUUID(eventId, "eventId", true);
      if (idError) {
        return createValidationErrorResponse(idError);
      }
    }

    // Validate deleteMode if provided
    const deleteMode: DeleteMode = body.deleteMode || "single";
    if (!["single", "all-future"].includes(deleteMode)) {
      return createValidationErrorResponse(
        new Error("deleteMode must be 'single' or 'all-future'"),
      );
    }

    // Initialize database models
    initModels(db);

    const deletedEvents = [];
    const failedEventIds: Array<{ eventId: string; reason: string }> = [];

    // Delete each event
    for (const eventId of body.eventIds) {
      try {
        const deletedEvent = await deleteEventWithValidation({
          eventId,
          userId: user.id,
          deleteMode,
        });
        deletedEvents.push(deletedEvent);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Unknown error";
        const status = (error as any).status || 500;

        // For authorization/not-found errors, continue with other events
        if (status === 403 || status === 404) {
          failedEventIds.push({ eventId, reason });
        } else {
          // For other errors, fail the entire operation
          throw error;
        }
      }
    }

    // If all events failed authorization, return error
    if (deletedEvents.length === 0 && failedEventIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete events",
          details: "Authorization failed for all requested events",
          stage: "authorization",
          failedEventIds,
        },
        { status: 403 },
      );
    }

    // Return success with deleted events and any failures
    return NextResponse.json(
      {
        success: true,
        data: {
          deletedCount: deletedEvents.length,
          deletedEvents,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete multiple events endpoint error:", error);
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
