/**
 * Price Extraction from Search Results
 * Uses LLM to extract price information from Tavily search results
 */

import { InventoryValuationConfidence } from "@expensecal/database/models/Event";

import { TavilySearchResult } from "./tavilyClient";

import { routes } from "@/hooks/useRoutes/useRoutes";

export type ExtractedPrice = {
  price: number;
  currency: string;
  source: string;
  context: "sold listing" | "asking price" | "estimate";
};

export type PriceExtractionResult = {
  prices_found: ExtractedPrice[];
  estimated_low: number;
  estimated_high: number;
  currency: string;
  confidence: InventoryValuationConfidence;
  data_points: number;
  reasoning: string;
};

export type PriceExtractionError = {
  error: string;
  details?: string;
};

/**
 * System prompt for price extraction
 */
function getPriceExtractionSystemPrompt(): string {
  return `You are a price extraction specialist. Given search results about an item, extract all price mentions and calculate a value range.

Respond with JSON:
{
  "prices_found": [
    { "price": number, "currency": "USD", "source": "url", "context": "sold listing" | "asking price" | "estimate" }
  ],
  "estimated_low": number,
  "estimated_high": number,
  "currency": "USD",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "data_points": number,
  "reasoning": "brief explanation"
}

Guidelines:
- Prefer "sold" prices over "asking" prices
- Filter obvious outliers (condition issues, rare variants)
- Use P25-P75 range for estimate (25th to 75th percentile)
- HIGH confidence: 5+ recent sold prices
- MEDIUM confidence: 2-4 data points
- LOW confidence: 1 data point or estimates only
- Default to USD if currency unclear
- If no prices found, set estimated_low and estimated_high to 0

Do NOT include any text before or after the JSON. Respond with ONLY the JSON object.`;
}

/**
 * Get JSON schema for price extraction
 */
function getPriceExtractionSchema(): object {
  return {
    type: "object",
    properties: {
      prices_found: {
        type: "array",
        items: {
          type: "object",
          properties: {
            price: { type: "number" },
            currency: { type: "string" },
            source: { type: "string" },
            context: {
              type: "string",
              enum: ["sold listing", "asking price", "estimate"],
            },
          },
          required: ["price", "currency", "source", "context"],
          additionalProperties: false,
        },
        description: "Individual prices found in search results",
      },
      estimated_low: {
        type: "number",
        description: "Low end of estimated value range",
      },
      estimated_high: {
        type: "number",
        description: "High end of estimated value range",
      },
      currency: {
        type: "string",
        description: "Currency for the estimates",
      },
      confidence: {
        type: "string",
        enum: ["HIGH", "MEDIUM", "LOW"],
        description: "Confidence level based on data quality",
      },
      data_points: {
        type: "integer",
        description: "Number of price data points used",
      },
      reasoning: {
        type: "string",
        description: "Brief explanation of the valuation",
      },
    },
    required: [
      "prices_found",
      "estimated_low",
      "estimated_high",
      "currency",
      "confidence",
      "data_points",
      "reasoning",
    ],
    additionalProperties: false,
  };
}

/**
 * Extract prices from search results
 */
export async function extractPricesFromResults(
  itemDescription: string,
  searchQuery: string,
  searchResults: TavilySearchResult[],
): Promise<PriceExtractionResult | PriceExtractionError> {
  const apiBase = process.env.LITELLM_API_BASE || "http://localhost:4000";
  const apiKey = process.env.LITELLM_API_KEY;
  const model = process.env.LLM_MODEL || "openai/gpt-5-nano";

  // Format search results for the LLM
  const formattedResults = searchResults
    .map((result, index) => {
      return `[${index + 1}] ${result.title}
URL: ${result.url}
${result.content}`;
    })
    .join("\n\n");

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(
      `${apiBase}${routes.external.llm.responses()}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          input: [
            {
              role: "system",
              content: getPriceExtractionSystemPrompt(),
              type: "message",
            },
            {
              role: "user",
              content: `Item: ${itemDescription}
Search query used: ${searchQuery}

Search Results:
${formattedResults}

Extract prices and calculate the estimated market value range.`,
              type: "message",
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "PriceExtraction",
              schema: getPriceExtractionSchema(),
              strict: true,
            },
          },
          stream: false,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();

      return {
        error: "LLM API error",
        details: `Status ${response.status}: ${error}`,
      };
    }

    const data = await response.json();

    // Extract the message type output
    const messageOutput = data.output?.find(
      (item: any) => item.type === "message",
    );

    if (!messageOutput) {
      return {
        error: "No message output from LLM",
        details: JSON.stringify(data),
      };
    }

    // Extract text content
    const textContent = messageOutput.content?.find(
      (item: any) => item.type === "output_text",
    );

    if (!textContent?.text) {
      return {
        error: "No text content in message output",
        details: JSON.stringify(messageOutput),
      };
    }

    const extraction: PriceExtractionResult = JSON.parse(textContent.text);

    return extraction;
  } catch (error) {
    console.error("Price extraction error:", error);

    return {
      error: "Failed to extract prices",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

export default extractPricesFromResults;
