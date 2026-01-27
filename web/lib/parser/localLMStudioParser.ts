/**
 * Local LM Studio Parser Service
 * Uses LM Studio running on MacOS at http://127.0.0.1:1234 with microsoft/phi-4 model
 */

import { buildFilePrompt, buildPrompt } from "./buildPrompt";
import {
  ParsedExpenseEvent,
  ParsedFileResult,
  ParseError,
} from "./litellmParser";
import { getFileParsingSystemPrompt, getSystemPrompt } from "./systemPrompt";

import {
  ParsedEventData,
  ParseErrorResponse,
} from "@/app/api/v1/events/parse/types";

export class LocalLMStudioParser {
  private apiBase: string;
  private model: string;

  constructor(
    apiBase: string = process.env.LLM_API_BASE || "http://127.0.0.1:1234",
    model: string = process.env.LLM_MODEL || "microsoft/phi-4",
  ) {
    this.apiBase = apiBase;
    this.model = model;
  }

  async parse(
    text: string,
    currentDate?: Date,
  ): Promise<ParsedEventData | ParseErrorResponse> {
    try {
      const referenceDate = currentDate || new Date();
      const prompt = buildPrompt(text, referenceDate);

      const response = await fetch(`${this.apiBase}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content: getSystemPrompt(),
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.1,
          top_p: 0.9,
          max_tokens: 500,
          stream: false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();

        return {
          error: "LM Studio API error",
          details: `Status ${response.status}: ${error}`,
          success: false,
        };
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        return {
          error: "Invalid response format from LM Studio",
          details: JSON.stringify(data),
          success: false,
        };
      }

      let content = data.choices[0].message.content.trim();

      // Extract JSON from markdown code fences if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);

      if (jsonMatch) {
        content = jsonMatch[1].trim();
      }

      // Parse the JSON response
      const eventData = JSON.parse(content);

      // Validate and normalize the response
      const result: ParsedEventData = {
        type: eventData.type === "INCOME" ? "INCOME" : "EXPENSE",
        amount: String(eventData.amount),
        currency: String(eventData.currency).toUpperCase(),
        quantity: Number(eventData.quantity) || 1,
        description: String(eventData.description),
        event_date: String(eventData.event_date),
        recurrence_rule: eventData.recurrence_rule || null,
        recurrence_end_date: eventData.recurrence_end_date || null,
        split_installments: Boolean(eventData.split_installments) || false,
        confidence: Math.max(
          0,
          Math.min(1, Number(eventData.confidence) || 0.5),
        ),
        raw_text: text,
      };

      return result;
    } catch (error) {
      console.error("Local LM Studio Parser Error:", error);

      return {
        error: "Failed to parse expense text",
        details: error instanceof Error ? error.message : String(error),
        success: false,
      };
    }
  }

  async checkHealth(): Promise<{
    available: boolean;
    model: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.apiBase}/v1/models`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return {
          available: false,
          model: this.model,
          error: `LM Studio health check failed: ${response.status}`,
        };
      }

      const data = await response.json();

      // Check if any models are available
      if (!data.data || data.data.length === 0) {
        return {
          available: false,
          model: this.model,
          error: "No models available in LM Studio",
        };
      }

      return {
        available: true,
        model: this.model,
      };
    } catch (error) {
      return {
        available: false,
        model: this.model,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Parse a file and extract multiple expense/income events
   * The LLM intelligently determines the file format and extracts all transactions
   * Note: Local LM Studio does not support binary files like PDFs
   */
  async parseFile(
    fileContent: string,
    fileName: string,
    fileType: string,
    currentDate?: Date,
  ): Promise<ParsedFileResult | ParseError> {
    try {
      // Check if this is a binary file - not supported in local mode
      const isBinaryFile =
        fileType === "application/pdf" ||
        fileType.startsWith("image/") ||
        fileType ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        fileType === "application/vnd.ms-excel";

      if (isBinaryFile) {
        return {
          error: "Binary file parsing not supported in development mode",
          details:
            "PDF and image files require LiteLLM in production. Please use text files (.txt, .csv, .json) for local development.",
        };
      }

      const referenceDate = currentDate || new Date();
      const prompt = buildFilePrompt(fileContent, fileName, referenceDate);

      const response = await fetch(`${this.apiBase}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content: getFileParsingSystemPrompt(),
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.1,
          top_p: 0.9,
          max_tokens: 4000, // Larger for batch processing
          stream: false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();

        return {
          error: "LM Studio API error",
          details: `Status ${response.status}: ${error}`,
        };
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        return {
          error: "Invalid response format from LM Studio",
          details: JSON.stringify(data),
        };
      }

      let content = data.choices[0].message.content.trim();

      // Extract JSON from markdown code fences if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);

      if (jsonMatch) {
        content = jsonMatch[1].trim();
      }

      // Parse the JSON response
      const parsedData = JSON.parse(content);

      // Normalize the events array
      const events: ParsedExpenseEvent[] = (parsedData.events || []).map(
        (event: any) => ({
          type: event.type === "INCOME" ? "INCOME" : "EXPENSE",
          amount: String(event.amount),
          currency: String(event.currency || "USD").toUpperCase(),
          quantity: Number(event.quantity) || 1,
          description: String(event.description),
          event_date: String(event.event_date),
          recurrence_rule: event.recurrence_rule || null,
          recurrence_end_date: event.recurrence_end_date || null,
          split_installments: Boolean(event.split_installments) || false,
          confidence: Math.max(0, Math.min(1, Number(event.confidence) || 0.5)),
          raw_text: String(event.raw_text || ""),
        }),
      );

      const result: ParsedFileResult = {
        events,
        parse_notes: parsedData.parse_notes || null,
      };

      return result;
    } catch (error) {
      console.error("Local LM Studio File Parser Error:", error);

      return {
        error: "Failed to parse file content",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Singleton instance
let parserInstance: LocalLMStudioParser | null = null;

export function getLocalLMStudioParser(): LocalLMStudioParser {
  if (!parserInstance) {
    parserInstance = new LocalLMStudioParser();
  }

  return parserInstance;
}
