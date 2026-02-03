/**
 * Tavily API Client
 * Web search API optimized for AI agents
 * https://tavily.com/
 */

export type TavilySearchDepth = "basic" | "advanced";

export type TavilySearchResult = {
  title: string;
  url: string;
  content: string;
  score: number;
  raw_content?: string;
};

export type TavilySearchResponse = {
  query: string;
  follow_up_questions?: string[];
  answer?: string;
  images?: string[];
  results: TavilySearchResult[];
  response_time: number;
};

export type TavilySearchOptions = {
  query: string;
  search_depth?: TavilySearchDepth;
  include_domains?: string[];
  exclude_domains?: string[];
  max_results?: number;
  include_answer?: boolean;
  include_raw_content?: boolean;
  include_images?: boolean;
};

export type TavilySearchError = {
  error: string;
  details?: string;
};

/**
 * Tavily client singleton
 */
class TavilyClient {
  private apiKey: string | undefined;
  private baseUrl = "https://api.tavily.com";

  constructor() {
    this.apiKey = process.env.TAVILY_API_KEY;
  }

  /**
   * Check if Tavily API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Perform a web search using Tavily API
   */
  async search(
    options: TavilySearchOptions,
  ): Promise<TavilySearchResponse | TavilySearchError> {
    if (!this.apiKey) {
      return {
        error: "Tavily API key not configured",
        details: "Set TAVILY_API_KEY environment variable",
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          query: options.query,
          search_depth: options.search_depth || "advanced",
          include_domains: options.include_domains,
          exclude_domains: options.exclude_domains,
          max_results: options.max_results || 15,
          include_answer: options.include_answer ?? false,
          include_raw_content: options.include_raw_content ?? false,
          include_images: options.include_images ?? false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        return {
          error: `Tavily API error: ${response.status}`,
          details: errorText,
        };
      }

      const data: TavilySearchResponse = await response.json();

      return data;
    } catch (error) {
      console.error("Tavily search error:", error);

      return {
        error: "Tavily search failed",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check if Tavily API is accessible
   */
  async healthCheck(): Promise<{ available: boolean; error?: string }> {
    if (!this.apiKey) {
      return {
        available: false,
        error: "TAVILY_API_KEY not configured",
      };
    }

    // Tavily doesn't have a health endpoint, so we do a minimal search
    try {
      const result = await this.search({
        query: "test",
        search_depth: "basic",
        max_results: 1,
      });

      if ("error" in result) {
        return { available: false, error: result.error };
      }

      return { available: true };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Export singleton instance
export const tavilyClient = new TavilyClient();

// Re-export for direct usage
export default tavilyClient;
