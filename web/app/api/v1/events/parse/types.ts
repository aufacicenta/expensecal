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
  quantity: number;
  description: string;
  event_date: string; // ISO 8601 format
  type: "EXPENSE" | "INCOME";
  confidence: number; // 0-1 score
  raw_text: string;
};

export type ParseSuccessResponse = {
  data: ParsedEventData;
} & BaseSuccessResponse;

export type ParseErrorResponse = {
  details?: string;
} & BaseErrorResponse;

export type ParseResponse = ParseSuccessResponse | ParseErrorResponse;
