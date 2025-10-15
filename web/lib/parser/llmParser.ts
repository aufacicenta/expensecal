import { Ollama } from "ollama";

export interface ParsedExpenseEvent {
  amount: number;
  currency: string; // Currency symbol (USD, EUR, etc.)
  quantity: number;
  description: string;
  event_date: string; // ISO 8601 format
  type: "EXPENSE" | "INCOME";
  confidence: number; // 0-1 score
  raw_text: string;
}

export interface ParseError {
  error: string;
  details?: string;
}

/**
 * LLM Parser Service using Ollama with phi3:mini model
 * Parses natural language expense/income descriptions into structured data
 */
export class LLMParser {
  private ollama: Ollama;
  private model: string;

  constructor(model: string = "phi3:mini") {
    this.ollama = new Ollama({
      host: process.env.OLLAMA_HOST || "http://localhost:11434",
    });
    this.model = model;
  }

  /**
   * Parse natural language text into structured expense event data
   */
  async parse(
    text: string,
    currentDate?: Date,
  ): Promise<ParsedExpenseEvent | ParseError> {
    try {
      const referenceDate = currentDate || new Date();
      const prompt = this.buildPrompt(text, referenceDate);

      const response = await this.ollama.generate({
        model: this.model,
        prompt,
        stream: false,
        options: {
          temperature: 0.1, // Low temperature for consistent parsing
          top_p: 0.9,
        },
      });

      const parsed = this.parseResponse(response.response, text);
      return parsed;
    } catch (error) {
      console.error("LLM Parser Error:", error);
      return {
        error: "Failed to parse expense text",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Build the prompt for the LLM
   */
  private buildPrompt(text: string, referenceDate: Date): string {
    const dateStr = referenceDate.toISOString().split("T")[0];
    const dayOfWeek = referenceDate.toLocaleDateString("en-US", {
      weekday: "long",
    });

    return `You are an expense parser. Extract structured data from natural language expense descriptions.

Current date: ${dateStr} (${dayOfWeek})

Rules:
1. Extract the AMOUNT (numeric value)
2. Extract the CURRENCY (USD, EUR, GBP, MXN, JPY, BTC, ETH, CAD, AUD, CHF, etc.)
3. Extract the QUANTITY (number of items, default to 1 if not specified)
4. Extract the DESCRIPTION (what the expense is for)
5. Extract the DATE (parse relative dates like "yesterday", "next week", "last month")
6. Determine TYPE: "EXPENSE" or "INCOME"
7. Calculate CONFIDENCE (0.0 to 1.0) based on how clear the input is

Examples:
Input: "100 USD for yesterday's dinner with friends"
Output: {"amount": 100, "currency": "USD", "quantity": 1, "description": "dinner with friends", "event_date": "2025-10-14", "type": "EXPENSE", "confidence": 0.95}

Input: "5 coffees at 3 EUR each this morning"
Output: {"amount": 3, "currency": "EUR", "quantity": 5, "description": "coffees", "event_date": "2025-10-15", "type": "EXPENSE", "confidence": 0.90}

Input: "3500 MXN for a new cellphone next year"
Output: {"amount": 3500, "currency": "MXN", "quantity": 1, "description": "new cellphone", "event_date": "2026-01-01", "type": "EXPENSE", "confidence": 0.85}

Input: "Received 5000 dollars salary today"
Output: {"amount": 5000, "currency": "USD", "quantity": 1, "description": "salary", "event_date": "2025-10-15", "type": "INCOME", "confidence": 0.92}

Now parse this:
Input: "${text}"
Output: `;
  }

  /**
   * Parse the LLM response into structured data
   */
  private parseResponse(
    response: string,
    rawText: string,
  ): ParsedExpenseEvent | ParseError {
    try {
      // Extract JSON from response (LLM might add extra text)
      const jsonMatch = response.match(/\{[^}]+\}/);
      if (!jsonMatch) {
        return {
          error: "Could not extract structured data from response",
          details: response,
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (
        !parsed.amount ||
        !parsed.currency ||
        !parsed.description ||
        !parsed.event_date
      ) {
        return {
          error: "Missing required fields in parsed data",
          details: JSON.stringify(parsed),
        };
      }

      // Ensure proper types and defaults
      const result: ParsedExpenseEvent = {
        amount: Number(parsed.amount),
        currency: String(parsed.currency).toUpperCase(),
        quantity: parsed.quantity ? Number(parsed.quantity) : 1,
        description: String(parsed.description),
        event_date: String(parsed.event_date),
        type: parsed.type === "INCOME" ? "INCOME" : "EXPENSE",
        confidence: parsed.confidence ? Number(parsed.confidence) : 0.5,
        raw_text: rawText,
      };

      // Validate confidence is between 0 and 1
      result.confidence = Math.max(0, Math.min(1, result.confidence));

      // Validate date format (ISO 8601)
      if (!/^\d{4}-\d{2}-\d{2}/.test(result.event_date)) {
        return {
          error: "Invalid date format",
          details: `Expected ISO 8601 format, got: ${result.event_date}`,
        };
      }

      return result;
    } catch (error) {
      return {
        error: "Failed to parse LLM response",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check if Ollama is available and the model is installed
   */
  async checkHealth(): Promise<{
    available: boolean;
    model: string;
    error?: string;
  }> {
    try {
      const models = await this.ollama.list();
      const modelExists = models.models.some((m: { name: string }) =>
        m.name.includes(this.model),
      );

      if (!modelExists) {
        return {
          available: false,
          model: this.model,
          error: `Model ${this.model} not found. Run: ollama pull ${this.model}`,
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
let parserInstance: LLMParser | null = null;

export function getParser(): LLMParser {
  if (!parserInstance) {
    parserInstance = new LLMParser();
  }

  return parserInstance;
}
