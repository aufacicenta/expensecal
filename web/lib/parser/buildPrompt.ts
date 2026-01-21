/**
 * Unified prompt builder for all LLM parsers
 * Ensures consistent parsing behavior across different LLM backends
 */

export function buildPrompt(text: string, referenceDate: Date): string {
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
