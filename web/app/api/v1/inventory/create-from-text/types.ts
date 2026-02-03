/**
 * API Types for /api/v1/inventory/create-from-text
 * Protected endpoint for parsing inventory items from natural language text
 * and creating events with inventory_metadata populated
 */

import {
  InventoryAcquisition,
  InventoryDetails,
  InventoryMetadata,
} from "@expensecal/database/models/Event";

import { BaseErrorResponse, BaseSuccessResponse } from "../../types";

export type CreateInventoryFromTextRequestBody = {
  text: string; // Multi-line text with one item per line
  current_date?: string; // ISO 8601 format date for context
  group_name?: string; // Optional name for the EventGroup (defaults to "Inventory - {date}")
  event_group_id?: string; // If provided, add items to this existing group instead of creating a new one
};

// Parsed inventory item from LLM
export type ParsedInventoryItem = {
  description: string; // Cleaned item description for display
  acquisition?: InventoryAcquisition;
  details?: InventoryDetails;
  confidence: number; // 0.0 to 1.0
};

export type CreatedInventoryEventData = {
  id: string;
  description: string;
  inventory_metadata: InventoryMetadata;
  valuation_status: "PENDING";
};

export type InventoryParseFailure = {
  original_text: string;
  error: string;
};

export type CreateInventoryFromTextSuccessResponse = {
  data: {
    events: CreatedInventoryEventData[];
    failures: InventoryParseFailure[];
    event_group: {
      id: string;
      name: string;
    };
    redirect_url: string; // /table/view/[event_group_id]
    summary: {
      total_parsed: number;
      total_created: number;
      total_failed: number;
    };
    valuation_triggered?: boolean; // Whether background valuation was started
  };
} & BaseSuccessResponse;

export type CreateInventoryFromTextErrorResponse = {
  details?: string;
  stage?: "validation" | "parsing" | "database" | "group_creation";
} & BaseErrorResponse;

export type CreateInventoryFromTextResponse =
  | CreateInventoryFromTextSuccessResponse
  | CreateInventoryFromTextErrorResponse;
