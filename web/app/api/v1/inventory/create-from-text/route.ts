import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Currency } from "@expensecal/database/models/Currency";
import {
  Event,
  EventType,
  InventoryMetadata,
} from "@expensecal/database/models/Event";
import { EventGroup } from "@expensecal/database/models/EventGroup";
import { EventGroupEvents } from "@expensecal/database/models/EventGroupEvents";
import { NextRequest, NextResponse } from "next/server";

import {
  CreateInventoryFromTextRequestBody,
  CreateInventoryFromTextResponse,
  CreatedInventoryEventData,
  InventoryParseFailure,
} from "./types";

import {
  checkLLMHealth,
  parseInventoryItems,
} from "@/lib/inventory/inventoryParser";
import { stackServerApp } from "@/stack/server";
import {
  createValidationErrorResponse,
  validateISO8601Date,
  validateRequiredString,
} from "@/lib/validators";
import { formatDateForDisplay } from "@/lib/date";
import { routes } from "@/hooks/useRoutes/useRoutes";
import { tavilyClient } from "@/lib/inventory/tavilyClient";
import { valuateItems } from "@/lib/inventory/valuationService";

/**
 * Trigger background valuation for inventory events
 * Runs valuations in parallel without blocking the response
 */
async function triggerBackgroundValuation(eventIds: string[]): Promise<void> {
  console.log(`Starting background valuation for ${eventIds.length} items`);

  const results = await valuateItems(eventIds);

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(
    `Background valuation complete: ${successful} successful, ${failed} failed`,
  );

  // Log failures for debugging
  results
    .filter((r) => !r.success)
    .forEach((r) => {
      if (!r.success) {
        console.error(`Valuation failed for ${r.event_id}: ${r.error}`);
      }
    });
}

