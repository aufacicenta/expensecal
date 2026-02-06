import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { EventGroup } from "@expensecal/database/models/EventGroup";
import { NextRequest, NextResponse } from "next/server";

import { GetEventGroupsResponse } from "./types";

import { stackServerApp } from "@/stack/server";

/**
 * GET /api/v1/event-groups
 * Fetch all event groups for the authenticated user
 * Protected endpoint (requires authentication)
 */
export async function GET(
  _request: NextRequest,
): Promise<NextResponse<GetEventGroupsResponse>> {
  try {
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

    // Initialize database models
    initModels(db);

    // Fetch all event groups for the user
    const eventGroups = await EventGroup.findAll({
      where: {
        user_id: user.id,
      },
      order: [["created_at", "DESC"]],
    });

    // Return event groups
    return NextResponse.json(
      {
        success: true,
        data: eventGroups.map((group) => ({
          id: group.id,
          user_id: group.user_id,
          name: group.name,
          created_at: group.created_at.toISOString(),
          updated_at: group.updated_at.toISOString(),
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get event groups endpoint error:", error);

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
