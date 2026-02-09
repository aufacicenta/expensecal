/**
 * API Types for /api/v1/events/create-from-file
 * Protected endpoint for parsing file content and creating multiple events
 */

import { BaseErrorResponse, BaseSuccessResponse } from "../../types";
import { CreatedEventData } from "../create-from-text/types";

import { ParsedExpenseEvent } from "@/lib/parser/litellmParser";

export type CreateFromFileRequestBody = {
  file_content: string; // File content (text for .txt/.csv/.json, base64 for binary files like PDF)
  file_name: string; // Original file name (helps LLM understand format)
  file_type: string; // MIME type (e.g., "text/plain", "application/pdf")
  current_date?: string; // ISO 8601 format, optional (defaults to now)
};

export type FileEventResult = {
  event: CreatedEventData;
  parsed: ParsedExpenseEvent;
  success: true;
};

export type FileEventError = {
  parsed: ParsedExpenseEvent;
  error: string;
  success: false;
};

export type CreateFromFileSuccessResponse = {
  data: {
    results: (FileEventResult | FileEventError)[];
    event_group: {
      id: string;
      name: string;
    };
    redirect_url: string; // /table/view/[event_group_id]
    summary: {
      total_parsed: number;
      total_created: number;
      total_failed: number;
    };
    parse_notes?: string | null;
  };
} & BaseSuccessResponse;

export type CreateFromFileErrorResponse = {
  details?: string;
  stage?: "parsing" | "event_creation" | "group_creation";
} & BaseErrorResponse;

export type CreateFromFileResponse =
  | CreateFromFileSuccessResponse
  | CreateFromFileErrorResponse;
