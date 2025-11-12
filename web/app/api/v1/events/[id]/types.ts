/**
 * API Types for /api/v1/events/[id]
 * Protected endpoint for updating and deleting events
 */

import { EventAttributes } from "@expensecal/database/models/Event";
import { BaseErrorResponse, BaseSuccessResponse } from "../../types";

export type UpdateEventRequestBody = {
  type?: EventAttributes["type"];
  amount?: EventAttributes["amount"];
  currency_id?: EventAttributes["currency_id"]; // UUID of currency
  quantity?: EventAttributes["quantity"];
  description?: EventAttributes["description"];
  event_date?: EventAttributes["event_date"]; // ISO 8601 format
  recurrence_end_date?: EventAttributes["recurrence_end_date"]; // ISO 8601 format
  categoryIds?: string[]; // Array of category IDs to assign to the event
};

export type UpdatedEventData = EventAttributes;

export type UpdateEventSuccessResponse = {
  data: UpdatedEventData;
} & BaseSuccessResponse;

export type UpdateEventErrorResponse = {
  details?: string;
} & BaseErrorResponse;

export type UpdateEventResponse =
  | UpdateEventSuccessResponse
  | UpdateEventErrorResponse;
