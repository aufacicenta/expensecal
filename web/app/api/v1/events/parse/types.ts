/**
 * API Types for /api/v1/events/parse
 * Public endpoint for parsing natural language expense text
 */

import { EventAttributes } from "@expensecal/database/models/Event";
import { BaseErrorResponse, BaseSuccessResponse } from "../../types";

export type ParseRequestBody = {
  text: string;
  current_date?: string; // ISO 8601 format, optional (defaults to now)
};

export type ParsedEventData = {
  amount: EventAttributes["amount"];
  currency: string;
  currency_id?: string; // UUID of the currency, optional (will be filled by parse endpoint)
  quantity: number;
  description: string;
  event_date: string; // ISO 8601 format
  type: "EXPENSE" | "INCOME";
  confidence: number; // 0-1 score
  raw_text: string;
  recurrence_rule?: string | null; // RFC 5545 RRULE format, optional
  recurrence_end_date?: string | null; // ISO 8601 date string, optional
};

export type ParseSuccessResponse = {
  data: ParsedEventData;
} & BaseSuccessResponse;

export type ParseErrorResponse = {
  details?: string;
} & BaseErrorResponse;

export type ParseResponse = ParseSuccessResponse | ParseErrorResponse;
