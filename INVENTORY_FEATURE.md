# Inventory Tracking Feature

Personal asset inventory tracking with AI-powered valuation to complement ExpenseCal's expense/income tracking.

## Overview

ExpenseCal currently tracks **cash flow** (money in motion). This feature adds **asset tracking** (value at rest), enabling users to see their complete financial picture.

| Current ExpenseCal | + Inventory Module |
|-------------------|-------------------|
| Tracks liquid cash flow | Tracks non-liquid asset value |
| Income & expenses over time | Assets you own with market value |
| "How much am I spending?" | "How much am I *worth*?" |

**Combined = True Net Worth Tracking**

---

## Architecture Decision: Unified Event Model

Instead of creating a separate `InventoryItem` table, we **extend the existing `Event` model** with an optional `inventory_metadata` JSONB column. This approach:

1. **Reuses existing infrastructure** — Same APIs, same UI components, same EventGroups
2. **Maintains data relationships** — Events already have categories, currencies, user associations
3. **Enables gradual adoption** — Any expense can become an inventory item by adding metadata
4. **Simplifies queries** — Net worth = SUM(events with inventory_metadata)

### How Events Become Inventory Items

| Scenario | Event Fields | inventory_metadata |
|----------|--------------|-------------------|
| Regular expense | `type: EXPENSE, amount: 50, description: "Groceries"` | `null` |
| Regular income | `type: INCOME, amount: 3000, description: "Salary"` | `null` |
| Inventory (purchased) | `type: EXPENSE, amount: 0*, description: "1965 Fender Stratocaster"` | `{ valuation: {...}, acquisition: { type: "PURCHASED", original_price: 12000 } }` |
| Inventory (inherited) | `type: EXPENSE, amount: 0*, description: "Grandfather's Rolex"` | `{ valuation: {...}, acquisition: { type: "INHERITED" } }` |

*Amount starts at 0 and is updated by the background valuation agent with the estimated market value.

---

## Use Cases

### 1. The Musician / Producer
- Studio gear: synths, guitars, amps, mics, interfaces
- Vintage gear often *appreciates* (1970s Moog, vintage Fenders)
- "My studio is worth $40K—that's my emergency fund if needed"

### 2. The Collector / Antique Enthusiast
- Furniture, art, jewelry, watches, coins, vinyl records
- Needs provenance tracking, condition notes, photos
- "What would I get if I liquidated my collection?"

### 3. The Creative Professional
- Camera gear, lenses, lighting equipment
- Rapid depreciation on some items
- Trade-in value estimates for upgrade planning

### 4. The Homeowner / Renter
- Insurance inventory: "If there's a fire, what did I own?"
- Room-by-room documentation
- Replacement cost vs actual cash value

### 5. The Investor in Physical Assets
- Watches (Rolex, Patek), wine, art
- Track purchase price, current estimate, % gain/loss
- "My watch collection has outperformed the S&P"

---

## AI-Powered Valuation Engine

### Natural Language Input

Users input items via the same `CommandsModal` used for expenses, but items are processed through the inventory endpoint:

```
"1965 Fender Stratocaster sunburst, bought in 2018 for $12,000"
"Vintage Rolex Submariner 5513 from 1972, inherited from grandfather"
"MacBook Pro M3 Max, purchased last month for $3500"
"Eames lounge chair, original Herman Miller, bought at estate sale for $2000"
```

### AI Processing Pipeline

1. **Parse** → LLM extracts item name, acquisition details, condition hints
2. **Create Events** → Events created with `inventory_metadata`, amount = 0
3. **Create View** → EventGroup created, user redirected to view page
4. **Background Valuation** → Parallel agents search for each item's market value
5. **Update** → Event.amount updated with estimated value when valuation completes

