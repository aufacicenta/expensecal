/**
 * API Types for /api/v1/event-groups
 * Types for event groups (views) CRUD operations
 */

import { BaseErrorResponse, BaseSuccessResponse } from "../types";

// Shared types for event group data
export type EventGroupData = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

// GET /api/v1/event-groups - List all event groups
export type GetEventGroupsSuccessResponse = {
  data: EventGroupData[];
} & BaseSuccessResponse;

export type GetEventGroupsErrorResponse = {
  details?: string;
} & BaseErrorResponse;

export type GetEventGroupsResponse =
  | GetEventGroupsSuccessResponse
  | GetEventGroupsErrorResponse;
