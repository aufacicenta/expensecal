/**
 * API Types for /api/v1/events/[id]/children
 * Protected endpoint for fetching child events of a recurring event
 */

import { EventAttributes } from "@expensecal/database/models/Event";

import { BaseErrorResponse, BaseSuccessResponse } from "../../../types";

export type ChildEventData = EventAttributes;

export type GetChildEventsSuccessResponse = {
  data: ChildEventData[];
} & BaseSuccessResponse;

export type GetChildEventsErrorResponse = {
  details?: string;
} & BaseErrorResponse;

export type GetChildEventsResponse =
  | GetChildEventsSuccessResponse
  | GetChildEventsErrorResponse;