### Agentic Valuation Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│  User submits: "Roland Juno-106, vintage Omega watch, MacBook M2"  │
│  via CommandsModal                                                  │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  POST /api/v1/inventory/create-from-text                            │
│  ────────────────────────────────────────                           │
│  1. Parse each item with LLM                                        │
│  2. Create Event for each (amount: 0, inventory_metadata populated) │
│  3. Create EventGroup with all new events                           │
│  4. Trigger background valuation for each event (parallel)          │
│  5. Return { events, failures, event_group_id, redirect_url }       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Valuate       │   │ Valuate       │   │ Valuate       │
│ Juno-106      │   │ Omega Watch   │   │ MacBook M2    │
│ (background)  │   │ (background)  │   │ (background)  │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────────────────────────────────────────────────────────┐
│  Each valuation agent:                                             │
│  1. LLM generates optimal search query (dynamic, no preset cats)   │
│  2. Tavily searches relevant marketplaces                          │
│  3. LLM extracts prices from results                               │
│  4. Updates Event.amount with midpoint estimate                    │
│  5. Updates inventory_metadata.valuation with full details         │
└───────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│  User sees view page: /table/view/[event_group_id]                 │
│  Items show "Valuating..." then update with estimated values       │
└───────────────────────────────────────────────────────────────────┘
```

### Dynamic Search Query Generation

Instead of predefined category mappings, the LLM dynamically generates the optimal search strategy per item:

```typescript
// LLM prompt for search strategy generation
const SEARCH_STRATEGY_PROMPT = `You are an expert at finding market values for items.
Given an item description, generate the optimal search strategy.

Respond with JSON:
{
  "query": "the search query to find sold/market prices",
  "domains": ["domain1.com", "domain2.com"], // 3-5 most relevant marketplaces
  "item_type": "category for internal use",
  "specifics_that_would_help": ["list of details that would improve accuracy"]
}

Guidelines:
- Include "sold price" or "market value" in query for pricing data
- Include year/era if mentioned
- Choose domains based on item type:
  - Musical instruments: reverb.com, ebay.com
  - Watches: chrono24.com, bobswatches.com
  - Electronics: ebay.com, swappa.com
  - Art/Antiques: 1stdibs.com, christies.com
  - Vehicles: kbb.com, bringatrailer.com, cargurus.com
  - General/Unknown: ebay.com, google.com
- Be specific but not overly narrow`;
```

### Search API: Tavily

We use **Tavily** for web search because:

1. **Structured JSON output** — No need to parse prose; get citation-backed data
2. **Built for agents** — Designed for exactly this workflow
3. **Domain filtering** — Can restrict to specific marketplaces
4. **Cost-effective** — ~$0.01-0.02 per search

```typescript
const searchResults = await tavily.search({
  query: searchStrategy.query,
  include_domains: searchStrategy.domains,
  search_depth: "advanced",
  max_results: 15,
});
```

### Example Output

```
┌─────────────────────────────────────────────────────────────────┐
│  YOUR DISCOVERED NET WORTH: $28,500 - $34,200                   │
├─────────────────────────────────────────────────────────────────┤
│  Roland Juno-106           │ $2,800 - $4,000    │ HIGH conf.    │
│    → Sources: Reverb (23 sold), eBay (8 sold)                   │
│                                                                 │
│  Omega Seamaster Vintage   │ $3,200 - $5,500    │ MEDIUM conf.  │
│    → Need: year, reference number for better estimate           │
│                                                                 │
│  MacBook Pro M2            │ $1,500 - $1,800    │ HIGH conf.    │
│    → Depreciating ~15%/year                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Extended Event Model

The existing `Event` model is extended with a nullable `inventory_metadata` JSONB column:

```typescript
// Valuation data populated by the search agent
type InventoryValuation = {
  estimated_low: number;
  estimated_high: number;
  currency: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  data_points: number;
  sources: { url: string; title: string; price?: number }[];
  last_updated: string; // ISO date
  search_query_used: string; // LLM-generated query
};

// Acquisition details
type InventoryAcquisition = {
  type: "PURCHASED" | "INHERITED" | "GIFTED" | "TRADED" | "FOUND";
  original_price?: number;
  original_currency?: string;
  date?: string; // ISO date
};

// Item-specific details (user-provided or LLM-inferred)
type InventoryDetails = {
  condition?: "MINT" | "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
  year?: number;
  brand?: string;
  model?: string;
  serial_number?: string;
  location?: string; // "Home Office", "Storage"
};

// Main metadata type
type InventoryMetadata = {
  valuation?: InventoryValuation;
  acquisition?: InventoryAcquisition;
  details?: InventoryDetails;
  status?: "OWNED" | "SOLD" | "DONATED" | "LOST";
  needs_clarification?: string[];
  valuation_status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  valuation_error?: string;
};
```

### Database Migration

```sql
-- Add inventory_metadata column to events table
ALTER TABLE events
ADD COLUMN inventory_metadata JSONB DEFAULT NULL;

-- GIN index for efficient JSONB queries
CREATE INDEX idx_events_inventory_metadata
ON events USING GIN (inventory_metadata)
WHERE inventory_metadata IS NOT NULL;

-- Partial index for inventory items only
CREATE INDEX idx_events_is_inventory
ON events (user_id, event_date)
WHERE inventory_metadata IS NOT NULL;
```

### Value History (Optional Extension)

For tracking valuation changes over time:

