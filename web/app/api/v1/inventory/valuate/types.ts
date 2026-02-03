import { InventoryValuation } from "@expensecal/database/models/Event";

import { BaseErrorResponse, BaseSuccessResponse } from "../../types";

/**
 * Request body for POST /api/v1/inventory/valuate
 */
export type ValuateInventoryRequestBody = {
  event_ids: string[];
};

/**
 * Single valuation result
 */
export type ValuationResultData = {
  event_id: string;
  success: boolean;
  valuation?: InventoryValuation;
  midpoint_value?: number;
  error?: string;
  stage?: "search_strategy" | "tavily_search" | "price_extraction" | "database";
};

/**
 * Success response for valuate endpoint
 */
export type ValuateInventorySuccessResponse = {
  data: {
    results: ValuationResultData[];
    summary: {
      total_requested: number;
      successful: number;
      failed: number;
    };
  };
} & BaseSuccessResponse;

/**
 * Error response for valuate endpoint
 */
export type ValuateInventoryErrorResponse = {
  details?: string;
  stage?: "validation" | "database" | "valuation";
} & BaseErrorResponse;

/**
 * Combined response type
 */
export type ValuateInventoryResponse =
  | ValuateInventorySuccessResponse
  | ValuateInventoryErrorResponse;
