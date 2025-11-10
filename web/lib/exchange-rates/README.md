# Exchange Rate Management

This module handles fetching, storing, and converting between exchange rates using a hub-and-spoke model with USD as the central hub.

## Architecture

### Hub-and-Spoke Model

- **Base Currency (Hub)**: USD
- **All rates stored relative to USD**: e.g., USD→EUR, USD→GBP, USD→BTC
- **Conversion formula**: `(amount / fromRate) * toRate`

**Benefits**:

- Reduces API calls: N currencies = N API calls/day (not N²)
- Free tier compatible: ~1,500 calls/month for 50 currencies
- Supports unlimited user base currencies
- Simple and efficient rate conversions

## Components

### exchangeRateService.ts

Core service for fetching and converting rates.

```typescript
// Fetch rates from ExchangeRate API
const rates = await fetchExchangeRates(apiKey, ["EUR", "GBP", "BTC"]);

// Convert between currencies
const converted = convertCurrency("100", "1.0", "1.2"); // 100 USD to EUR

// Convert using symbol map
const rateMap = new Map([
  ["USD", "1"],
  ["EUR", "0.92"],
  ["BTC", "0.000024"],
]);
const result = convertCurrencyBySymbol("100", "USD", "EUR", rateMap);
```

### updateExchangeRates.ts

Database update operations and query helpers.

```typescript
// Update all rates in database (called by cron job)
const result = await updateExchangeRates();

// Get latest rate for a pair
const rate = await getLatestExchangeRate("USD", "EUR");

// Get all rates from a base currency
const rates = await getLatestRatesFromCurrency("USD");
```

## Usage

### Daily Scheduled Updates

The system fetches rates daily at 00:00:00 UTC. Configure via:

#### Option 1: Vercel Cron Functions (Recommended)

Create `web/app/api/cron/update-rates/route.ts`:

```typescript
import { updateExchangeRates } from "@/lib/exchange-rates";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  // Verify Vercel cron token for security
  if (
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await updateExchangeRates();
  return NextResponse.json(result);
}
```

Then configure in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-rates",
      "schedule": "0 0 * * *"
    }
  ]
}
```

#### Option 2: External Service

Use EasyCron or cron-job.org to call:

```
POST /api/v1/currency/rates/update
```

#### Option 3: Self-Hosted

Use `node-cron` or Bull queue package:

```typescript
import cron from "node-cron";
import { updateExchangeRates } from "@/lib/exchange-rates";

// Update rates daily at 00:00 UTC
cron.schedule("0 0 * * *", async () => {
  const result = await updateExchangeRates();
  console.log("Exchange rates updated:", result);
});
```

### In Calendar Calculations

Use `getLatestRatesFromCurrency()` to fetch rates for conversion:

```typescript
// In calendar endpoint
const rates = await getLatestRatesFromCurrency("USD");

// When calculating monthly summary
for (const event of events) {
  let amount = new Decimal(event.amount);

  if (event.currency_id !== baseCurrencyId) {
    const rate = rates.get(event.currency.symbol);
    if (rate) {
      amount = convertCurrency(
        event.amount,
        rate,
        "1", // Base currency rate (always 1)
      );
    }
  }

  // Add to totals
}
```

## API Endpoints

### Manual Rate Update

**POST** `/api/v1/currency/rates/update`

Trigger a manual exchange rate update. Useful for testing or manual refreshes.

**Response**:

```json
{
  "success": true,
  "data": {
    "message": "Successfully updated 10 exchange rates for 2025-11-10",
    "ratesUpdated": 10
  }
}
```

## Environment Variables

```bash
# Required for rate fetching
EXCHANGERATE_API_KEY=your_api_key_here

# Optional: Cron verification token (for Vercel crons)
CRON_SECRET=your_secret_token_here
```

Get API key from: https://www.exchangerate-api.com/

## Database Schema

### exchange_rates Table

| Column           | Type          | Notes                              |
| ---------------- | ------------- | ---------------------------------- |
| id               | UUID          | Primary key                        |
| from_currency_id | UUID          | Source currency (FK to currencies) |
| to_currency_id   | UUID          | Target currency (FK to currencies) |
| rate             | DECIMAL(20,8) | Conversion rate                    |
| snapshot_date    | DATE          | Date the rate represents (UTC)     |
| fetched_at       | TIMESTAMP     | When rate was fetched              |
| source           | ENUM          | 'exchangerate-api' or 'manual'     |
| is_latest        | BOOLEAN       | Latest rate for this pair          |
| created_at       | TIMESTAMP     | Record creation time               |
| updated_at       | TIMESTAMP     | Record update time                 |

### Indexes

- `(from_currency_id, to_currency_id)` - Query rates for specific pair
- `(to_currency_id, snapshot_date DESC)` - Fetch rate on specific date
- `(is_latest, from_currency_id)` - Quick lookup of latest rates
- `(snapshot_date)` - Query rates by date

## Error Handling

The system gracefully handles:

- **Missing API key**: Returns error, rates not updated
- **API downtime**: Logs error, calculation falls back to previous day's rate
- **Missing currencies**: Warns and skips missing currencies
- **Network failures**: Returns error with detailed message

### Fallback Strategy

When converting currency and latest rate is unavailable:

```typescript
// Query previous day's rate
const previousRate = await ExchangeRate.findOne({
  where: {
    from_currency_id,
    to_currency_id,
    snapshot_date: { [Op.lte]: requestDate },
  },
  order: [["snapshot_date", "DESC"]],
  limit: 1,
});
```

## Future Enhancements

- [ ] Crypto-specific update frequency (6-hourly for BTC/ETH)
- [ ] User-specific base currency support
- [ ] Rate caching with Redis
- [ ] Historical rate tracking for trend analysis
- [ ] Rate alert system (notify when rates change > threshold)
- [ ] Support for multiple rate APIs (fallback/comparison)
- [ ] Batch conversion utilities
- [ ] Rate validation and sanity checks
