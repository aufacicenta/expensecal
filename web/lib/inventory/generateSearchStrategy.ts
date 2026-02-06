/**
 * Search Strategy Generator
 * Uses LLM to generate optimal search queries and domain targets for item valuation
 */

import { routes } from "@/hooks/useRoutes/useRoutes";

export type SearchStrategy = {
  query: string;
  domains: string[];
  item_type: string;
  specifics_that_would_help: string[];
};

export type SearchStrategyError = {
  error: string;
  details?: string;
};

/**
 * System prompt for search strategy generation
 */
function getSearchStrategySystemPrompt(): string {
  return `You are an expert at finding market values for items.
Given an item description, generate the optimal search strategy.

Respond with JSON:
{
  "query": "the search query to find sold/market prices",
  "domains": ["domain1.com", "domain2.com"], // 3-5 most relevant marketplaces
  "item_type": "category for internal use",
  "specifics_that_would_help": ["list of details that would improve accuracy"]
}

Guidelines:
- Include "sold price" or "market value" in query for pricing data
- Include year/era if mentioned in description
- Choose domains dynamically based on item type:
  - Musical instruments: reverb.com, ebay.com, guitarcenter.com
  - Watches: chrono24.com, bobswatches.com, watchbox.com
  - Electronics: ebay.com, swappa.com, backmarket.com
  - Art/Antiques: 1stdibs.com, christies.com, sothebys.com
  - Vehicles: kbb.com, bringatrailer.com, cargurus.com, hagerty.com
  - Furniture: 1stdibs.com, chairish.com, ebay.com
  - Fashion/Luxury: therealreal.com, vestiairecollective.com, ebay.com
  - General/Unknown: ebay.com, google.com
- Be specific but not overly narrow
- Add current year for recency (e.g., "2025 2026")

Do NOT include any text before or after the JSON. Respond with ONLY the JSON object.`;
}

/**
 * Get JSON schema for search strategy
 */
function getSearchStrategySchema(): object {
  return {
    type: "object",
    properties: {
      query: {
        type: "string",
        minLength: 1,
        description: "Search query to find market prices",
      },
      domains: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 5,
        description: "Relevant marketplace domains",
      },
      item_type: {
        type: "string",
        description: "Item category for internal use",
      },
      specifics_that_would_help: {
        type: "array",
        items: { type: "string" },
        description: "Details that would improve valuation accuracy",
      },
    },
    required: ["query", "domains", "item_type", "specifics_that_would_help"],
    additionalProperties: false,
  };
}

/**
 * Generate search strategy for an item
 */
export async function generateSearchStrategy(
  itemDescription: string,
  itemDetails?: {
    brand?: string;
    model?: string;
    year?: number;
    condition?: string;
  },
): Promise<SearchStrategy | SearchStrategyError> {
  const apiBase = process.env.LITELLM_API_BASE || "http://localhost:4000";
  const apiKey = process.env.LITELLM_API_KEY;
  const model = process.env.LLM_MODEL || "openai/gpt-5-nano";

  // Build context from item details
  let contextParts = [itemDescription];

  if (itemDetails) {
    if (itemDetails.brand) contextParts.push(`Brand: ${itemDetails.brand}`);
    if (itemDetails.model) contextParts.push(`Model: ${itemDetails.model}`);
    if (itemDetails.year) contextParts.push(`Year: ${itemDetails.year}`);
    if (itemDetails.condition)
      contextParts.push(`Condition: ${itemDetails.condition}`);
  }

  const fullContext = contextParts.join("\n");

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const currentYear = new Date().getFullYear();

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
              content: getSearchStrategySystemPrompt(),
              type: "message",
            },
            {
              role: "user",
              content: `Current year: ${currentYear}

Generate a search strategy to find the market value of this item:
${fullContext}`,
              type: "message",
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "SearchStrategy",
              schema: getSearchStrategySchema(),
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

    const strategy: SearchStrategy = JSON.parse(textContent.text);

    return strategy;
  } catch (error) {
    console.error("Search strategy generation error:", error);

    return {
      error: "Failed to generate search strategy",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

export default generateSearchStrategy;
