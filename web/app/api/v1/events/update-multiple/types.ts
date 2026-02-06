/**
 * API Types for /api/v1/events/update-multiple
 * Protected endpoint for updating multiple events in a single request
 */

import { EventAttributes } from "@expensecal/database/models/Event";

import { BaseErrorResponse, BaseSuccessResponse } from "../../types";
import { UpdateEventRequestBody } from "../[id]/types";

export type UpdateMultipleEventsRequestBody = {
  updates: Array<{
    eventId: string;
    data: UpdateEventRequestBody;
  }>;
};

export type UpdatedEventData = EventAttributes;

export type UpdateMultipleEventsSuccessResponse = {
  data: {
    updatedCount: number;
    updatedEvents: UpdatedEventData[];
    failedUpdates?: Array<{
      eventId: string;
      reason: string;
    }>;
  };
} & BaseSuccessResponse;

export type UpdateMultipleEventsErrorResponse = {
  details?: string;
  stage?: "validation" | "database" | "authorization";
  failedUpdates?: Array<{
    eventId: string;
    reason: string;
  }>;
} & BaseErrorResponse;

export type UpdateMultipleEventsResponse =
  | UpdateMultipleEventsSuccessResponse
  | UpdateMultipleEventsErrorResponse;
