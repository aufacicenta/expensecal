import { validateUUID } from "@/lib/validators";
import { stackServerApp } from "@/stack/server";
import { Op } from "@expensecal/database";
import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Event } from "@expensecal/database/models/Event";
import { NextRequest, NextResponse } from "next/server";
import { GetChildEventsResponse } from "./types";

/**
 * GET /api/v1/events/[id]/children
 * Fetch child events of a recurring event
 * Protected endpoint (requires authentication)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<GetChildEventsResponse>> {
  try {
    const { id } = await params;

    // Authenticate user with Stackframe
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You must be logged in to fetch events",
        },
        { status: 401 },
      );
    }

    // Validate event ID
    const idError = validateUUID(id, "id", true);
    if (idError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: idError.message,
        },
        { status: 400 },
      );
    }

    // Initialize database models
    initModels(db);

    // Find the parent event
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
          details: "You do not have permission to access this event",
        },
        { status: 403 },
      );
    }

    // Find child events (if this is a parent) or children of parent (if this is a child)
    const parentId = event.parent_event_id || event.id;

    const childEvents = await Event.findAll({
      where: {
        user_id: user.id,
        parent_event_id: parentId,
        event_date: {
          [Op.gte]: event.event_date,
        },
      },
      order: [["event_date", "ASC"]],
      include: [
        {
          association: "currency",
          attributes: ["id", "symbol", "name", "decimal_units"],
          required: false,
        },
      ],
    });

    // Return child events
    return NextResponse.json(
      {
        success: true,
        data: childEvents,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get child events endpoint error:", error);
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
