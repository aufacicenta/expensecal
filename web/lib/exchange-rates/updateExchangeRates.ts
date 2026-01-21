import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Currency, CurrencyType } from "@expensecal/database/models/Currency";
import {
  ExchangeRate,
  ExchangeRateSource,
} from "@expensecal/database/models/ExchangeRate";

import { fetchCryptoRates } from "./cryptoRateService";
import { fetchExchangeRates } from "./exchangeRateService";

/**
 * Update exchange rates in the database
 * Called daily at 00:00:00 UTC
 *
 * This function:
 * 1. Fetches all active currencies (both FIAT and CRYPTO)
 * 2. Calls exchangerate-api.com for FIAT rates
 * 3. Calls CoinGecko for CRYPTO rates
 * 4. Stores rates in the exchange_rates table
 * 5. Marks previous rates as not latest
 * 6. Returns summary of operation
 */
export async function updateExchangeRates(): Promise<{
  success: boolean;
  message: string;
  ratesUpdated: number;
  fiatRatesUpdated: number;
  cryptoRatesUpdated: number;
  error?: string;
}> {
  try {
    // Initialize database
    initModels(db);

    const fiatApiKey = process.env.EXCHANGERATE_API_KEY;
    const cryptoApiKey = process.env.COINGECKO_API_KEY; // Optional, for higher rate limits

    if (!fiatApiKey) {
      return {
        success: false,
        message: "EXCHANGERATE_API_KEY environment variable not set",
        ratesUpdated: 0,
        fiatRatesUpdated: 0,
        cryptoRatesUpdated: 0,
        error: "Missing FIAT API key",
      };
    }

    // Get all active currencies with their type
    const currencies = await Currency.findAll({
      attributes: ["id", "symbol", "currency_type"],
      order: [["symbol", "ASC"]],
    });

    if (currencies.length === 0) {
      return {
        success: false,
        message: "No currencies found in database",
        ratesUpdated: 0,
        fiatRatesUpdated: 0,
        cryptoRatesUpdated: 0,
        error: "No currencies",
      };
    }

    // Separate currencies by type
    const fiatCurrencies = currencies.filter(
      (c) => c.currency_type === CurrencyType.FIAT,
    );
    const cryptoCurrencies = currencies.filter(
      (c) => c.currency_type === CurrencyType.CRYPTO,
    );

    const fiatSymbols = fiatCurrencies.map((c) => c.symbol);
    const cryptoSymbols = cryptoCurrencies.map((c) => c.symbol);
    const baseSymbol = "USD";

    // Create a map of symbol -> id for quick lookup
    const currencyMap = new Map(currencies.map((c) => [c.symbol, c.id]));

    const now = new Date();
    const snapshotDate = new Date(now);

    snapshotDate.setHours(0, 0, 0, 0);

    // Fetch rates from both APIs in parallel
    const [fiatRatesData, cryptoRatesData] = await Promise.all([
      // Fetch FIAT rates
      fiatSymbols.length > 0
        ? fetchExchangeRates(fiatApiKey, fiatSymbols, baseSymbol)
        : Promise.resolve([]),
      // Fetch CRYPTO rates
      cryptoSymbols.length > 0
        ? fetchCryptoRates(cryptoSymbols, baseSymbol, cryptoApiKey).catch(
            (err) => {
              console.error("Error fetching crypto rates:", err);

              return []; // Don't fail entire operation if crypto fails
            },
          )
        : Promise.resolve([]),
    ]);

    const allRatesData = [...fiatRatesData, ...cryptoRatesData];

    if (allRatesData.length === 0) {
      return {
        success: false,
        message: "No rates returned from any API",
        ratesUpdated: 0,
        fiatRatesUpdated: 0,
        cryptoRatesUpdated: 0,
        error: "APIs returned no rates",
      };
    }

    // Start transaction
    const transaction = await db.transaction();

    try {
      // Mark all existing latest rates as not latest
      await ExchangeRate.update(
        { is_latest: false },
        {
          where: {
            is_latest: true,
            from_currency_id: currencyMap.get(baseSymbol),
          },
          transaction,
        },
      );

      // Insert new rates
      const ratesToInsert = [];
      let fiatCount = 0;
      let cryptoCount = 0;

      // Process FIAT rates
      for (const rateData of fiatRatesData) {
        const fromCurrencyId = currencyMap.get(rateData.fromSymbol);
        const toCurrencyId = currencyMap.get(rateData.toSymbol);

        if (!fromCurrencyId || !toCurrencyId) {
          console.warn(
            `Skipping FIAT rate: Currency mapping not found for ${rateData.fromSymbol} -> ${rateData.toSymbol}`,
          );
          continue;
        }

        ratesToInsert.push({
          from_currency_id: fromCurrencyId,
          to_currency_id: toCurrencyId,
          rate: rateData.rate,
          snapshot_date: rateData.snapshotDate,
          fetched_at: rateData.fetchedAt,
          source: ExchangeRateSource.EXCHANGERATE_API,
          is_latest: true,
          created_at: now,
          updated_at: now,
        });
        fiatCount++;
      }

      // Process CRYPTO rates
      for (const rateData of cryptoRatesData) {
        const fromCurrencyId = currencyMap.get(rateData.fromSymbol);
        const toCurrencyId = currencyMap.get(rateData.toSymbol);

        if (!fromCurrencyId || !toCurrencyId) {
          console.warn(
            `Skipping CRYPTO rate: Currency mapping not found for ${rateData.fromSymbol} -> ${rateData.toSymbol}`,
          );
          continue;
        }

        ratesToInsert.push({
          from_currency_id: fromCurrencyId,
          to_currency_id: toCurrencyId,
          rate: rateData.rate,
          snapshot_date: rateData.snapshotDate,
          fetched_at: rateData.fetchedAt,
          source: ExchangeRateSource.COINGECKO,
          is_latest: true,
          created_at: now,
          updated_at: now,
        });
        cryptoCount++;
      }

      // Bulk create rates
      if (ratesToInsert.length > 0) {
        await ExchangeRate.bulkCreate(ratesToInsert, { transaction });
      }

      // Commit transaction
      await transaction.commit();

      return {
        success: true,
        message: `Successfully updated ${ratesToInsert.length} exchange rates (${fiatCount} FIAT, ${cryptoCount} CRYPTO) for ${snapshotDate.toISOString().split("T")[0]}`,
        ratesUpdated: ratesToInsert.length,
        fiatRatesUpdated: fiatCount,
        cryptoRatesUpdated: cryptoCount,
      };
    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("Error updating exchange rates:", errorMessage);

    return {
      success: false,
      message: "Failed to update exchange rates",
      ratesUpdated: 0,
      fiatRatesUpdated: 0,
      cryptoRatesUpdated: 0,
      error: errorMessage,
    };
  }
}

/**
 * Get the latest exchange rate for a specific currency pair
 *
 * @param fromCurrencySymbol Source currency symbol (e.g., USD)
 * @param toCurrencySymbol Target currency symbol (e.g., EUR)
 * @returns Exchange rate or null if not found
 */
export async function getLatestExchangeRate(
  fromCurrencySymbol: string,
  toCurrencySymbol: string,
): Promise<ExchangeRate | null> {
  try {
    initModels(db);

    const rate = await ExchangeRate.findOne({
      where: {
        is_latest: true,
      },
      include: [
        {
          model: Currency,
          as: "fromCurrency",
          where: { symbol: fromCurrencySymbol },
          attributes: ["id", "symbol"],
        },
        {
          model: Currency,
          as: "toCurrency",
          where: { symbol: toCurrencySymbol },
          attributes: ["id", "symbol"],
        },
      ],
    });

    return rate;
  } catch (error) {
    console.error("Error fetching exchange rate:", error);

    return null;
  }
}

/**
 * Get all latest exchange rates from a specific base currency
 *
 * @param fromCurrencySymbol Base currency symbol (e.g., USD)
 * @returns Map of target currency symbol -> rate
 */
export async function getLatestRatesFromCurrency(
  fromCurrencySymbol: string,
): Promise<Map<string, string>> {
  try {
    initModels(db);

    const rates = await ExchangeRate.findAll({
      where: {
        is_latest: true,
      },
      include: [
        {
          model: Currency,
          as: "fromCurrency",
          where: { symbol: fromCurrencySymbol },
          attributes: ["id", "symbol"],
        },
        {
          model: Currency,
          as: "toCurrency",
          attributes: ["id", "symbol"],
        },
      ],
    });

    const rateMap = new Map<string, string>();

    for (const rate of rates) {
      const toSymbol = rate.toCurrency?.symbol;

      if (toSymbol) {
        rateMap.set(toSymbol, rate.rate);
      }
    }

    return rateMap;
  } catch (error) {
    console.error("Error fetching exchange rates:", error);

    return new Map();
  }
}

// Export for use in cron jobs or other scheduled tasks
export default updateExchangeRates;
