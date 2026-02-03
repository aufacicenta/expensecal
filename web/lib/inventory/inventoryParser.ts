/**
 * Inventory Item Parser
 * Parses natural language inventory item descriptions and extracts structured data
 * for creating events with inventory_metadata populated
 */

import {
  InventoryAcquisition,
  InventoryDetails,
} from "@expensecal/database/models/Event";

export type ParsedInventoryItem = {
  description: string;
  acquisition?: InventoryAcquisition;
  details?: InventoryDetails;
  confidence: number;
};

export type InventoryParseError = {
  error: string;
  details?: string;
};

/**
 * System prompt for inventory item parsing
 */
function getInventoryParsingSystemPrompt(): string {
  return `You are an inventory item parser. Extract structured data from natural language descriptions of owned items/assets.

Given a description of an item, extract:
- A cleaned description for display
- Acquisition information (how it was obtained, purchase price, date)
- Item details (condition, year, brand, model)
- Your confidence in the parsing (0.0 to 1.0)

Respond ONLY with valid JSON matching this exact structure:
{
  "description": "cleaned item description for display",
  "acquisition": {
    "type": "PURCHASED" | "INHERITED" | "GIFTED" | "TRADED" | "FOUND",
    "original_price": number | null,
    "original_currency": "USD" | "EUR" | "GBP" | etc | null,
    "date": "ISO 8601 date string" | null
  },
  "details": {
    "condition": "MINT" | "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | null,
    "year": number | null,
    "brand": "string" | null,
    "model": "string" | null
  },
  "confidence": number from 0.0 to 1.0
}

IMPORTANT PARSING RULES:
1. Default acquisition.type to "PURCHASED" if not clear
2. If "inherited", "from grandmother", "grandfather's", etc. → acquisition.type = "INHERITED"
3. If "gift", "given to me", "received as present" → acquisition.type = "GIFTED"
4. If "traded", "swapped", "exchanged" → acquisition.type = "TRADED"
5. If "found", "discovered" → acquisition.type = "FOUND"
6. Extract year from phrases like "1965 Fender", "from the 70s", "vintage 1980s"
7. Extract brand names (Fender, Gibson, Rolex, Apple, etc.)
8. Extract model names (Stratocaster, Submariner, MacBook Pro, etc.)
9. Extract prices from phrases like "bought for $12,000", "paid 5k", "$300"
10. Default currency to USD if price mentioned without currency
11. Set confidence lower if information is ambiguous or incomplete

Do NOT include any text before or after the JSON. Respond with ONLY the JSON object.`;
}

/**
 * Build the prompt for inventory item parsing
 */
function buildInventoryPrompt(itemText: string, currentDate: Date): string {
  const dateStr = currentDate.toISOString().split("T")[0];
  const dayOfWeek = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
  });

  return `Current date: ${dateStr} (${dayOfWeek})
Parse this inventory item description:
"${itemText}"`;
}

/**
 * Get the JSON schema for inventory item parsing
 */
function getInventorySchema(): object {
  return {
    type: "object",
    properties: {
      description: {
        type: "string",
        minLength: 1,
        description: "Cleaned item description for display",
      },
      acquisition: {
        type: ["object", "null"],
        properties: {
          type: {
            type: "string",
            enum: ["PURCHASED", "INHERITED", "GIFTED", "TRADED", "FOUND"],
            description: "How the item was acquired",
          },
          original_price: {
            type: ["number", "null"],
            description: "Original purchase price if known",
          },
          original_currency: {
            type: ["string", "null"],
            description: "Currency of the original price",
          },
          date: {
            type: ["string", "null"],
            description: "Acquisition date in ISO 8601 format",
          },
        },
        required: ["type"],
        additionalProperties: false,
      },
      details: {
        type: ["object", "null"],
        properties: {
          condition: {
            type: ["string", "null"],
            enum: ["MINT", "EXCELLENT", "GOOD", "FAIR", "POOR", null],
            description: "Item condition",
          },
          year: {
            type: ["integer", "null"],
            description: "Year of manufacture if known",
          },
          brand: {
            type: ["string", "null"],
            description: "Brand name",
          },
          model: {
            type: ["string", "null"],
            description: "Model name",
          },
        },
        additionalProperties: false,
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "Parsing confidence score",
      },
    },
    required: ["description", "confidence"],
    additionalProperties: false,
  };
}

/**
 * Parse a single inventory item description using LiteLLM
 */
export async function parseInventoryItem(
  itemText: string,
  currentDate: Date = new Date(),
): Promise<ParsedInventoryItem | InventoryParseError> {
  const apiBase = process.env.LITELLM_API_BASE || "http://localhost:4000";
  const apiKey = process.env.LITELLM_API_KEY;
  const model = process.env.LLM_MODEL || "openai/gpt-5-nano";

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const prompt = buildInventoryPrompt(itemText, currentDate);
    const schema = getInventorySchema();

    const response = await fetch(`${apiBase}/v1/responses`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: getInventoryParsingSystemPrompt(),
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
            name: "InventoryItemParser",
            schema,
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
    const parsedItem: ParsedInventoryItem = JSON.parse(textContent.text);

    return parsedItem;
  } catch (error) {
    console.error("Inventory Parser Error:", error);

    return {
      error: "Failed to parse inventory item",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Parse multiple inventory items in parallel
 */
export async function parseInventoryItems(
  items: string[],
  currentDate: Date = new Date(),
): Promise<{
  results: (ParsedInventoryItem | InventoryParseError)[];
  successCount: number;
  failureCount: number;
}> {
  const results = await Promise.all(
    items.map((item) => parseInventoryItem(item, currentDate)),
  );

  const successCount = results.filter((r) => !("error" in r)).length;
  const failureCount = results.filter((r) => "error" in r).length;

  return {
    results,
    successCount,
    failureCount,
  };
}

/**
 * Check if LLM service is available
 */
export async function checkLLMHealth(): Promise<{
  available: boolean;
  error?: string;
}> {
  const apiBase = process.env.LITELLM_API_BASE || "http://localhost:4000";
  const apiKey = process.env.LITELLM_API_KEY;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${apiBase}/health/liveness`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      return {
        available: false,
        error: `LLM health check failed: ${response.status}`,
      };
    }

    return { available: true };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
