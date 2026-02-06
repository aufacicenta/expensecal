import { ReactNode } from "react";

import {
  ValuateInventorySuccessResponse,
  ValuationResultData,
} from "@/app/api/v1/inventory/valuate/types";

export type InventoryControllerProps = {
  children: ReactNode;
};

export type InventoryActionState = {
  isLoading: boolean;
  error?: string;
};

export type InventoryContextActionStates = {
  valuateItem: InventoryActionState;
  valuateMultiple: InventoryActionState;
};

/**
 * Result of a single item valuation
 */
export type ValuateItemResult = {
  success: boolean;
  data?: ValuationResultData;
  error?: string;
};

/**
 * Result of multiple item valuation
 */
export type ValuateMultipleResult = {
  success: boolean;
  data?: ValuateInventorySuccessResponse["data"];
  error?: string;
};

export type InventoryContextType = {
  actionStates: InventoryContextActionStates;

  /**
   * Track which event IDs are currently being valuated
   */
  valuatingEventIds: Set<string>;

  /**
   * Valuate a single inventory item
   * @param eventId - The event ID to valuate
   * @returns Promise with valuation result
   */
  valuateItem: (eventId: string) => Promise<ValuateItemResult>;

  /**
   * Valuate multiple inventory items
   * @param eventIds - Array of event IDs to valuate (max 10)
   * @returns Promise with valuation results
   */
  valuateMultiple: (eventIds: string[]) => Promise<ValuateMultipleResult>;
};
