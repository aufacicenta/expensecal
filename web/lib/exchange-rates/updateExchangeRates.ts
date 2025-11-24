import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { Currency } from "@expensecal/database/models/Currency";
import {
  ExchangeRate,
  ExchangeRateSource,
} from "@expensecal/database/models/ExchangeRate";

import { fetchExchangeRates } from "./exchangeRateService";

/**
 * Update exchange rates in the database
 * Called daily at 00:00:00 UTC
 *
 * This function:
 * 1. Fetches all active currencies
 * 2. Calls exchangerate-api.com to get latest rates
 * 3. Stores rates in the exchange_rates table
 * 4. Marks previous rates as not latest
 * 5. Returns summary of operation
 */
export async function updateExchangeRates(): Promise<{
  success: boolean;
  message: string;
  ratesUpdated: number;
  error?: string;
}> {
  try {
    // Initialize database
    initModels(db);

    const apiKey = process.env.EXCHANGERATE_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        message: "EXCHANGERATE_API_KEY environment variable not set",
        ratesUpdated: 0,
        error: "Missing API key",
      };
    }

    // Get all active currencies
    const currencies = await Currency.findAll({
      attributes: ["id", "symbol"],
      order: [["symbol", "ASC"]],
    });

    if (currencies.length === 0) {
      return {
        success: false,
        message: "No currencies found in database",
        ratesUpdated: 0,
        error: "No currencies",
      };
    }

    const currencySymbols = currencies.map((c) => c.symbol);
    const baseSymbol = "USD";

    // Fetch rates from API
    const ratesData = await fetchExchangeRates(
      apiKey,
      currencySymbols,
      baseSymbol,
    );

    if (ratesData.length === 0) {
      return {
        success: false,
        message: "No rates returned from API",
        ratesUpdated: 0,
        error: "API returned no rates",
      };
    }

    // Create a map of symbol -> id for quick lookup
    const currencyMap = new Map(currencies.map((c) => [c.symbol, c.id]));

    const snapshotDate = ratesData[0].snapshotDate;
    const now = new Date();

    // Start transaction
    const transaction = await db.transaction();

    try {
      // Mark all rates for this snapshot date as not latest
      await ExchangeRate.update(
        { is_latest: false },
        {
          where: {
            snapshot_date: snapshotDate,
            from_currency_id: currencyMap.get(baseSymbol),
          },
          transaction,
        },
      );

      // Insert new rates
      const ratesToInsert = [];

      for (const rateData of ratesData) {
        const fromCurrencyId = currencyMap.get(rateData.fromSymbol);
        const toCurrencyId = currencyMap.get(rateData.toSymbol);

        if (!fromCurrencyId || !toCurrencyId) {
          console.warn(
            `Skipping rate: Currency mapping not found for ${rateData.fromSymbol} -> ${rateData.toSymbol}`,
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
      }

      // Bulk create rates
      if (ratesToInsert.length > 0) {
        await ExchangeRate.bulkCreate(ratesToInsert, { transaction });
      }

      // Commit transaction
      await transaction.commit();

      return {
        success: true,
        message: `Successfully updated ${ratesToInsert.length} exchange rates for ${snapshotDate.toISOString().split("T")[0]}`,
        ratesUpdated: ratesToInsert.length,
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