```typescript
type InventoryValueHistory = {
  id: string;
  event_id: string;
  estimated_value: number;
  value_currency: string;
  value_source: "AI_ESTIMATE" | "MANUAL" | "APPRAISAL" | "MARKET_UPDATE";
  notes: string | null;
  recorded_at: string;
};
```

```sql
CREATE TABLE inventory_value_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  estimated_value DECIMAL(28,8) NOT NULL,
  value_currency VARCHAR(10) NOT NULL,
  value_source VARCHAR(20) NOT NULL,
  notes TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inventory_value_history_event ON inventory_value_history(event_id);
CREATE INDEX idx_inventory_value_history_date ON inventory_value_history(recorded_at);
```

---

## API Endpoints

### Primary Inventory Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/inventory/create-from-text` | Parse items, create events, create view, trigger valuation |

#### POST /api/v1/inventory/create-from-text

**Request:**
```typescript
type CreateInventoryFromTextRequest = {
  text: string;           // Multi-line text with one item per line
  current_date?: string;  // ISO 8601 date for context
  group_name?: string;    // Optional name for the EventGroup (defaults to "Inventory - {date}")
};
```

**Response:**
```typescript
type CreateInventoryFromTextResponse = {
  success: boolean;
  data?: {
    events: {
      id: string;
      description: string;
      inventory_metadata: InventoryMetadata;
      valuation_status: "PENDING";
    }[];
    failures: {
      original_text: string;
      error: string;
    }[];
    event_group: {
      id: string;
      name: string;
    };
    redirect_url: string; // /table/view/[event_group_id]
    summary: {
      total_parsed: number;
      total_created: number;
      total_failed: number;
    };
  };
  error?: string;
};
```

**Behavior:**
1. Parse each line of text as a separate inventory item
2. Create Event for each with `inventory_metadata` and `amount: 0`
3. Create EventGroup containing all new events
4. Trigger background valuation for each event (parallel, non-blocking)
5. Return response with redirect URL to the view page

### Valuation Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/inventory/valuate` | Trigger valuation for specific event(s) |
| GET | `/api/v1/inventory/valuation-status/:eventId` | Check valuation status |

### Analytics Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/inventory/summary` | Total value of all inventory items |
| GET | `/api/v1/inventory/net-worth` | Cash flow + inventory value |
| GET | `/api/v1/inventory/appreciation` | Items with biggest gains/losses |

---

## Integration with ExpenseCal Core

### Input Flow via CommandsModal

The existing `CommandsModal` component (Cmd+K) is extended to support inventory input:

```typescript
// In CommandsModal, detect inventory mode or add a toggle
// Items are sent to create-inventory-from-text instead of create-from-text

// Example: User opens CommandsModal and enters:
"Roland Juno-106 synthesizer
Vintage Omega Seamaster watch from the 70s
MacBook Pro M2, bought for $2500 last year"

// → POST /api/v1/inventory/create-from-text
// → Creates 3 events with inventory_metadata
// → Creates EventGroup "Inventory - Feb 3, 2026"
// → Redirects to /table/view/[group_id]
// → Background valuation starts for each item
```

### Expense → Inventory Flow

```
User enters: "3500 USD for new MacBook Pro M3 Max"

ExpenseCal: Creates expense event

AI suggests: "Add to inventory? This looks like a valuable asset."

User confirms: Adds inventory_metadata to existing event, triggers valuation
```

### Sale → Income Flow

```
User action: Mark inventory item as "Sold" for $8000

ExpenseCal:
  1. Creates income event for $8000
  2. Updates inventory_metadata.status to "SOLD"
  3. Calculates gain/loss from original acquisition price
  4. Links the events

Result: "Sold Fender Stratocaster: $8,000 (purchased $5,000 → $3,000 gain)"
```

### View Integration

Inventory items are displayed using the existing `EventsTable` component via EventGroups:

```
/table/view/[event_group_id]
├── Uses CalendarV2Context with filtered inventory events
├── EventsTable shows items with valuation status indicators
├── Real-time updates as background valuations complete
└── Summary shows total estimated net worth
```

### Net Worth Dashboard

```
┌─────────────────────────────────────────┐
│           NET WORTH: $127,450           │
├─────────────────────────────────────────┤
│ Cash Flow Balance      │    $12,450     │
│ Inventory Value        │   $115,000     │
│   ├─ Music Gear        │    $45,000     │
│   ├─ Electronics       │     $8,000     │
│   ├─ Watches           │    $35,000     │
│   └─ Art & Antiques    │    $27,000     │
├─────────────────────────────────────────┤
│ 30-day change: +$2,340 (+1.9%)          │
└─────────────────────────────────────────┘
```

---

## Unique Features

### 1. Liquidation Planner

