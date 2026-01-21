/**
 * API Types for /api/v1/events/delete-multiple
 * Protected endpoint for deleting multiple events in a single request
 */

import { EventAttributes } from "@expensecal/database/models/Event";

import { BaseErrorResponse, BaseSuccessResponse } from "../../types";
import { DeleteMode } from "../[id]/types";

export type DeleteMultipleEventsRequestBody = {
  eventIds: string[]; // Array of event IDs to delete
  deleteMode?: DeleteMode; // "single" (default) | "all-future"
};

export type DeletedEventData = EventAttributes;

export type DeleteMultipleEventsSuccessResponse = {
  data: {
    deletedCount: number;
    deletedEvents: DeletedEventData[];
  };
} & BaseSuccessResponse;

export type DeleteMultipleEventsErrorResponse = {
  details?: string;
  stage?: "validation" | "database" | "authorization";
  failedEventIds?: {
    eventId: string;
    reason: string;
  }[];
} & BaseErrorResponse;

export type DeleteMultipleEventsResponse =
  | DeleteMultipleEventsSuccessResponse
  | DeleteMultipleEventsErrorResponse;
