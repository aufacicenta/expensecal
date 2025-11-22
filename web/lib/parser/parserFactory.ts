/**
 * Parser factory that returns the appropriate LLM parser based on environment
 */

import { LiteLLMParser, getLiteLLMParser } from "./litellmParser";
import {
  LocalLMStudioParser,
  getLocalLMStudioParser,
} from "./localLMStudioParser";

export type ParserInstance = LocalLMStudioParser | LiteLLMParser;

/**
 * Get the appropriate parser instance based on environment
 * - Production/Staging: Uses LiteLLM (remote LLM service)
 * - Development: Uses Local LM Studio (local model running on port 1234)
 */
export function getParserInstance(): ParserInstance {
  const env = process.env.NEXT_PUBLIC_ENV;

  if (env === "production" || env === "staging") {
    return getLiteLLMParser();
  }

  // Default to local LM Studio for development
  return getLocalLMStudioParser();
}
