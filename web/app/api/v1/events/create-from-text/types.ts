/**
 * API Types for /api/v1/events/create-from-text
 * Protected endpoint for parsing natural language and creating events in one call
 */

import { BaseErrorResponse, BaseSuccessResponse } from "../../types";
import { InstallmentEventData, ParentEventData } from "../installments/types";
import { ParsedEventData } from "../parse/types";

export type CreateFromTextRequestBody = {
  text: string;
  current_date?: string; // ISO 8601 format, optional (defaults to now)
  create_installments?: boolean; // If true and event has recurrence_rule, automatically create installments
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
  original_text: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateFromTextSuccessResponse = {
  data: {
    event: CreatedEventData;
    parsed: ParsedEventData;
    installments?: {
      parent_event: ParentEventData;
      installments: InstallmentEventData[];
      installment_count: number;
      amount_per_installment: string;
    };
  };
} & BaseSuccessResponse;

export type CreateFromTextErrorResponse = {
  details?: string;
  stage?: "parsing" | "currency_lookup" | "creation" | "installments"; // Which stage failed
} & BaseErrorResponse;

export type CreateFromTextResponse =
  | CreateFromTextSuccessResponse
  | CreateFromTextErrorResponse;