> "I need $10,000 quickly. What should I sell?"

AI ranks items by:
- **Liquidity**: How fast can you sell it? (eBay commodity vs rare antique)
- **Value efficiency**: Highest value with least emotional attachment
- **Market timing**: "Vintage synths are hot right now, good time to sell"

### 2. Insurance Mode

- Generate PDF inventory for insurance claims
- Room-by-room organization
- Photo documentation with timestamps
- Replacement cost vs actual cash value

### 3. Appreciation Alerts

> "Your 1970s Moog Minimoog has appreciated 25% this year. Current estimate: $15,000"

### 4. Market Intelligence

> "Vintage camera prices are declining as iPhone quality improves. Consider selling your Leica collection soon."

### 5. Estate Planning View

- Total estate value
- Beneficiary assignments (future feature)
- Documentation for heirs

---

## Default Categories

```
Electronics
├── Computers & Laptops
├── Phones & Tablets
├── Cameras & Photography
├── Audio Equipment
└── Gaming

Musical Instruments
├── Guitars
├── Keyboards & Synths
├── Drums & Percussion
├── Studio Equipment
├── Amplifiers
└── Effects & Pedals

Watches & Jewelry
├── Watches
├── Fine Jewelry
├── Costume Jewelry
└── Accessories

Art & Collectibles
├── Paintings & Prints
├── Sculptures
├── Antiques
├── Coins & Currency
├── Stamps
├── Sports Memorabilia
└── Vinyl Records

Furniture
├── Living Room
├── Bedroom
├── Office
├── Outdoor
└── Antique Furniture

Vehicles
├── Cars
├── Motorcycles
├── Bicycles
├── Boats
└── Other Vehicles

Home & Appliances
├── Major Appliances
├── Small Appliances
├── Tools & Equipment
└── Home Decor

Fashion
├── Designer Clothing
├── Shoes & Sneakers
├── Handbags
└── Accessories

Other
├── Sports Equipment
├── Books & First Editions
├── Wine & Spirits
└── Miscellaneous
```

---

## AI System Prompts

### Item Parsing Prompt

```
You are an inventory item parser. Given a natural language description of an item, extract structured data.

Respond ONLY with valid JSON:
{
  "description": "cleaned item description for display",
  "acquisition": {
    "type": "PURCHASED" | "INHERITED" | "GIFTED" | "TRADED" | "FOUND",
    "original_price": number | null,
    "original_currency": "USD" | "EUR" | etc | null,
    "date": "ISO 8601 date" | null
  },
  "details": {
    "condition": "MINT" | "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | null,
    "year": number | null,
    "brand": "string" | null,
    "model": "string" | null
  },
  "confidence": 0.0 to 1.0
}

Examples:
- "1965 Fender Stratocaster sunburst, bought in 2018 for $12,000"
  → acquisition.type: "PURCHASED", acquisition.original_price: 12000, details.year: 1965, details.brand: "Fender"

- "Grandfather's vintage Rolex from the 70s"
  → acquisition.type: "INHERITED", details.brand: "Rolex", details.year: null (range: 1970-1979)
```

### Search Strategy Prompt

```
You are an expert at finding market values for items.
Given an item description, generate the optimal search strategy.

Respond with JSON:
{
  "query": "the search query to find sold/market prices",
  "domains": ["domain1.com", "domain2.com"], // 3-5 most relevant marketplaces
  "item_type": "category for internal use",
  "specifics_that_would_help": ["list of details that would improve accuracy"]
}

Guidelines:
- Include "sold price" or "market value" in query for pricing data
- Include year/era if mentioned in description
- Choose domains dynamically based on item type:
  - Musical instruments: reverb.com, ebay.com, guitarcenter.com
  - Watches: chrono24.com, bobswatches.com, watchbox.com
  - Electronics: ebay.com, swappa.com, backmarket.com
  - Art/Antiques: 1stdibs.com, christies.com, sothebys.com
  - Vehicles: kbb.com, bringatrailer.com, cargurus.com, hagerty.com
  - Furniture: 1stdibs.com, chairish.com, ebay.com
  - General/Unknown: ebay.com, google.com
- Be specific but not overly narrow
- Add current year for recency (e.g., "2025 2026")
```

### Price Extraction Prompt

