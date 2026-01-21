import { Decimal } from "decimal.js";

import { ExchangeRateData } from "./exchangeRateService";

/**
 * CoinGecko API response for simple/price endpoint
 * https://docs.coingecko.com/v3.0.1/reference/simple-price
 */
interface CoinGeckoSimplePriceResponse {
  [coinId: string]: {
    usd: number;
    usd_24h_change?: number;
    last_updated_at?: number;
  };
}

/**
 * Mapping from common crypto symbols to CoinGecko coin IDs
 * CoinGecko uses unique IDs rather than ticker symbols
 */
export const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  USDC: "usd-coin",
  BNB: "binancecoin",
  XRP: "ripple",
  SOL: "solana",
  ADA: "cardano",
  DOGE: "dogecoin",
  DOT: "polkadot",
  MATIC: "matic-network",
  LTC: "litecoin",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  ATOM: "cosmos",
  UNI: "uniswap",
  SHIB: "shiba-inu",
  TRX: "tron",
  XLM: "stellar",
  NEAR: "near",
};

/**
 * Reverse mapping from CoinGecko ID to symbol
 */
const COINGECKO_ID_TO_SYMBOL: Record<string, string> = Object.fromEntries(
  Object.entries(SYMBOL_TO_COINGECKO_ID).map(([symbol, id]) => [id, symbol]),
);

/**
 * Fetch cryptocurrency rates from CoinGecko API
 *
 * @param symbols Array of crypto symbols to fetch rates for (e.g., ['BTC', 'ETH'])
 * @param baseCurrency Base currency to get rates in (default: 'usd')
 * @param apiKey Optional CoinGecko API key for higher rate limits
 * @returns Array of exchange rate data for each cryptocurrency
 */
export async function fetchCryptoRates(
  symbols: string[],
  baseCurrency: string = "usd",
  apiKey?: string,
): Promise<ExchangeRateData[]> {
  if (symbols.length === 0) {
    return [];
  }

  // Filter symbols to only those we have CoinGecko IDs for
  const validSymbols = symbols.filter((s) => SYMBOL_TO_COINGECKO_ID[s]);
  const unknownSymbols = symbols.filter((s) => !SYMBOL_TO_COINGECKO_ID[s]);

  if (unknownSymbols.length > 0) {
    console.warn(
      `Unknown crypto symbols (no CoinGecko mapping): ${unknownSymbols.join(", ")}`,
    );
  }

  if (validSymbols.length === 0) {
    return [];
  }

  // Convert symbols to CoinGecko IDs
  const coinIds = validSymbols.map((s) => SYMBOL_TO_COINGECKO_ID[s]);

  const rates: ExchangeRateData[] = [];
  const now = new Date();
  const snapshotDate = new Date(now);

  snapshotDate.setHours(0, 0, 0, 0); // Midnight UTC

  // Build CoinGecko API URL
  // Free API: https://api.coingecko.com/api/v3/simple/price
  // Pro API: https://pro-api.coingecko.com/api/v3/simple/price
  const baseUrl = apiKey
    ? "https://pro-api.coingecko.com/api/v3/simple/price"
    : "https://api.coingecko.com/api/v3/simple/price";

  const params = new URLSearchParams({
    ids: coinIds.join(","),
    vs_currencies: baseCurrency.toLowerCase(),
    include_last_updated_at: "true",
  });

  const url = `${baseUrl}?${params.toString()}`;

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (apiKey) {
      headers["x-cg-pro-api-key"] = apiKey;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      // Handle rate limiting
      if (response.status === 429) {
        throw new Error("CoinGecko API rate limit exceeded. Try again later.");
      }

      throw new Error(`CoinGecko API returned status ${response.status}`);
    }

    const data: CoinGeckoSimplePriceResponse = await response.json();

    // Extract rates for each coin
    for (const coinId of coinIds) {
      const symbol = COINGECKO_ID_TO_SYMBOL[coinId];
      const coinData = data[coinId];

      if (!coinData) {
        console.warn(`No data returned for ${symbol} (${coinId})`);
        continue;
      }

      const priceKey = baseCurrency.toLowerCase() as keyof typeof coinData;
      const price = coinData[priceKey];

      if (typeof price !== "number") {
        console.warn(`No ${baseCurrency} price for ${symbol}`);
        continue;
      }

      // CoinGecko returns price in USD (e.g., BTC = 42000 USD)
      // We need to convert to our hub-and-spoke model where rate is USD -> CRYPTO
      // So rate = 1 / price (how much crypto you get for 1 USD)
      // Actually, we store rate as "from_currency -> to_currency"
      // If from = USD and to = BTC, rate = 1/42000 = 0.0000238
      // But that's very small. Let's store it the same way as fiat:
      // from = USD, to = BTC, rate = price (42000)
      // This means: 1 USD = 42000 "units" but that doesn't make sense for BTC
      //
      // Actually looking at the existing implementation:
      // For fiat: USD -> MXN rate = 17.5 means 1 USD = 17.5 MXN
      // For crypto: USD -> BTC, if BTC = $42000, then 1 USD = 1/42000 BTC
      // So we should store 1/price for crypto
      //
      // Let's follow the same convention: rate = how much of target currency per 1 base currency
      const rate = new Decimal(1).dividedBy(new Decimal(price));

      rates.push({
        fromSymbol: baseCurrency.toUpperCase(),
        toSymbol: symbol,
        rate: rate.toString(),
        snapshotDate,
        fetchedAt: now,
      });
    }

    return rates;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    throw new Error(
      `Failed to fetch crypto rates from CoinGecko: ${errorMessage}`,
    );
  }
}

/**
 * Get the CoinGecko ID for a given crypto symbol
 *
 * @param symbol Crypto symbol (e.g., 'BTC')
 * @returns CoinGecko ID or undefined if not found
 */
export function getCoinGeckoId(symbol: string): string | undefined {
  return SYMBOL_TO_COINGECKO_ID[symbol];
}

/**
 * Check if a symbol is a known cryptocurrency
 *
 * @param symbol Currency symbol to check
 * @returns true if the symbol is a known cryptocurrency
 */
export function isKnownCrypto(symbol: string): boolean {
  return symbol in SYMBOL_TO_COINGECKO_ID;
}
