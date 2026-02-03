# Developer Profile & Skills

## Summary

Senior Full-Stack Web3 Engineer with expertise spanning modern web development, blockchain smart contracts, and AI integration. Combines deep technical skills across the entire stack—from Move smart contracts on Sui to React/Next.js frontends—with domain expertise in FinTech, DeFi, and AI agent systems.

---

## Technical Skills

### Frontend Development

| Technology | Proficiency |
|------------|-------------|
| React 18 | Advanced |
| Next.js 15 (App Router) | Advanced |
| TypeScript | Advanced |
| TailwindCSS 4 | Advanced |
| Framer Motion | Intermediate |
| HeroUI Component Library | Intermediate |

**Patterns & Practices:**
- Advanced React Context patterns with custom hooks
- Centralized routing architecture (`useRoutes` pattern)
- UTC-first date handling utilities
- Zod schema validation
- Decimal.js for precise financial calculations
- rrule (RFC 5545) for recurring events/calendar logic

### Backend Development

| Technology | Proficiency |
|------------|-------------|
| Next.js API Routes | Advanced |
| Node.js | Advanced |
| PostgreSQL | Advanced |
| Sequelize ORM | Advanced |
| REST API Design | Advanced |

**Patterns & Practices:**
- Versioned RESTful APIs (v1, v2)
- Database migrations with rollback support
- Soft deletes (paranoid mode)
- Indexed queries for performance
- Monorepo architecture with pnpm workspaces

### Blockchain / Web3

| Technology | Proficiency |
|------------|-------------|
| Sui Blockchain | Advanced |
| Move Language | Advanced |
| @mysten/sui SDK | Advanced |
| Smart Contract Design | Advanced |

**Smart Contract Patterns:**
- Capability-based security (`MasterCap`, authorization patterns)
- Shared vs owned objects
- Dynamic fields for flexible storage
- Object tables and vector iteration
- Event emission for indexing
- Generic coin handling (`Coin<T>`, phantom types)
- Basis points fee calculations
- Multi-signature wallet integration

**Contracts Built:**
- **Truth Prediction Markets** – Full DeFi prediction market protocol with market creation, agent predictions, resolution, and proportional payout distribution
- **Agent Registry** – Agent custody with multi-sig wallet patterns, balance management via dynamic fields
- **Vault** – Encrypted secrets management with RBAC (role-based access control), per-member encryption
- **User Registry** – On-chain identity and registration patterns

### AI / LLM Integration

| Technology | Proficiency |
|------------|-------------|
| Ollama | Intermediate |
| LLM Prompt Engineering | Intermediate |
| Structured Output Parsing | Intermediate |

**Implementation:**
- Natural language parsing to structured expense data
- LLM-powered event extraction with confidence scoring
- Health checks and model availability verification

### DevOps & Tooling

| Technology | Proficiency |
|------------|-------------|
| Git | Advanced |
| pnpm | Advanced |
| Jest | Advanced |
| ESLint/Prettier | Advanced |
| Plop (code generation) | Intermediate |

---

## Domain Expertise

### FinTech / Expense Management
- Multi-currency support with exchange rate conversion
- Installment payment tracking
- Recurring transaction handling (RFC 5545 RRULE)
- Financial statistics and carry-forward calculations
- Precise decimal arithmetic for monetary values

### Calendar / Scheduling
- Complex date arithmetic and period boundaries
- Recurring event generation
- Calendar grid rendering with event aggregation
- Period-over-period statistics

### DeFi / Prediction Markets
- Market creation and lifecycle management
- Prediction window and resolution timing
- Fee distribution (protocol fees, judge fees, creator fees)
- Proportional winner payout calculations
- Judge whitelisting and authorization

### AI Agent Systems
- Agent registration and custody patterns
- Agent runner fee structures
- Multi-sig wallet custody between users and runners
- On-chain agent balance management

---

## Architecture Patterns

### Code Organization
- **Monorepo** structure with pnpm workspaces
- Separate packages: `@expensecal/web`, `@expensecal/database`
- Consistent file structure for components, contexts, and API routes

### React Context Pattern
```
context/{ContextName}/
├── {ContextName}Context.tsx          # Creates and exports context
├── {ContextName}Context.types.ts     # TypeScript type definitions
├── {ContextName}ContextController.tsx # Provider component ("use client")
└── use{ContextName}Context.tsx       # Custom hook for consuming
```

