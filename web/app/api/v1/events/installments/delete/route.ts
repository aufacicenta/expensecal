import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Event } from "@expensecal/database/models/Event";
import { EventInstallment } from "@expensecal/database/models/EventInstallment";
import { NextRequest, NextResponse } from "next/server";

import {
  DeleteInstallmentsRequestBody,
  DeleteInstallmentsResponse,
} from "../types";

import { stackServerApp } from "@/stack/server";
import { createValidationErrorResponse, validateUUID } from "@/lib/validators";

/**
 * POST /api/v1/events/installments/delete
 * Delete all installments for a parent event
 * Protected endpoint (requires authentication)
 *
 * This endpoint deletes all installment events associated with a parent event.
 * The parent event itself is not deleted, only its installments.
 *
 * @example
 * POST /api/v1/events/installments/delete
 * {
 *   "parent_event_id": "550e8400-e29b-41d4-a716-446655440000"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "parent_event_id": "550e8400-e29b-41d4-a716-446655440000",
 *     "deleted_count": 12
 *   }
 * }
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<DeleteInstallmentsResponse>> {
  try {
    // Authenticate user with Stackframe
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You must be logged in to delete installments",
        },
        { status: 401 },
      );
    }

    const body: DeleteInstallmentsRequestBody = await request.json();

    // Validate parent_event_id
    const parentEventIdError = validateUUID(
      body.parent_event_id,
      "parent_event_id",
      true,
    );

    if (parentEventIdError) {
      return createValidationErrorResponse(parentEventIdError);
    }

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

    // Get all installment IDs for this parent event
    const eventInstallments = await EventInstallment.findAll({
      where: { parent_event_id: body.parent_event_id },
      attributes: ["installment_event_id"],
    });

    const installmentIds = eventInstallments.map(
      (ei) => ei.installment_event_id,
    );

    let deletedCount = 0;

    if (installmentIds.length > 0) {
      // Delete all installment events
      // The cascade delete will also remove EventInstallment junction records
      deletedCount = await Event.destroy({
        where: { id: installmentIds },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          parent_event_id: body.parent_event_id,
          deleted_count: deletedCount,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete installments endpoint error:", error);

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