/**
 * POST /api/v1/inventory/create-from-text
 * Parse inventory items from natural language text and create events with inventory_metadata
 * Protected endpoint (requires authentication)
 *
 * Request body:
 * - text: Multi-line text with one inventory item per line (required)
 * - current_date: ISO 8601 format date for context (optional)
 * - group_name: Optional name for the EventGroup
 *
 * Behavior:
 * 1. Parse each line of text as a separate inventory item
 * 2. Create Event for each with inventory_metadata and amount: 0
 * 3. Create EventGroup containing all new events
 * 4. Return response with redirect URL to the view page
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<CreateInventoryFromTextResponse>> {
  try {
    // Authenticate user
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You must be logged in to create inventory items",
          stage: "validation",
        },
        { status: 401 },
      );
    }

    const body: CreateInventoryFromTextRequestBody = await request.json();

    // Validate text
    const textError = validateRequiredString(body.text, "text");

    if (textError) {
      return createValidationErrorResponse(textError);
    }

    // Validate current_date if provided
    const currentDateResult = validateISO8601Date(
      body.current_date,
      "current_date",
      false,
    );

    if (currentDateResult.error) {
      return createValidationErrorResponse(currentDateResult.error);
    }

    const currentDate = currentDateResult.date ?? new Date();

    // Check LLM availability
    const health = await checkLLMHealth();

    if (!health.available) {
      return NextResponse.json(
        {
          success: false,
          error: "LLM parser unavailable",
          details: health.error || "LLM service is not running",
          stage: "parsing",
        },
        { status: 503 },
      );
    }

    // Split text into lines and filter empty lines
    const lines = body.text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No items to parse",
          details: "Text input contains no valid lines",
          stage: "validation",
        },
        { status: 400 },
      );
    }

    // Parse all items in parallel
    const parseResults = await parseInventoryItems(lines, currentDate);

    // Initialize database models
    initModels(db);

    // Get default currency (USD)
    const defaultCurrency = await Currency.findOne({
      where: { symbol: "USD" },
    });

    if (!defaultCurrency) {
      return NextResponse.json(
        {
          success: false,
          error: "Default currency not found",
          details: "USD currency is not configured in the database",
          stage: "database",
        },
        { status: 500 },
      );
    }

    // Create events and track failures
    const createdEvents: CreatedInventoryEventData[] = [];
    const failures: InventoryParseFailure[] = [];

    for (let i = 0; i < parseResults.results.length; i++) {
      const result = parseResults.results[i];
      const originalText = lines[i];

      if ("error" in result) {
        failures.push({
          original_text: originalText,
          error: result.error + (result.details ? `: ${result.details}` : ""),
        });
        continue;
      }

      try {
        // Build inventory_metadata
        const inventoryMetadata: InventoryMetadata = {
          acquisition: result.acquisition,
          details: result.details,
          status: "OWNED",
          valuation_status: "PENDING",
        };

        // Create the event with inventory_metadata
        const event = await Event.create({
          user_id: user.id,
          type: EventType.EXPENSE, // Inventory items are tracked as expenses (value owned)
          amount: "0", // Amount starts at 0, will be updated by valuation
          currency_id: defaultCurrency.id,
          quantity: 1,
          description: result.description,
          event_date: currentDate,
          parent_event_id: null,
          recurrence_rule: null,
          recurrence_end_date: null,
          original_text: originalText,
          inventory_metadata: inventoryMetadata,
        });

        createdEvents.push({
          id: event.id,
          description: event.description,
          inventory_metadata: inventoryMetadata,
          valuation_status: "PENDING",
        });
      } catch (error) {
        console.error("Error creating inventory event:", error);
        failures.push({
          original_text: originalText,
          error:
            error instanceof Error ? error.message : "Failed to create event",
        });
      }
    }

    // Create EventGroup or add to existing one if we have any successful events
    let eventGroup: { id: string; name: string } | null = null;
    let redirectUrl = routes.table.index();

    if (createdEvents.length > 0) {
      try {
        // Check if we should add to an existing group
        if (body.event_group_id) {
          // Verify the group exists and belongs to this user
          const existingGroup = await EventGroup.findOne({
            where: {
              id: body.event_group_id,
              user_id: user.id,
            },
          });

          if (existingGroup) {
            // Associate events with the existing group
            const eventGroupEventsData = createdEvents.map((event) => ({
              event_group_id: existingGroup.id,
              event_id: event.id,
            }));

            await EventGroupEvents.bulkCreate(eventGroupEventsData);

            eventGroup = {
              id: existingGroup.id,
              name: existingGroup.name,
            };

            redirectUrl = routes.table.view(existingGroup.id);
          } else {
            // Group not found or doesn't belong to user, create a new one
            console.warn(
              `Event group ${body.event_group_id} not found or unauthorized, creating new group`,
            );
            // Fall through to create new group
          }
        }

        // Create a new group if we don't have one yet
        if (!eventGroup) {
          // Generate group name
          const groupName =
            body.group_name?.trim() ||
            `Inventory - ${formatDateForDisplay(currentDate)}`;

          // Create the EventGroup
          const group = await EventGroup.create({
            user_id: user.id,
            name: groupName,
          });

          // Associate events with the group
          const eventGroupEventsData = createdEvents.map((event) => ({
            event_group_id: group.id,
            event_id: event.id,
          }));

          await EventGroupEvents.bulkCreate(eventGroupEventsData);

          eventGroup = {
            id: group.id,
            name: group.name,
          };

          redirectUrl = routes.table.view(group.id);
        }
      } catch (error) {
        console.error("Error creating/updating event group:", error);
        // Events were created but group failed - still return success with events
        // Just won't have a group redirect
      }
    }

    // Trigger background valuation if Tavily is configured and we have events
    if (createdEvents.length > 0 && tavilyClient.isConfigured()) {
      // Fire and forget - don't await
      triggerBackgroundValuation(createdEvents.map((e) => e.id)).catch(
        (error) => {
          console.error("Background valuation trigger error:", error);
        },
      );
    }

    // Return response
    return NextResponse.json(
      {
        success: true,
        data: {
          events: createdEvents,
          failures,
          event_group: eventGroup || { id: "", name: "" },
          redirect_url: redirectUrl,
          summary: {
            total_parsed: lines.length,
            total_created: createdEvents.length,
            total_failed: failures.length,
          },
          valuation_triggered: tavilyClient.isConfigured(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create inventory from text endpoint error:", error);

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
