/**
 * Local LM Studio Parser Service
 * Uses LM Studio running on MacOS at http://127.0.0.1:1234 with microsoft/phi-4 model
 */

import {
  ParsedEventData,
  ParseErrorResponse,
} from "@/app/api/v1/events/parse/types";

export class LocalLMStudioParser {
  private apiBase: string;
  private model: string;

  constructor(
    apiBase: string = process.env.LLM_API_BASE || "http://127.0.0.1:1234",
    model: string = "microsoft/phi-4",
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
      const prompt = this.buildPrompt(text, referenceDate);

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
              content: `You are an expense parser. Extract structured data from natural language expense descriptions and respond ONLY with valid JSON matching this exact structure:
{
  "type": "EXPENSE" | "INCOME",
  "amount": "decimal string like 100.50",
  "currency": "USD/EUR/GBP/etc",
  "quantity": number,
  "description": "string",
  "event_date": "ISO 8601 datetime string",
  "recurrence_rule": null | "RRULE string",
  "recurrence_end_date": null | "ISO 8601 date string",
  "split_installments": boolean,
  "confidence": number from 0.0 to 1.0
}

Do NOT include any text before or after the JSON. Respond with ONLY the JSON object.`,
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

  private buildPrompt(text: string, referenceDate: Date): string {
    const dateStr = referenceDate.toISOString().split("T")[0];
    const dayOfWeek = referenceDate.toLocaleDateString("en-US", {
      weekday: "long",
    });

    return `Current date: ${dateStr} (${dayOfWeek})

Extract structured expense/income data from this description:
"${text}"

Rules:
1. Extract AMOUNT as a decimal string (e.g., "100.50", "3.00")
2. Extract CURRENCY symbol (USD, EUR, GBP, MXN, JPY, BTC, ETH, CAD, AUD, CHF, etc.)
3. Extract QUANTITY (number of items, default to 1)
4. Extract DESCRIPTION (what the expense is for)
5. Parse DATE to ISO 8601 format with time (e.g., "2025-10-15T00:00:00.000Z")
   - "yesterday" = ${new Date(referenceDate.getTime() - 86400000).toISOString()}
   - "today" = ${referenceDate.toISOString()}
   - "tomorrow" = ${new Date(referenceDate.getTime() + 86400000).toISOString()}
   - "last week" = subtract 7 days
   - "next month" = add 1 month
6. Determine TYPE: "EXPENSE" or "INCOME"
7. Determine SPLIT_INSTALLMENTS (boolean):
   - true if the total amount should be divided across multiple dates (phrases like "split", "divide", "X over Y months", "X installments", "pay X total over Y months")
   - false if it's a recurring amount that repeats at the same rate (phrases like "monthly rent", "weekly pay", "biweekly", "every X days/weeks/months")
   - default to false for recurring events
8. Calculate CONFIDENCE (0.0 to 1.0) based on clarity of input
9. Set recurrence_rule and recurrence_end_date to null unless recurring pattern is specified
   - If recurring, use RFC 5545 RRULE format with valid frequencies: YEARLY, MONTHLY, WEEKLY, DAILY, HOURLY, MINUTELY, SECONDLY
   - Convert common patterns to INTERVAL syntax:
     * "quarterly" → "FREQ=MONTHLY;INTERVAL=3"
     * "semi-annually" or "twice a year" → "FREQ=MONTHLY;INTERVAL=6"
     * "biweekly" or "every 2 weeks" → "FREQ=WEEKLY;INTERVAL=2"
     * "semi-monthly" or "twice a month" → Use two separate monthly payments (keep as null, not supported)
     * "daily" → "FREQ=DAILY;INTERVAL=1"
     * "weekly" → "FREQ=WEEKLY;INTERVAL=1"
     * "monthly" → "FREQ=MONTHLY;INTERVAL=1"
     * "yearly" or "annually" → "FREQ=YEARLY;INTERVAL=1"

Examples:
Input: "100 USD for yesterday's dinner with friends"
Output: {"type": "EXPENSE", "amount": "100.00", "currency": "USD", "quantity": 1, "description": "dinner with friends", "event_date": "2025-10-14T00:00:00.000Z", "recurrence_rule": null, "recurrence_end_date": null, "split_installments": false, "confidence": 0.95}

Input: "5 coffees at 3 EUR each this morning"
Output: {"type": "EXPENSE", "amount": "3.00", "currency": "EUR", "quantity": 5, "description": "coffees", "event_date": "2025-10-15T00:00:00.000Z", "recurrence_rule": null, "recurrence_end_date": null, "split_installments": false, "confidence": 0.90}

Input: "Monthly rent of 1500 USD starting today"
Output: {"type": "EXPENSE", "amount": "1500.00", "currency": "USD", "quantity": 1, "description": "rent", "event_date": "2025-10-15T00:00:00.000Z", "recurrence_rule": "FREQ=MONTHLY;INTERVAL=1", "recurrence_end_date": null, "split_installments": false, "confidence": 0.95}

Input: "1200 USD house rent 1st of each month"
Output: {"type": "EXPENSE", "amount": "1200.00", "currency": "USD", "quantity": 1, "description": "house rent", "event_date": "2025-11-01T00:00:00.000Z", "recurrence_rule": "FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=1", "recurrence_end_date": null, "split_installments": false, "confidence": 0.95}

Input: "1200 USD split equally over 12 months starting next month"
Output: {"type": "EXPENSE", "amount": "1200.00", "currency": "USD", "quantity": 1, "description": "payment", "event_date": "2025-11-01T00:00:00.000Z", "recurrence_rule": "FREQ=MONTHLY;INTERVAL=1;COUNT=12", "recurrence_end_date": null, "split_installments": true, "confidence": 0.95}

Input: "50 USD quarterly insurance next month"
Output: {"type": "EXPENSE", "amount": "50.00", "currency": "USD", "quantity": 1, "description": "insurance", "event_date": "2025-11-15T00:00:00.000Z", "recurrence_rule": "FREQ=MONTHLY;INTERVAL=3", "recurrence_end_date": null, "split_installments": false, "confidence": 0.92}`;
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
}

// Singleton instance
let parserInstance: LocalLMStudioParser | null = null;

export function getLocalLMStudioParser(): LocalLMStudioParser {
  if (!parserInstance) {
    parserInstance = new LocalLMStudioParser();
  }

  return parserInstance;
}
