/**
 * API Types for /api/v1/events/create
 * Protected endpoint for creating events from structured data
 */

import { BaseErrorResponse, BaseSuccessResponse } from "../../types";

export type CreateEventRequestBody = {
  type: "EXPENSE" | "INCOME";
  amount: number | string; // Accepts both for flexibility
  currency_id: string; // UUID of currency
  quantity?: number; // Optional, defaults to 1
  description: string;
  event_date: string; // ISO 8601 format
  parent_event_id?: string | null; // For recurring events
  recurrence_rule?: string | null; // RFC 5545 RRULE format
  recurrence_end_date?: string | null; // ISO 8601 format
};

export type CreatedEventData = {
  id: string;
  user_id: string;
  type: "EXPENSE" | "INCOME";
  amount: string;
  currency_id: string;
  quantity: number;
  description: string;
  event_date: string;
  parent_event_id: string | null;
  recurrence_rule: string | null;
  recurrence_end_date: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateEventSuccessResponse = {
  data: CreatedEventData;
} & BaseSuccessResponse;

export type CreateEventErrorResponse = {
  details?: string;
} & BaseErrorResponse;

export type CreateEventResponse =
  | CreateEventSuccessResponse
  | CreateEventErrorResponse;
