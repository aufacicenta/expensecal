/**
 * LLM Parser Service using LiteLLM
 * Alternative to Ollama for unified LLM access
 */

import Event, { EventAttributes } from "@expensecal/database/models/Event";

export interface ParsedExpenseEvent {
  type: "EXPENSE" | "INCOME";
  amount: EventAttributes["amount"];
  currency: string;
  quantity: number;
  description: string;
  event_date: string;
  recurrence_rule?: string | null;
  recurrence_end_date?: string | null;
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
    model: string = "openai/gpt-5-nano",
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
      const prompt = this.buildPrompt(text, referenceDate);

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

  private buildPrompt(text: string, referenceDate: Date): string {
    const dateStr = referenceDate.toISOString().split("T")[0];
    const dayOfWeek = referenceDate.toLocaleDateString("en-US", {
      weekday: "long",
    });

    return `Current date: ${dateStr} (${dayOfWeek})

Extract structured data from this expense description. You must respond with a JSON object that matches the Event schema.

Rules:
1. Extract AMOUNT as a decimal string (e.g., "100.50", "3.00")
2. Extract CURRENCY symbol (USD, EUR, GBP, MXN, JPY, BTC, ETH, CAD, AUD, CHF, etc.)
3. Extract QUANTITY (number of items, default to 1)
4. Extract DESCRIPTION (what the expense is for)
5. Parse DATE to ISO 8601 format (e.g., "2025-10-15T00:00:00.000Z")
   - "yesterday" = ${new Date(referenceDate.getTime() - 86400000).toISOString()}
   - "today" = ${referenceDate.toISOString()}
   - "tomorrow" = ${new Date(referenceDate.getTime() + 86400000).toISOString()}
   - "last week" = subtract 7 days
   - "next month" = add 1 month
6. Determine TYPE: "EXPENSE" or "INCOME"
7. Calculate CONFIDENCE (0.0 to 1.0) based on clarity of input
8. Set recurrence_rule and recurrence_end_date to null unless recurring pattern is specified
   - If recurring, use RFC 5545 RRULE format (e.g., "FREQ=MONTHLY;INTERVAL=1")

Examples:
Input: "100 USD for yesterday's dinner with friends"
Output: {
  "type": "EXPENSE",
  "amount": "100.00",
  "currency": "USD",
  "quantity": 1,
  "description": "dinner with friends",
  "event_date": "2025-10-14T00:00:00.000Z",
  "confidence": 0.95,
  "recurrence_rule": null,
  "recurrence_end_date": null
}

Input: "5 coffees at 3 EUR each this morning"
Output: {
  "type": "EXPENSE",
  "amount": "3.00",
  "currency": "EUR",
  "quantity": 5,
  "description": "coffees",
  "event_date": "2025-10-15T00:00:00.000Z",
  "confidence": 0.90,
  "recurrence_rule": null,
  "recurrence_end_date": null
}

Input: "Monthly rent of 1500 USD starting today"
Output: {
  "type": "EXPENSE",
  "amount": "1500.00",
  "currency": "USD",
  "quantity": 1,
  "description": "rent",
  "event_date": "2025-10-15T00:00:00.000Z",
  "confidence": 0.95,
  "recurrence_rule": "FREQ=MONTHLY;INTERVAL=1",
  "recurrence_end_date": null
}

Now parse this:
Input: "${text}"`;
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

      const response = await fetch(`${this.apiBase}/health`, {
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
