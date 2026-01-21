/**
 * API Types for /api/v1/events/[id]/make-recurring
 * Protected endpoint for converting a single event into a recurring series
 */

import { EventAttributes } from "@expensecal/database/models/Event";

import { BaseErrorResponse, BaseSuccessResponse } from "../../../types";

/**
 * Supported recurrence frequencies
 */
export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

/**
 * Request body for making an event recurring
 */
export type MakeRecurringRequestBody = {
  /**
   * Recurrence frequency
   */
  frequency: RecurrenceFrequency;

  /**
   * Interval between occurrences (e.g., 2 for "every 2 weeks")
   * Default: 1
   */
  interval?: number;

  /**
   * Number of recurring instances to create
   * Must be at least 2
   */
  count: number;

  /**
   * If true, splits the parent amount across all instances (installments)
   * If false, each instance has the same amount as the parent (recurring)
   * Default: false
   */
  split_amount?: boolean;
};

/**
 * Response data for successful make-recurring operation
 */
export type MakeRecurringSuccessData = {
  /**
   * The updated parent event with recurrence_rule set
   */
  parent_event: EventAttributes;

  /**
   * Array of created child events
   */
  child_events: EventAttributes[];

  /**
   * Total number of child events created
   */
  child_count: number;

  /**
   * Amount per child event
   */
  amount_per_event: string;

  /**
   * Whether amount was split across instances
   */
  is_split: boolean;
};

/**
 * Successful response for make-recurring endpoint
 */
export type MakeRecurringSuccessResponse = {
  data: MakeRecurringSuccessData;
} & BaseSuccessResponse;

/**
 * Error response for make-recurring endpoint
 */
export type MakeRecurringErrorResponse = {
  details?: string;
} & BaseErrorResponse;

/**
 * Union type for make-recurring endpoint response
 */
export type MakeRecurringResponse =
  | MakeRecurringSuccessResponse
  | MakeRecurringErrorResponse;