```
You are a price extraction specialist. Given search results about an item, extract all price mentions and calculate a value range.

Input: Item description + array of search results (title, url, content snippet)

Respond with JSON:
{
  "prices_found": [
    { "price": number, "currency": "USD", "source": "url", "context": "sold listing" | "asking price" | "estimate" }
  ],
  "estimated_low": number,
  "estimated_high": number,
  "currency": "USD",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "data_points": number,
  "reasoning": "brief explanation"
}

Guidelines:
- Prefer "sold" prices over "asking" prices
- Filter obvious outliers (condition issues, rare variants)
- Use P25-P75 range for estimate
- HIGH confidence: 5+ recent sold prices
- MEDIUM confidence: 2-4 data points
- LOW confidence: 1 data point or estimates only
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (MVP)

- [ ] Add `inventory_metadata` JSONB column to events table (migration)
- [ ] Update Event model with InventoryMetadata types
- [ ] Create `POST /api/v1/inventory/create-from-text` endpoint
- [ ] Integrate with existing LLM parser for item extraction
- [ ] Create EventGroup on inventory creation
- [ ] Return redirect URL to view page
- [ ] Basic UI indicator for "inventory" vs "expense" events

### Phase 2: Agentic Valuation

- [ ] Integrate Tavily API for web search
- [ ] Implement search strategy LLM prompt
- [ ] Implement price extraction LLM prompt
- [ ] Background job system for parallel valuation
- [ ] Update Event.amount when valuation completes
- [ ] Real-time status updates in UI (WebSocket or polling)
- [ ] Error handling and retry logic

### Phase 3: UI Enhancements

- [ ] Valuation status indicators in EventsTable
- [ ] "Valuating..." loading state per item
- [ ] Valuation details modal (sources, confidence, range)
- [ ] Manual valuation override option
- [ ] Re-valuate button for manual refresh
- [ ] Net worth summary component

### Phase 4: Intelligence Layer

- [ ] Value history tracking (inventory_value_history table)
- [ ] Appreciation/depreciation trends
- [ ] Clarification prompts for low-confidence items
- [ ] Scheduled re-valuation (weekly/monthly)
- [ ] Category-based analytics

### Phase 5: Advanced Features

- [ ] Sale flow with automatic income event creation
- [ ] Gain/loss tracking and reporting
- [ ] Liquidation planner AI
- [ ] Insurance mode with PDF export
- [ ] Photo attachments for items
- [ ] Market intelligence alerts

---

## Technical Considerations

### Background Valuation

Valuation runs asynchronously after event creation:

```typescript
// Option 1: Edge function / serverless (recommended for MVP)
// Trigger via fetch with no await

async function triggerBackgroundValuation(eventIds: string[]) {
  // Fire and forget - don't await
  fetch('/api/v1/inventory/valuate', {
    method: 'POST',
    body: JSON.stringify({ event_ids: eventIds }),
  }).catch(console.error);
}

// Option 2: Job queue (for production scale)
// Use Inngest, Trigger.dev, or similar
await inngest.send({
  name: "inventory/valuate",
  data: { event_ids: eventIds },
});
```

### Cost Estimation

| Operation | Cost | Notes |
|-----------|------|-------|
| Tavily search (advanced) | ~$0.02 | Per item |
| LLM parsing (Gemini/GPT) | ~$0.001 | Per item |
| LLM extraction | ~$0.002 | Per item |
| **Total per item** | **~$0.025** | |
| 50-item inventory | ~$1.25 | One-time |
| Monthly re-valuation | ~$1.25/mo | 50 items |

### Rate Limiting

- Tavily: Batch searches, respect rate limits
- LLM: Use fast models for parsing, capable models for extraction
- User-facing: Show progress, don't block UI

---

## Why This Feature

1. **Same UX paradigm**: Natural language input, AI-powered parsing
2. **Minimal new infrastructure**: Extends existing Event model
3. **Reuses existing UI**: EventGroups + EventsTable for display
4. **Completes the financial picture**: Cash flow + assets = true net worth
5. **Unique positioning**: No expense tracker does asset valuation well
6. **High retention**: Users who inventory valuable items become sticky
7. **Premium potential**: AI valuation could be a paid feature tier

---

## File Structure

```
web/
├── app/
│   └── api/
│       └── v1/
│           └── inventory/
│               ├── create-from-text/
│               │   ├── route.ts
│               │   └── types.ts
│               ├── valuate/
│               │   ├── route.ts
│               │   └── types.ts
│               └── valuation-status/
│                   └── [eventId]/
│                       ├── route.ts
│                       └── types.ts
├── lib/
│   └── inventory/
│       ├── generateSearchStrategy.ts
│       ├── extractPricesFromResults.ts
│       ├── tavilyClient.ts
│       └── valuationService.ts
└── components/
    └── events-table/
        └── (existing, enhanced with inventory indicators)

database/
└── migrations/
    └── YYYYMMDDHHMMSS-add-inventory-metadata-to-events.js
```