### API Route Pattern
```
app/api/v{version}/{resource}/
├── route.ts   # Route handlers (GET, POST, PUT, DELETE)
└── types.ts   # Request/response type definitions
```

### Database Model Pattern
- Sequelize with TypeScript
- UUID primary keys with UUIDV4 default
- Underscored column naming
- Soft deletes via paranoid mode
- Static `initModel()` and `associate()` methods

---

## Projects

### ExpenseCal
Full-stack expense tracking application with:
- Natural language expense input via LLM
- Multi-currency support with live exchange rates
- Recurring expenses with RFC 5545 RRULE support
- Installment payment tracking
- Calendar view with daily/monthly/yearly statistics
- Category management and filtering

**Tech Stack:** Next.js 15, React 18, TypeScript, TailwindCSS, PostgreSQL, Sequelize, Ollama

### Truth Prediction Markets
On-chain prediction market protocol on Sui blockchain with:
- Market creation with configurable options and timeframes
- Agent-based predictions with staking
- Judge-authorized market resolution
- Multi-tier fee distribution (protocol, judges, creators)
- Proportional winner payout calculations

**Tech Stack:** Move (Sui), @mysten/sui SDK, TypeScript

### Swarm Vault
On-chain encrypted secrets management with:
- Per-member encrypted secret versions
- Role-based access control (RBAC)
- Admin and viewer role management
- Dynamic field storage for secrets

**Tech Stack:** Move (Sui), @mysten/sui SDK, TypeScript

### Agent Registry
On-chain agent custody system with:
- Agent creation and ownership management
- Multi-sig wallet integration
- Agent runner assignment and fee collection
- Dynamic field coin balance management

**Tech Stack:** Move (Sui), @mysten/sui SDK, TypeScript

---

## Keywords

### Web2 Stack
```
React, Next.js 15, TypeScript, TailwindCSS, PostgreSQL, Sequelize,
REST APIs, LLM Integration, FinTech, Calendar/Scheduling,
Multi-currency, Monorepo, pnpm, Jest, Zod, Framer Motion
```

### Web3 Stack
```
Sui Blockchain, Move, Smart Contracts, DeFi, Prediction Markets,
Multi-sig Wallets, @mysten/sui SDK, PTBs, On-chain Event Indexing,
Tokenomics, Fee Distribution, RBAC, Dynamic Fields, Agent Systems
```

---

## Target Roles

| Role | Fit Level |
|------|-----------|
| Full-Stack Engineer (React/Node) | ⭐⭐⭐⭐⭐ |
| Smart Contract Engineer (Move) | ⭐⭐⭐⭐⭐ |
| Blockchain/Web3 Engineer | ⭐⭐⭐⭐⭐ |
| DeFi Protocol Engineer | ⭐⭐⭐⭐⭐ |
| FinTech Engineer | ⭐⭐⭐⭐ |
| Product Engineer | ⭐⭐⭐⭐ |
| AI/ML Engineer (Application Layer) | ⭐⭐⭐ |

---

## Target Companies

### Sui Ecosystem
- Mysten Labs, Sui Foundation, MoveBit, OtterSec

### DeFi / Prediction Markets
- Polymarket, Kalshi, Drift, Jupiter, Marinade

### FinTech
- Stripe, Square, Plaid, Mercury, Brex, Ramp
- Coinbase, Kraken (crypto precision handling)

### Web3 Infrastructure
- Alchemy, Infura, QuickNode, Thirdweb, Moralis

### AI × Crypto
- Ritual, Giza, Modulus, Autonolas

### Productivity / Calendar
- Notion, Linear, Cron, Cal.com

### Developer Tools
- Vercel, Supabase, Neon, PlanetScale

---

## Competitive Advantages

1. **Rare Move expertise** – Far fewer Move developers than Solidity developers; Sui ecosystem is growing rapidly

2. **Full-stack Web3** – Bridges contracts → indexers → frontend; most blockchain developers specialize in one layer

3. **Production-ready patterns** – Demonstrates real protocol design including fee distribution, authorization patterns, encrypted vaults with RBAC, and agent custody with multi-sig

4. **Domain expertise stack** – Combines FinTech (expense tracking) + DeFi (prediction markets) + AI Agents (agent registry), which is highly relevant for 2025 hiring trends

5. **Strong documentation** – Maintains comprehensive code style guides and architecture documentation
