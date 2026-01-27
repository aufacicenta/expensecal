/**
 * API Types for /api/v1/event-groups/[id]
 * Types for single event group operations (GET, PUT, DELETE)
 */

import { BaseErrorResponse, BaseSuccessResponse } from "../../types";
import { EventGroupData } from "../types";

// Simplified event data for response
export type EventGroupEventData = {
  id: string;
  type: string;
  amount: string;
  currency_id: string;
  quantity: number;
  description: string;
  event_date: string;
  currency?: {
    id: string;
    symbol: string;
    name: string;
  };
  categories?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
};

// GET /api/v1/event-groups/[id] - Get single event group with events
export type GetEventGroupSuccessResponse = {
  data: {
    group: EventGroupData;
    events: EventGroupEventData[];
  };
} & BaseSuccessResponse;

export type GetEventGroupErrorResponse = {
  details?: string;
} & BaseErrorResponse;

export type GetEventGroupResponse =
  | GetEventGroupSuccessResponse
  | GetEventGroupErrorResponse;

// PUT /api/v1/event-groups/[id] - Update event group
export type UpdateEventGroupRequestBody = {
  name?: string;
  eventIds?: string[]; // Replace all events in the group
};

export type UpdateEventGroupSuccessResponse = {
  data: EventGroupData;
} & BaseSuccessResponse;

export type UpdateEventGroupErrorResponse = {
  details?: string;
} & BaseErrorResponse;

export type UpdateEventGroupResponse =
  | UpdateEventGroupSuccessResponse
  | UpdateEventGroupErrorResponse;

// DELETE /api/v1/event-groups/[id] - Delete event group
export type DeleteEventGroupSuccessResponse = {
  data: {
    deleted_id: string;
  };
} & BaseSuccessResponse;

export type DeleteEventGroupErrorResponse = {
  details?: string;
} & BaseErrorResponse;

export type DeleteEventGroupResponse =
  | DeleteEventGroupSuccessResponse
  | DeleteEventGroupErrorResponse;
