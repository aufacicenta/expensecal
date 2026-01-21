import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Event } from "@expensecal/database/models/Event";
import { EventInstallment } from "@expensecal/database/models/EventInstallment";
import { NextRequest, NextResponse } from "next/server";

import { ListInstallmentsResponse } from "../types";

import { stackServerApp } from "@/stack/server";
import {
  createValidationErrorResponse,
  validateQueryParam,
} from "@/lib/validators";

/**
 * GET /api/v1/events/installments/list?parent_event_id=...
 * List all installments for a parent event
 * Protected endpoint (requires authentication)
 *
 * @example
 * GET /api/v1/events/installments/list?parent_event_id=550e8400-e29b-41d4-a716-446655440000
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "parent_event_id": "550e8400-e29b-41d4-a716-446655440000",
 *     "installments": [
 *       {
 *         "id": "...",
 *         "event_date": "2025-01-01T00:00:00Z",
 *         "amount": "125.00",
 *         "description": "Monthly rent - Installment",
 *         "created_at": "2025-01-01T10:00:00Z"
 *       }
 *     ],
 *     "total_count": 12,
 *     "total_amount": "1500.00"
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ListInstallmentsResponse>> {
  try {
    // Authenticate user with Stackframe
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You must be logged in to list installments",
        },
        { status: 401 },
      );
    }

    // Validate parent_event_id query parameter
    const { searchParams } = new URL(request.url);
    const parentEventIdResult = validateQueryParam(
      searchParams,
      "parent_event_id",
      true,
    );

    if (parentEventIdResult.error) {
      return createValidationErrorResponse(parentEventIdResult.error);
    }
    const parentEventId = parentEventIdResult.value!;

    // Initialize models
    initModels(db);

    // Verify parent event exists and belongs to the user
    const parentEvent = await Event.findByPk(parentEventId);

    if (!parentEvent) {
      return NextResponse.json(
        {
          success: false,
          error: "Parent event not found",
          details: `No event found with id: ${parentEventId}`,
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

    // Get all installments for this parent event
    const eventInstallments = await EventInstallment.findAll({
      where: { parent_event_id: parentEventId },
      attributes: ["installment_event_id"],
    });

    const installmentIds = eventInstallments.map(
      (ei) => ei.installment_event_id,
    );

    type InstallmentItem = {
      id: string;
      event_date: string;
      amount: string;
      description: string;
      created_at: string;
    };

    const installments: InstallmentItem[] = [];
    let totalAmount = "0";

    if (installmentIds.length > 0) {
      const installmentEvents = await Event.findAll({
        where: { id: installmentIds },
        order: [["event_date", "ASC"]],
      });

      const mappedInstallments = installmentEvents.map((event) => ({
        id: event.id,
        event_date: event.event_date.toISOString(),
        amount: event.amount,
        description: event.description,
        created_at: event.created_at.toISOString(),
      }));

      installments.push(...mappedInstallments);

      // Calculate total amount by summing all amounts
      if (installmentEvents.length > 0) {
        totalAmount = installmentEvents
          .reduce((sum, event) => {
            const eventAmount = parseFloat(event.amount);

            return sum + (isNaN(eventAmount) ? 0 : eventAmount);
          }, 0)
          .toString();
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          parent_event_id: parentEventId,
          installments,
          total_count: installments.length,
          total_amount: totalAmount,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("List installments endpoint error:", error);

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
