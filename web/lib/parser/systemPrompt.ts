/**
 * Unified system prompt for all LLM parsers
 * Ensures consistent parsing behavior and output structure across different LLM backends
 */

export function getSystemPrompt(): string {
  return `You are an expense parser. Extract structured data from natural language expense descriptions and respond ONLY with valid JSON matching this exact structure:
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

Do NOT include any text before or after the JSON. Respond with ONLY the JSON object.`;
}

/**
 * System prompt for batch file parsing
 * Extracts multiple expense/income events from file content (CSV, text, bank statements, etc.)
 */
export function getFileParsingSystemPrompt(): string {
  return `You are an expense file parser. Extract ALL expense and income events from the provided file content.

The file may be in any format: plain text with one item per line, CSV, bank statement, JSON, PDF, or any other format. Intelligently parse the content and extract every financial transaction you can identify.

Respond ONLY with valid JSON matching this exact structure:
{
  "events": [
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
      "confidence": number from 0.0 to 1.0,
      "raw_text": "original text/row this was extracted from"
    }
  ],
  "parse_notes": "optional notes about parsing decisions or ambiguities"
}

IMPORTANT RULES:
1. Extract EVERY transaction/event from the file
2. For CSV files, use column headers to understand the data structure
3. For bank statements, identify debits as EXPENSE and credits as INCOME
4. If dates are ambiguous, use the reference date provided
5. If currency is not specified, default to USD
6. Set confidence lower for ambiguous entries
7. Always include the raw_text showing what original content was parsed

Do NOT include any text before or after the JSON. Respond with ONLY the JSON object.`;
}
