# Yields Protocol

> **Domain:** yields.ag
> **Tagline:** "Back the grove. Earn the yields."
> **Core concept:** Tokenized productive capacity for real-world assets

---

## Table of Contents

1. [Overview](#overview)
2. [Terminology](#terminology)
3. [Asset Types](#asset-types)
4. [Guatemala Cacao Focus](#guatemala-cacao-focus)
5. [Economics & ROI](#economics--roi)
6. [Physical Verification (NFC/RFID)](#physical-verification-nfcrfid)
7. [Smart Contract Architecture](#smart-contract-architecture)
8. [Risk Management](#risk-management)
9. [Branding & Messaging](#branding--messaging)
10. [Landing Page Structure](#landing-page-structure)
11. [Roadmap](#roadmap)

---

## Overview

### The Problem

- **Farmers** wait months for payment after harvest, lack capital for next season
- **Investors** chase speculation with no real asset backing
- **Middlemen** extract 50%+ of value from supply chains

### The Solution

Yields Protocol tokenizes **productive capacity** — not products. Investors fund real assets (trees, machines, solar, livestock) and earn recurring yield for the asset's lifespan (often 25+ years).

### Key Insight

```
OLD MODEL:  Investor → buys → [Coffee Bag] → consumes → gone (one-time)
YIELDS:     Investor → backs → [Coffee Tree] → yields → forever (recurring)
```

**You don't own the asset. You own rights to what it produces.**

---

## Terminology

| Term | Definition |
|------|------------|
| **Yields** | The protocol/platform |
| **Grove** | A pool of tokenized productive assets |
| **Backer** | An investor who funds capacity |
| **Capacity** | What you purchase (rights to production share) |
| **Yield** | What you earn (share of production) |
| **Harvest** | A yield distribution event |
| **Proof of Yield** | On-chain verification that assets produced what was claimed |

### Why "Back" Instead of "Own"

"Own" implies you can redeem/take the physical asset. You can't. "Back" implies:
- You funded the asset
- You're entitled to its production
- You believe in its value

---

## Asset Types

Yields works for any productive asset with verifiable recurring output:

### 🌳 Tree Groves
| Asset | Lifespan | Annual Yield |
|-------|----------|--------------|
| Cacao | 25-40 years | 1-2 kg/tree |
| Coffee | 20-30 years | 2-4 kg/tree |
| Avocado | 50+ years | 50-200 kg/tree |
| Apple | 30-50 years | 40-200 kg/tree |
| Olive | 100+ years | 15-40 kg/tree |

### ☀️ Energy Groves
| Asset | Lifespan | Output |
|-------|----------|--------|
| Solar panels | 25-30 years | kWh/day |
| Wind turbines | 20+ years | kWh/day |
| Biogas | Continuous | m³/day |

### 🚜 Machine Groves
| Asset | Lifespan | Output |
|-------|----------|--------|
| Tractors | 10-15 years | Usage fees |
| Processing mills | 15-20 years | Per-batch fees |
| Cold storage | 20+ years | Rental fees |
| Irrigation systems | 15-25 years | Water delivery fees |

### 🐄 Herd Groves
| Asset | Productive Life | Output |
|-------|-----------------|--------|
| Dairy cows | 6-8 years | Milk/day |
| Laying hens | 2-3 years | Eggs/day |
| Beehives | 10+ years | Honey + pollination |
| Wool sheep | 10+ years | Annual shearing |

---

## Guatemala Cacao Focus

### Why Guatemala?

- World-class **Criollo cacao** origin (rarest, finest variety)
- Existing infrastructure: FECCEG, Kakao Fino, Danta Chocolate
- Government support: $225M Fondo Nacional para la Innovación
- Climate: Ideal microclimates in Cobán, Alta Verapaz, Izabal

### Criollo Cacao Specifics

| Metric | Value |
|--------|-------|
| Time to first harvest | 3-5 years |
| Peak production | 8-10 years |
| Productive lifespan | 25-40 years |
| Yield per mature tree | 1-2 kg/year (conservative: 1.2 kg) |
| Fine Criollo price | $12-18/kg (verified origin) |
| Commodity cacao price | $8/kg (comparison) |

### Key Players to Approach

- **FECCEG** — Federación Comercializadora de Café Especial de Guatemala
- **Kakao Fino** — Criollo "Indio Rojo/Mayan Red" cultivator
- **Danta Chocolate** — Award-winning bean-to-bar maker
- **GrainChain** — Already doing blockchain traceability in Guatemala

---

## Economics & ROI

### Per-Tree Model (Criollo Cacao)

```
INVESTMENT (Per Capacity Token)
├── Tree establishment cost     $30-50
├── Tagging + registration      $3
├── Reserve fund contribution   $10
└── Protocol fee                $5
────────────────────────────────────
TOTAL TOKEN PRICE:              ~$50-70

ANNUAL RETURNS (Mature Tree)
├── Yield                       1.2 kg/year
├── Price                       $12/kg
├── Gross revenue               $14.40/year
├── Operating costs (20%)       -$2.88
├── Reserve contribution (10%)  -$1.44
└── Net to backer               $10.08/year
────────────────────────────────────
ANNUAL YIELD:                   ~15-20%

CUMULATIVE (25-Year Lifespan)
├── Total distributions         $252
├── Original investment         $60
└── Total return                420% (4.2x)
```

### Scenario Analysis

| Scenario | Yield | Price | Annual Return | APY |
|----------|-------|-------|---------------|-----|
| Conservative | 1.0 kg | $10/kg | $7.00 | 11.7% |
| **Base case** | **1.2 kg** | **$12/kg** | **$10.08** | **16.8%** |
| Optimistic | 1.5 kg | $15/kg | $15.75 | 26.3% |

---

## Physical Verification (NFC/RFID)

### Tagging Options

| Method | Tree Impact | Cost | Durability | Farmer Acceptance |
|--------|-------------|------|------------|-------------------|
| **Nail tag** | Minimal hole | $0.20-0.50 | 10+ years | ⚠️ May resist |
| **Ground stake** | None | $1.00-3.00 | 5-10 years | ✅ Excellent |
| **Branch strap** | None | $1.00-2.50 | 5-10 years | ✅ Excellent |
| **Paint + GPS** | None | $0.05 | 1-2 years | ✅ Excellent |

### Recommended: NFC Branch Strap

**Best products:**
- Seritag Premium Cable Tie NTAG213 (~$1.50-2.50/ea)
- Shop NFC Industrial Cable Tie (~$1.00-1.50/ea)
- Alibaba generic NFC cable ties (~$0.30-0.60/ea, MOQ 500)

**Specs needed:**
- Length: 200mm+ (fits branches up to 55mm diameter)
- IP68 waterproof
- Temperature: -20°C to +85°C
- Chip: NTAG213 (144 bytes, sufficient for URL)

### What's Stored Where

| Data | NFC Tag | On-Chain | Off-Chain (IPFS) |
|------|---------|----------|------------------|
| Tag UID | ✅ (auto) | ✅ (link key) | — |
| Tree number | ✅ (in URL) | ✅ | — |
| Grove ID | ✅ (in URL) | ✅ | — |
| GPS coordinates | — | ✅ | — |
| Variety, planted date | — | ✅ | — |
| Status, health score | — | ✅ | — |
| Yield history | — | ✅ | — |
| Photos | — | Hash only | ✅ |

**Tag stores just a URL:**
```
https://yields.ag/tree/GT-2025-0047
```

Scanning opens webapp with full tree record pulled from blockchain.

### Verification Flow

```
1. Auditor walks to tree
2. Scans NFC tag with phone
3. Phone GPS captured automatically (must match registered location ±10m)
4. Take photo showing: tree + tag + canopy
5. Submit verification (signed on-chain)
```

---

## Smart Contract Architecture

### Core Objects (Sui/Move)

```move
/// The grove - owns all trees, issues capacity tokens
struct Grove has key {
    id: UID,
    name: String,
    location_gps: String,
    total_trees: u64,
    active_trees: u64,
    trees: Table<u64, Tree>,
    total_capacity_issued: u64,
    reserve_fund_bps: u64,              // e.g., 1000 = 10%
    reserve_balance: Balance<USDC>,
}

/// Individual tree record (data, not NFT)
struct Tree has store {
    tree_number: u64,
    nfc_uid: vector<u8>,
    tag_type: u8,                       // 0=nail, 1=stake, 2=branch_strap
    gps_lat: u64,
    gps_lon: u64,
    variety: String,
    planted_date: u64,
    status: u8,                         // 0=active, 1=sick, 2=dead, 3=replaced
    health_score: u8,
    cumulative_yield_grams: u64,
    last_verified: u64,
    verified_by: address,
    photo_ipfs_hash: vector<u8>,
}

/// What backers actually hold - capacity units
struct CapacityToken has key, store {
    id: UID,
    grove_id: ID,
    capacity_units: u64,
}
```

### Key Invariant

```move
// Cannot issue more capacity than active trees
assert!(
    grove.total_capacity_issued + units <= grove.active_trees * UNITS_PER_TREE,
    EExceedsCapacity
);
```

### Harvest Distribution

```move
public fun distribute_harvest(grove: &mut Grove, total_revenue: Balance<USDC>) {
    // 1. Reserve cut (10%)
    let reserve_amount = (balance::value(&total_revenue) * grove.reserve_fund_bps) / 10000;
    let reserve_cut = balance::split(&mut total_revenue, reserve_amount);
    balance::join(&mut grove.reserve_balance, reserve_cut);

    // 2. Distribute remainder to capacity holders pro-rata
    // ...
}
```

### Governance

```move
struct Proposal has key {
    id: UID,
    grove_id: ID,
    proposal_type: u8,      // 0=change_operator, 1=expand, 2=change_reserve_rate
    votes_for: u64,
    votes_against: u64,
    deadline: u64,
    executed: bool,
}

// Voting power = capacity units owned
```

---

## Risk Management

### Risk Matrix

| Risk | Mitigation | Who Bears Cost |
|------|------------|----------------|
| Tree death | Reserve fund → replanting | All backers (pooled) |
| Low yield (weather) | Weather-indexed insurance | Insurance pool |
| Low yield (disease) | Reserve fund + agronomist | All backers |
| Price crash | No protection (market risk) | All backers |
| Total grove loss | External insurance policy | Insurance company |

### Reserve Fund Mechanics

```
Every harvest:
├── 10% → Reserve fund
└── 90% → Distributed to backers

Reserve fund covers:
├── Tree replacement ($30-50/tree)
├── Emergency interventions
└── Yield shortfall buffer (optional)
```

### Tree Death Handling

1. Agronomist verifies death → updates on-chain status
2. Reserve fund finances replacement planting
3. New sapling registered (won't produce for 3-4 years)
4. Yield per capacity unit slightly reduced until replacement matures
5. **Risk is pooled** — no single backer loses their "tree"

### Yield Variability Options

| Model | Description | Risk Bearer |
|-------|-------------|-------------|
| **Variable (recommended)** | Backers receive actual yield, whatever it is | Backers |
| Guaranteed minimum | Protocol covers shortfall from reserves | Protocol |
| Insurance-backed | Weather oracle triggers automatic compensation | Insurance pool |

---

## Branding & Messaging

### Brand Identity

```
BRAND:           Yields
DOMAIN:          yields.ag
TAGLINE:         "Back the grove. Earn the yields."
PROOF LAYER:     Proof of Yield
```

### Messaging Pillars

1. **Productive capacity, not products**
   - "You're not buying chocolate. You're backing the trees that make it."

2. **Recurring for decades**
   - "Trees keep producing for 25-40 years."

3. **Farmers win too**
   - "Capital when it's needed, not after the harvest."

4. **Radical transparency**
   - "Every tree tagged. Every harvest verified. On-chain forever."

5. **Real-world DeFi**
   - "Proof of Yield, not just Proof of Stake."

### Tagline Options

| Tagline | Use Case |
|---------|----------|
| "Back the grove. Earn the yields." | Primary |
| "Real groves. Real yields." | Trust focus |
| "They produce. You earn." | Simple explanation |
| "Proof of Yield." | Protocol identity |
| "Fund what produces. Earn what it yields." | Detailed |

### Asset-Specific Messaging

```
🌳 Trees:    "Back the tree. Earn every harvest."
☀️ Solar:    "Back the panel. Earn every kilowatt."
🚜 Machines: "Back the machine. Earn every use."
🐄 Herds:    "Back the herd. Earn every cycle."
```

### Voice Guidelines

| Do | Don't |
|----|-------|
| Grounded, honest, clear | Hypey, "guaranteed returns" |
| Long-term focused | Get-rich-quick |
| Real-world connected | Abstract DeFi jargon |
| Use: yield, harvest, grove | Use: APY, emissions, staking |

---

## Landing Page Structure

### Hero Section
```
YIELDS

Back the grove. Earn the yields.

Trees, machines, solar, herds — tokenized and yielding.
Fund productive assets. Receive what they produce.
For decades.

[ Explore Groves ]    [ List Your Assets ]

🌳 4,291 Assets    💰 $847K Distributed    🌍 3 Countries
```

### Section Flow

1. **Hero** — Value prop + CTA + social proof stats
2. **The Problem** — Farmers wait, investors speculate, middlemen extract
3. **How It Works** — Groves → Back → Produce → Yields (4-step visual)
4. **Everyone Wins** — Farmers (upfront capital), Backers (recurring yield), Makers (traceability)
5. **The Numbers** — ROI calculator, yield projections, lifespan data
6. **Transparency** — GPS, NFC, photo audits, on-chain records
7. **Risk Disclosure** — Honest about what can go wrong + mitigations
8. **Live Groves** — Browse available groves with stats
9. **Purchase Flow** — Select trees, see projections, connect wallet
10. **FAQ** — Address objections
11. **Footer** — Docs, GitHub, Discord, Twitter

### Conversion Elements

- Live stats in hero (social proof)
- ROI calculator widget (personalization)
- Risk section (builds trust through honesty)
- Grove cards (tangible, specific opportunities)
- Multi-payment: USDC, SUI, credit card
- "Visit your trees" CTA (emotional ownership)

---

## Roadmap

### 2025: PLANT
- Launch with Criollo cacao groves in Guatemala
- Prove model: tagging, verification, yield distribution
- First 1,000 trees tokenized
- Partner with 2-3 farms

### 2026: GROW
- Expand to coffee (Guatemala, Colombia)
- Add machine groves (tractors, processing)
- Launch secondary market for token trading
- 10,000+ assets tokenized

### 2027: HARVEST
- Multi-country: Mexico, Peru, East Africa
- Solar and energy groves
- Livestock groves (dairy, poultry)
- Institutional offerings
- 100,000+ assets tokenized

### LONG-TERM: FOREST
- Yields becomes THE protocol for productive capacity
- Any asset type, any geography
- Billions in real-world value, on-chain

---

## Technical Stack

| Layer | Technology |
|-------|------------|
| Blockchain | Sui |
| Smart contracts | Move |
| Frontend | Next.js 15, React 18, TypeScript, TailwindCSS |
| Database | PostgreSQL (off-chain metadata) |
| Storage | IPFS (photos, documents) |
| Oracles | Weather data, price feeds |
| Physical | NFC tags (NTAG213), GPS verification |

---

## Next Steps

1. **Farm partnerships** — Visit Cobán/Alta Verapaz, talk to cooperatives
2. **Legal structure** — Agricultural commodity pre-purchase (not security)
3. **MVP smart contracts** — Grove, CapacityToken, distribution
4. **Tagging pilot** — Order NFC cable ties, tag 100 trees
5. **Landing page** — yields.ag live with waitlist
6. **First grove** — $10K pilot with partner farm

---

## Reference Links

- GrainChain Guatemala: blockchain coffee traceability
- FECCEG: Guatemala specialty coffee federation
- Kakao Fino: Criollo cacao producer
- Dimitra + MANTRA: cacao/carbon tokenization
- DAGRO CCP2028: Venezuela Criollo cacao token model
- Finca Chocolat: SEC-registered cacao farm investment

---

## Contact

Project lead: [Your info]
Domain: yields.ag
Status: Pre-launch, building

---

*Last updated: December 2024*
