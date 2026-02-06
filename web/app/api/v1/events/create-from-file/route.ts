import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Category } from "@expensecal/database/models/Category";
import { Currency } from "@expensecal/database/models/Currency";
import { Event, EventType } from "@expensecal/database/models/Event";
import { EventCategories } from "@expensecal/database/models/EventCategories";
import { NextRequest, NextResponse } from "next/server";

import {
  CreateFromFileRequestBody,
  CreateFromFileResponse,
  FileEventError,
  FileEventResult,
} from "./types";

import { getParserInstance } from "@/lib/parser/parserFactory";
import {
  createValidationErrorResponse,
  validateISO8601Date,
  validateRequiredString,
} from "@/lib/validators";
import { stackServerApp } from "@/stack/server";

// File Upload category configuration
const FILE_UPLOAD_CATEGORY = {
  name: "File Upload",
  color: "#8B5CF6", // Purple
  description: "Events imported from file upload",
};

/**
 * POST /api/v1/events/create-from-file
 * Parse file content using LLM and create multiple events
 * Automatically assigns "File Upload" category to all created events
 * Protected endpoint (requires authentication)
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<CreateFromFileResponse>> {
  try {
    // Authenticate user with Stackframe
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You must be logged in to create events",
        },
        { status: 401 },
      );
    }

    const body: CreateFromFileRequestBody = await request.json();

    // Validate file_content
    const contentError = validateRequiredString(
      body.file_content,
      "file_content",
    );

    if (contentError) {
      return createValidationErrorResponse(contentError);
    }

    // Validate file_name
    const nameError = validateRequiredString(body.file_name, "file_name");

    if (nameError) {
      return createValidationErrorResponse(nameError);
    }

    // Validate file_type
    const typeError = validateRequiredString(body.file_type, "file_type");

    if (typeError) {
      return createValidationErrorResponse(typeError);
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
    const currentDate = currentDateResult.date ?? undefined;

    // Get parser instance
    const parser = getParserInstance();

    // Check if LLM is available
    const health = await parser.checkHealth();

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

    // Parse the file content
    const parseResult = await parser.parseFile(
      body.file_content,
      body.file_name,
      body.file_type,
      currentDate,
    );

    // Check if parsing failed
    if ("error" in parseResult) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error,
          details: parseResult.details,
          stage: "parsing",
        },
        { status: 422 },
      );
    }

    // If no events were parsed
    if (!parseResult.events || parseResult.events.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No events found in file",
          details:
            "The LLM could not extract any expense/income events from the file content",
          stage: "parsing",
        },
        { status: 422 },
      );
    }

    // Initialize database models
    initModels(db);

    // Find or create "File Upload" category
    let fileUploadCategory = await Category.findOne({
      where: {
        user_id: user.id,
        name: FILE_UPLOAD_CATEGORY.name,
      },
    });

    if (!fileUploadCategory) {
      try {
        fileUploadCategory = await Category.create({
          user_id: user.id,
          name: FILE_UPLOAD_CATEGORY.name,
          color: FILE_UPLOAD_CATEGORY.color,
          description: FILE_UPLOAD_CATEGORY.description,
        });
      } catch (error) {
        console.error("Failed to create File Upload category:", error);

        return NextResponse.json(
          {
            success: false,
            error: "Failed to create File Upload category",
            details: error instanceof Error ? error.message : String(error),
            stage: "category_creation",
          },
          { status: 500 },
        );
      }
    }

    // Process each parsed event
    const results: (FileEventResult | FileEventError)[] = [];
    let totalCreated = 0;
    let totalFailed = 0;

    for (const parsedEvent of parseResult.events) {
      try {
        // Look up currency by symbol
        const currency = await Currency.findOne({
          where: {
            symbol: parsedEvent.currency,
          },
        });

        if (!currency) {
          results.push({
            parsed: parsedEvent,
            error: `Currency not found: ${parsedEvent.currency}`,
            success: false,
          });
          totalFailed++;
          continue;
        }

        // Create the event
        const event = await Event.create({
          user_id: user.id,
          type: parsedEvent.type as EventType,
          amount: String(parsedEvent.amount),
          currency_id: currency.id,
          quantity: parsedEvent.quantity,
          description: parsedEvent.description,
          event_date: new Date(parsedEvent.event_date),
          parent_event_id: null,
          recurrence_rule: parsedEvent.recurrence_rule || null,
          recurrence_end_date: parsedEvent.recurrence_end_date
            ? new Date(parsedEvent.recurrence_end_date)
            : null,
          original_text: parsedEvent.raw_text,
        });

        // Assign the "File Upload" category to the event
        await EventCategories.create({
          event_id: event.id,
          category_id: fileUploadCategory.id,
        });

        // Add to results
        results.push({
          event: {
            id: event.id,
            user_id: event.user_id,
            type: event.type,
            amount: event.amount,
            currency_id: event.currency_id,
            quantity: event.quantity,
            description: event.description,
            event_date: event.event_date.toISOString(),
            parent_event_id: event.parent_event_id,
            recurrence_rule: event.recurrence_rule,
            recurrence_end_date:
              event.recurrence_end_date?.toISOString() || null,
            original_text: event.original_text || null,
            created_at: event.created_at.toISOString(),
            updated_at: event.updated_at.toISOString(),
          },
          parsed: parsedEvent,
          success: true,
        });
        totalCreated++;
      } catch (error) {
        console.error("Failed to create event:", error);
        results.push({
          parsed: parsedEvent,
          error: error instanceof Error ? error.message : String(error),
          success: false,
        });
        totalFailed++;
      }
    }

    // Return results
    return NextResponse.json(
      {
        success: true,
        data: {
          results,
          summary: {
            total_parsed: parseResult.events.length,
            total_created: totalCreated,
            total_failed: totalFailed,
            category_id: fileUploadCategory.id,
            category_name: fileUploadCategory.name,
          },
          parse_notes: parseResult.parse_notes || null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create from file endpoint error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
        stage: "event_creation",
      },
      { status: 500 },
    );
  }
}
