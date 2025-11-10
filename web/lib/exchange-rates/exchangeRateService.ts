import { Decimal } from "decimal.js";

/**
 * Interface for ExchangeRate API response
 * https://www.exchangerate-api.com/docs/free
 */
interface ExchangeRateAPIResponse {
  result: "success" | "error";
  documentation?: string;
  terms_of_use?: string;
  time_last_updated_unix?: number;
  time_last_updated_utc?: string;
  time_next_update_unix?: number;
  time_next_update_utc?: string;
  base_code?: string;
  conversion_rates?: Record<string, number>;
  error_type?: string;
}

/**
 * Rate data returned from fetchExchangeRates
 */
export interface ExchangeRateData {
  fromSymbol: string;
  toSymbol: string;
  rate: string; // Decimal as string for precision
  snapshotDate: Date;
  fetchedAt: Date;
}

/**
 * Fetch exchange rates from exchangerate-api.com for all currency pairs
 * Uses USD as the base currency (hub-and-spoke model)
 *
 * @param apiKey ExchangeRate API key from environment
 * @param currencies Array of currency symbols to fetch rates for
 * @param baseSymbol Base currency symbol (default: USD)
 * @returns Array of exchange rate data for each currency
 */
export async function fetchExchangeRates(
  apiKey: string,
  currencies: string[],
  baseSymbol: string = "USD",
): Promise<ExchangeRateData[]> {
  if (!apiKey) {
    throw new Error("EXCHANGERATE_API_KEY environment variable is not set");
  }

  if (currencies.length === 0) {
    return [];
  }

  const rates: ExchangeRateData[] = [];
  const now = new Date();
  const snapshotDate = new Date(now);
  snapshotDate.setHours(0, 0, 0, 0); // Midnight UTC

  // Fetch rates from exchangerate-api.com
  // API format: https://v6.exchangerate-api.com/v6/{api_key}/latest/{base_code}
  const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseSymbol}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`ExchangeRate API returned status ${response.status}`);
    }

    const data: ExchangeRateAPIResponse = await response.json();

    if (data.result !== "success") {
      throw new Error(
        `ExchangeRate API error: ${data.error_type || "unknown error"}`,
      );
    }

    if (!data.conversion_rates) {
      throw new Error("ExchangeRate API response missing conversion_rates");
    }

    // Extract rates for requested currencies
    for (const currency of currencies) {
      if (currency === baseSymbol) {
        // Rate from base to itself is always 1
        rates.push({
          fromSymbol: baseSymbol,
          toSymbol: currency,
          rate: "1",
          snapshotDate,
          fetchedAt: now,
        });
      } else if (currency in data.conversion_rates) {
        const rate = data.conversion_rates[currency];
        rates.push({
          fromSymbol: baseSymbol,
          toSymbol: currency,
          rate: new Decimal(rate).toString(), // Use Decimal for precision
          snapshotDate,
          fetchedAt: now,
        });
      } else {
        console.warn(
          `Currency ${currency} not found in ExchangeRate API response`,
        );
      }
    }

    return rates;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch exchange rates: ${errorMessage}`);
  }
}

/**
 * Convert an amount from one currency to another using provided rates
 * Assumes hub-and-spoke model where all rates are relative to a base currency (USD)
 *
 * @param amount Amount to convert
 * @param fromRate Rate from USD to source currency
 * @param toRate Rate from USD to target currency
 * @returns Converted amount as Decimal string
 */
export function convertCurrency(
  amount: string,
  fromRate: string,
  toRate: string,
): string {
  const decimal = new Decimal(amount);
  const from = new Decimal(fromRate);
  const to = new Decimal(toRate);

  // Convert: amount in source currency -> USD -> target currency
  // Step 1: amount / fromRate = amount in USD
  // Step 2: (amount in USD) * toRate = amount in target currency
  // Combined: (amount / fromRate) * toRate
  const converted = decimal.dividedBy(from).times(to);

  return converted.toString();
}

/**
 * Get the rate for a specific currency pair assuming hub-and-spoke model
 *
 * @param amount Amount to convert
 * @param fromSymbol Source currency symbol
 * @param toSymbol Target currency symbol
 * @param rates Map of symbol -> rate (rate from base currency to this currency)
 * @returns Converted amount as Decimal string
 */
export function convertCurrencyBySymbol(
  amount: string,
  fromSymbol: string,
  toSymbol: string,
  rates: Map<string, string>,
): string {
  if (fromSymbol === toSymbol) {
    return amount;
  }

  const fromRate = rates.get(fromSymbol) || "1"; // Default to 1 if not found (assume USD)
  const toRate = rates.get(toSymbol) || "1";

  return convertCurrency(amount, fromRate, toRate);
}
