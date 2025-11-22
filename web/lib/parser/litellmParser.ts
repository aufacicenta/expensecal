/**
 * LLM Parser Service using LiteLLM
 * Alternative to Ollama for unified LLM access
 */

import Event, { EventAttributes } from "@expensecal/database/models/Event";
import { buildPrompt } from "./buildPrompt";
import { getSystemPrompt } from "./systemPrompt";

export interface ParsedExpenseEvent {
  type: "EXPENSE" | "INCOME";
  amount: EventAttributes["amount"];
  currency: string;
  quantity: number;
  description: string;
  event_date: string;
  recurrence_rule?: string | null;
  recurrence_end_date?: string | null;
  split_installments?: boolean;
  confidence: number;
  raw_text: string;
}

export interface ParseError {
  error: string;
  details?: string;
}

export class LiteLLMParser {
  private apiBase: string;
  private model: string;
  private apiKey?: string;
  private schema: any;

  constructor(
    model: string = process.env.LLM_MODEL || "openai/gpt-5-nano",
    apiBase?: string,
    apiKey?: string,
  ) {
    this.model = model;
    this.apiBase =
      apiBase || process.env.LITELLM_API_BASE || "http://localhost:4000";
    this.apiKey = apiKey || process.env.LITELLM_API_KEY;

    // Generate schema from Event model
    this.schema = Event.getParserSchema();
  }

  async parse(
    text: string,
    currentDate?: Date,
  ): Promise<ParsedExpenseEvent | ParseError> {
    try {
      const referenceDate = currentDate || new Date();
      const prompt = buildPrompt(text, referenceDate);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.apiBase}/v1/responses`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: this.model,
          input: [
            {
              role: "system",
              content: getSystemPrompt(),
              type: "message",
            },
            {
              role: "user",
              content: prompt,
              type: "message",
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "EventParser",
              schema: this.schema,
              strict: true,
            },
          },
          stream: false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          error: "LiteLLM API error",
          details: `Status ${response.status}: ${error}`,
        };
      }

      const data = await response.json();

      // Extract the message type output from the response
      const messageOutput = data.output?.find(
        (item: any) => item.type === "message",
      );

      if (!messageOutput) {
        return {
          error: "No message output from LiteLLM",
          details: JSON.stringify(data),
        };
      }

      // Extract the text content from the message
      const textContent = messageOutput.content?.find(
        (item: any) => item.type === "output_text",
      );

      if (!textContent?.text) {
        return {
          error: "No text content in message output",
          details: JSON.stringify(messageOutput),
        };
      }

      // Parse the JSON response
      const eventData = JSON.parse(textContent.text);

      // Add raw_text to the response
      const result: ParsedExpenseEvent = {
        ...eventData,
        raw_text: text,
      };

      return result;
    } catch (error) {
      console.error("LiteLLM Parser Error:", error);
      return {
        error: "Failed to parse expense text",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async checkHealth(): Promise<{
    available: boolean;
    model: string;
    error?: string;
  }> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.apiBase}/health/liveness`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        return {
          available: false,
          model: this.model,
          error: `LiteLLM health check failed: ${response.status}`,
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
   * Get the JSON schema being used for parsing
   */
  getSchema() {
    return this.schema;
  }
}

// Singleton instance
let parserInstance: LiteLLMParser | null = null;

export function getLiteLLMParser(): LiteLLMParser {
  if (!parserInstance) {
    parserInstance = new LiteLLMParser();
  }

  return parserInstance;
}
