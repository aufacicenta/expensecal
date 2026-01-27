/**
 * LLM Parser Service using LiteLLM
 * Alternative to Ollama for unified LLM access
 */

import Event, { EventAttributes } from "@expensecal/database/models/Event";

import { buildFilePrompt, buildPrompt } from "./buildPrompt";
import { getFileParsingSystemPrompt, getSystemPrompt } from "./systemPrompt";

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

export interface ParsedFileResult {
  events: ParsedExpenseEvent[];
  parse_notes?: string;
}

export interface ParseError {
  error: string;
  details?: string;
}

export class LiteLLMParser {
  private apiBase: string;
  private model: string;
  private imageModel: string;
  private apiKey?: string;
  private schema: any;

  constructor(
    model: string = process.env.LLM_MODEL || "openai/gpt-5-nano",
    apiBase?: string,
    apiKey?: string,
    imageModel?: string,
  ) {
    this.model = model;
    // Use dedicated image model for vision tasks, defaulting to Gemini 2.5 Flash
    // which offers excellent vision capabilities at a good price point
    this.imageModel =
      imageModel ||
      process.env.LLM_IMAGE_MODEL ||
      "openrouter/google/gemini-2.5-flash";
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
    imageModel: string;
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
          imageModel: this.imageModel,
          error: `LiteLLM health check failed: ${response.status}`,
        };
      }

      return {
        available: true,
        model: this.model,
        imageModel: this.imageModel,
      };
    } catch (error) {
      return {
        available: false,
        model: this.model,
        imageModel: this.imageModel,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Parse a file and extract multiple expense/income events
   * The LLM intelligently determines the file format and extracts all transactions
   * For PDFs and images, uses /v1/chat/completions with multimodal content types
   * (The /v1/responses API doesn't properly support multimodal content across providers)
   */
  async parseFile(
    fileContent: string,
    fileName: string,
    fileType: string,
    currentDate?: Date,
  ): Promise<ParsedFileResult | ParseError> {
    try {
      const referenceDate = currentDate || new Date();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      // Determine file category for appropriate handling
      const isImage = fileType.startsWith("image/");
      const isPdf = fileType === "application/pdf";
      const isExcel =
        fileType ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        fileType === "application/vnd.ms-excel";
      const isBinaryFile = isImage || isPdf || isExcel;

      // Schema for batch file parsing
      const fileSchema = {
        type: "object",
        properties: {
          events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["EXPENSE", "INCOME"],
                  description: "Event type",
                },
                amount: {
                  type: "string",
                  pattern: "^\\d+(\\.\\d{1,8})?$",
                  description: "Amount as decimal string",
                },
                currency: {
                  type: "string",
                  description: "Currency symbol (USD, EUR, etc.)",
                },
                quantity: {
                  type: "integer",
                  minimum: 1,
                  description: "Number of units",
                },
                description: {
                  type: "string",
                  minLength: 1,
                  description: "Event description",
                },
                event_date: {
                  type: "string",
                  format: "date-time",
                  description: "Event date in ISO 8601 format",
                },
                recurrence_rule: {
                  type: ["string", "null"],
                  description: "RFC 5545 RRULE format (optional)",
                },
                recurrence_end_date: {
                  type: ["string", "null"],
                  format: "date-time",
                  description: "Recurrence end date (optional)",
                },
                split_installments: {
                  type: "boolean",
                  description: "Whether to split amount across installments",
                },
                confidence: {
                  type: "number",
                  minimum: 0,
                  maximum: 1,
                  description: "Parsing confidence score",
                },
                raw_text: {
                  type: "string",
                  description: "Original text/row this was extracted from",
                },
              },
              required: [
                "type",
                "amount",
                "currency",
                "quantity",
                "description",
                "event_date",
                "confidence",
                "raw_text",
              ],
              additionalProperties: false,
            },
            description: "Array of parsed expense/income events",
          },
          parse_notes: {
            type: ["string", "null"],
            description: "Optional notes about parsing decisions",
          },
        },
        required: ["events"],
        additionalProperties: false,
      };

      // Use imageModel for binary files (vision-capable), regular model for text
      const modelToUse = isBinaryFile ? this.imageModel : this.model;

      // For binary files, use /v1/chat/completions which has proper multimodal support
      // The /v1/responses API doesn't properly handle images across all providers
      if (isBinaryFile) {
        return this.parseFileWithChatCompletions(
          fileContent,
          fileName,
          fileType,
          referenceDate,
          headers,
          modelToUse,
          fileSchema,
          isImage,
          isPdf,
        );
      }

      // For text files, continue using /v1/responses API
      const prompt = buildFilePrompt(fileContent, fileName, referenceDate);

      const response = await fetch(`${this.apiBase}/v1/responses`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: modelToUse,
          input: [
            {
              role: "system",
              content: getFileParsingSystemPrompt(),
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
              name: "FileParser",
              schema: fileSchema,
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
      const result: ParsedFileResult = JSON.parse(textContent.text);

      return result;
    } catch (error) {
      console.error("LiteLLM File Parser Error:", error);

      return {
        error: "Failed to parse file content",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Parse binary files using /v1/chat/completions API
   * This endpoint has proper multimodal support across all providers
   */
  private async parseFileWithChatCompletions(
    fileContent: string,
    fileName: string,
    fileType: string,
    referenceDate: Date,
    headers: Record<string, string>,
    modelToUse: string,
    fileSchema: any,
    isImage: boolean,
    isPdf: boolean,
  ): Promise<ParsedFileResult | ParseError> {
    const dateStr = referenceDate.toISOString().split("T")[0];
    const dayOfWeek = referenceDate.toLocaleDateString("en-US", {
      weekday: "long",
    });

    const textPrompt = `Current date: ${dateStr} (${dayOfWeek})\nFile name: ${fileName}\n\nExtract ALL expense/income transactions from this document. Return a JSON object with an "events" array containing each transaction.`;

    // Build user content based on file type
    let userContent: any[];

    if (isImage) {
      // Use image_url content type for images (OpenAI-compatible format)
      // Supported formats: image/png, image/jpeg, image/webp, image/gif
      userContent = [
        {
          type: "text",
          text: textPrompt,
        },
        {
          type: "image_url",
          image_url: {
            url: `data:${fileType};base64,${fileContent}`,
          },
        },
      ];
    } else if (isPdf) {
      // Use file content type for PDFs (LiteLLM/OpenRouter format)
      // See: https://docs.litellm.ai/docs/completion/document_understanding
      userContent = [
        {
          type: "text",
          text: textPrompt,
        },
        {
          type: "file",
          file: {
            file_data: `data:application/pdf;base64,${fileContent}`,
          },
        },
      ];
    } else {
      // Excel and other binary files - use file content type
      userContent = [
        {
          type: "text",
          text: textPrompt,
        },
        {
          type: "file",
          file: {
            file_data: `data:${fileType};base64,${fileContent}`,
          },
        },
      ];
    }

    const response = await fetch(`${this.apiBase}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          {
            role: "system",
            content: getFileParsingSystemPrompt(),
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "FileParser",
            schema: fileSchema,
            strict: true,
          },
        },
        temperature: 0,
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

    // Extract content from chat completions response format
    const choice = data.choices?.[0];

    if (!choice) {
      return {
        error: "No choices in response",
        details: JSON.stringify(data),
      };
    }

    const content = choice.message?.content;

    if (!content) {
      return {
        error: "No content in message",
        details: JSON.stringify(choice),
      };
    }

    // Parse the JSON response
    // Strip markdown code fences if present (e.g., ```json ... ```)
    let jsonContent = content.trim();

    if (jsonContent.startsWith("```")) {
      // Remove opening fence (```json or ```)
      jsonContent = jsonContent.replace(/^```(?:json)?\s*\n?/, "");
      // Remove closing fence
      jsonContent = jsonContent.replace(/\n?```\s*$/, "");
    }

    const result: ParsedFileResult = JSON.parse(jsonContent);

    return result;
  }

  /**
   * Get the JSON schema being used for parsing
   */
  getSchema() {
    return this.schema;
  }

  /**
   * Get the current model configuration
   */
  getModels() {
    return {
      text: this.model,
      image: this.imageModel,
    };
  }

  /**
   * Set the image model for vision tasks
   */
  setImageModel(model: string) {
    this.imageModel = model;
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
