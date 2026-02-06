/**
 * Valuation Service
 * Orchestrates the inventory valuation workflow:
 * 1. Generate search strategy (LLM)
 * 2. Search marketplaces (Tavily)
 * 3. Extract prices (LLM)
 * 4. Update Event with valuation data
 */

import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import {
  Event,
  InventoryMetadata,
  InventoryValuation,
  InventoryValuationSource,
} from "@expensecal/database/models/Event";

import { tavilyClient } from "./tavilyClient";
import { generateSearchStrategy } from "./generateSearchStrategy";
import { extractPricesFromResults } from "./extractPricesFromResults";

export type ValuationResult = {
  success: true;
  event_id: string;
  valuation: InventoryValuation;
  midpoint_value: number;
};

export type ValuationError = {
  success: false;
  event_id: string;
  error: string;
  stage: "search_strategy" | "tavily_search" | "price_extraction" | "database";
};

/**
 * Valuate a single inventory item
 */
export async function valuateItem(
  eventId: string,
): Promise<ValuationResult | ValuationError> {
  // Initialize database
  initModels(db);

  try {
    // Fetch the event
    const event = await Event.findByPk(eventId);

    if (!event) {
      return {
        success: false,
        event_id: eventId,
        error: "Event not found",
        stage: "database",
      };
    }

    if (!event.inventory_metadata) {
      return {
        success: false,
        event_id: eventId,
        error: "Event is not an inventory item",
        stage: "database",
      };
    }

    // Update status to IN_PROGRESS
    const updatedMetadata: InventoryMetadata = {
      ...event.inventory_metadata,
      valuation_status: "IN_PROGRESS",
    };

    await event.update({ inventory_metadata: updatedMetadata });

    // Step 1: Generate search strategy
    const strategyResult = await generateSearchStrategy(event.description, {
      brand: event.inventory_metadata.details?.brand ?? undefined,
      model: event.inventory_metadata.details?.model ?? undefined,
      year: event.inventory_metadata.details?.year ?? undefined,
      condition: event.inventory_metadata.details?.condition ?? undefined,
    });

    if ("error" in strategyResult) {
      await updateEventWithError(
        event,
        strategyResult.error,
        "search_strategy",
      );

      return {
        success: false,
        event_id: eventId,
        error: strategyResult.error,
        stage: "search_strategy",
      };
    }

    // Step 2: Search with Tavily
    const searchResult = await tavilyClient.search({
      query: strategyResult.query,
      include_domains:
        strategyResult.domains.length > 0 ? strategyResult.domains : undefined,
      search_depth: "advanced",
      max_results: 15,
    });

    if ("error" in searchResult) {
      await updateEventWithError(event, searchResult.error, "tavily_search");

      return {
        success: false,
        event_id: eventId,
        error: searchResult.error,
        stage: "tavily_search",
      };
    }

    if (searchResult.results.length === 0) {
      await updateEventWithError(
        event,
        "No search results found",
        "tavily_search",
      );

      return {
        success: false,
        event_id: eventId,
        error: "No search results found",
        stage: "tavily_search",
      };
    }

    // Step 3: Extract prices from results
    const extractionResult = await extractPricesFromResults(
      event.description,
      strategyResult.query,
      searchResult.results,
    );

    if ("error" in extractionResult) {
      await updateEventWithError(
        event,
        extractionResult.error,
        "price_extraction",
      );

      return {
        success: false,
        event_id: eventId,
        error: extractionResult.error,
        stage: "price_extraction",
      };
    }

    // Step 4: Build valuation and update event
    const sources: InventoryValuationSource[] = extractionResult.prices_found
      .slice(0, 10) // Limit to top 10 sources
      .map((p) => ({
        url: p.source,
        title: p.source, // Tavily doesn't give us titles per price
        price: p.price,
      }));

    const valuation: InventoryValuation = {
      estimated_low: extractionResult.estimated_low,
      estimated_high: extractionResult.estimated_high,
      currency: extractionResult.currency,
      confidence: extractionResult.confidence,
      data_points: extractionResult.data_points,
      sources,
      last_updated: new Date().toISOString(),
      search_query_used: strategyResult.query,
    };

    // Calculate midpoint for Event.amount
    const midpointValue =
      (extractionResult.estimated_low + extractionResult.estimated_high) / 2;

    // Update event with valuation
    const finalMetadata: InventoryMetadata = {
      ...event.inventory_metadata,
      valuation,
      valuation_status: "COMPLETED",
      valuation_error: undefined,
      needs_clarification:
        extractionResult.confidence === "LOW"
          ? strategyResult.specifics_that_would_help
          : undefined,
    };

    await event.update({
      amount: midpointValue.toFixed(2),
      inventory_metadata: finalMetadata,
    });

    return {
      success: true,
      event_id: eventId,
      valuation,
      midpoint_value: midpointValue,
    };
  } catch (error) {
    console.error(`Valuation error for event ${eventId}:`, error);

    // Try to update the event with error status
    try {
      const event = await Event.findByPk(eventId);

      if (event) {
        await updateEventWithError(
          event,
          error instanceof Error ? error.message : String(error),
          "database",
        );
      }
    } catch {
      // Ignore secondary errors
    }

    return {
      success: false,
      event_id: eventId,
      error: error instanceof Error ? error.message : String(error),
      stage: "database",
    };
  }
}

/**
 * Helper to update event with error status
 */
async function updateEventWithError(
  event: Event,
  error: string,
  stage: string,
): Promise<void> {
  const metadata: InventoryMetadata = {
    ...event.inventory_metadata,
    valuation_status: "FAILED",
    valuation_error: `${stage}: ${error}`,
  };

  await event.update({ inventory_metadata: metadata });
}

/**
 * Valuate multiple items in parallel
 */
export async function valuateItems(
  eventIds: string[],
): Promise<(ValuationResult | ValuationError)[]> {
  // Run all valuations in parallel
  const results = await Promise.all(eventIds.map((id) => valuateItem(id)));

  return results;
}

/**
 * Find events that need valuation (PENDING status, amount = 0)
 */
export async function findEventsNeedingValuation(
  userId: string,
  limit: number = 10,
): Promise<Event[]> {
  initModels(db);

  const events = await Event.findAll({
    where: {
      user_id: userId,
      amount: "0",
    },
    limit,
    order: [["created_at", "DESC"]],
  });

  // Filter to only events with PENDING valuation status
  return events.filter(
    (e) =>
      e.inventory_metadata &&
      e.inventory_metadata.valuation_status === "PENDING",
  );
}

export default {
  valuateItem,
  valuateItems,
  findEventsNeedingValuation,
};
