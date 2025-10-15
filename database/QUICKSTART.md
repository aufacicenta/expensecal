# ExpenseCal Database Quick Start

## Setup

### 1. Install Dependencies

```bash
cd database
pnpm install
```

### 2. Configure Database

Create a `.env` file in the `database` directory:

```env
PGDATABASE=expensecal_dev
PGUSER=postgres
PGPASSWORD=your_password
PGHOST=localhost
PGPORT=5432
NODE_ENV=development
```

### 3. Create Database

```bash
pnpm run db:create
```

### 4. Run Migrations

```bash
pnpm run db:migrate
```

This will create the following tables:

- `currencies` - Currency definitions
- `events` - Financial events (expenses/income)
- `event_installments` - Installment relationships

### 5. Seed Data

```bash
pnpm run db:seed:all
```

This will populate the `currencies` table with common currencies: USD, EUR, GBP, MXN, JPY, BTC, ETH, CAD, AUD, CHF

---

## Running Tests

```bash
pnpm test
```

Run tests in watch mode:

```bash
pnpm run test:watch
```

---

## Database Commands

### Create Database

```bash
pnpm run db:create
```

### Drop Database (development only)

```bash
pnpm run db:drop
```

### Reset Database (drop + create + migrate)

```bash
pnpm run db:reset
```

### Run Migrations

```bash
pnpm run db:migrate
```

### Rollback Last Migration

```bash
pnpm run db:rollback
```

### Rollback All Migrations

```bash
pnpm run db:rollback:all
```

### Run Seeders

```bash
pnpm run db:seed:all
```

### Generate New Migration

```bash
pnpm run db:migration:generate -- migration-name
```

---

## Quick Examples

### 1. Create a Simple Expense

```typescript
import { Event, EventType } from "./models/Event";
import { Currency } from "./models/Currency";

// Get USD currency
const usd = await Currency.findOne({ where: { symbol: "USD" } });

// Create expense
const expense = await Event.create({
  user_id: "user-uuid-from-neon-auth",
  type: EventType.EXPENSE,
  amount: "50.00",
  currency_id: usd.id,
  description: "Lunch at restaurant",
  event_date: new Date(),
});

console.log("Created expense:", expense.id);
```

### 2. Create a Recurring Event (Monthly Rent)

```typescript
import { Event, EventType } from "./models/Event";

// Create parent event
const rent = await Event.create({
  user_id: "user-uuid",
  type: EventType.EXPENSE,
  amount: "1500.00",
  currency_id: "usd-currency-id",
  description: "Monthly rent",
  event_date: new Date("2025-11-01T00:00:00Z"),
  recurrence_rule: "FREQ=MONTHLY;INTERVAL=1;COUNT=12",
  recurrence_end_date: new Date("2026-10-01T00:00:00Z"),
});

// Create 12 monthly instances
for (let i = 1; i <= 12; i++) {
  const instanceDate = new Date("2025-11-01T00:00:00Z");
  instanceDate.setMonth(instanceDate.getMonth() + i);

  await Event.create({
    user_id: "user-uuid",
    type: EventType.EXPENSE,
    amount: "1500.00",
    currency_id: "usd-currency-id",
    description: "Monthly rent",
    event_date: instanceDate,
    parent_event_id: rent.id,
  });
}

console.log("Created recurring rent event with 12 instances");
```

### 3. Create an Installment Plan

```typescript
import { Event, EventType } from "./models/Event";
import { EventInstallment } from "./models/EventInstallment";

// Create parent event (total)
const laptop = await Event.create({
  user_id: "user-uuid",
  type: EventType.EXPENSE,
  amount: "1200.00",
  currency_id: "usd-currency-id",
  description: "New laptop (Total)",
  event_date: new Date("2025-11-01T00:00:00Z"),
});

// Create 12 installments of $100 each
for (let i = 0; i < 12; i++) {
  const installmentDate = new Date("2025-11-01T00:00:00Z");
  installmentDate.setMonth(installmentDate.getMonth() + i);

  const installment = await Event.create({
    user_id: "user-uuid",
    type: EventType.EXPENSE,
    amount: "100.00",
    currency_id: "usd-currency-id",
    description: "New laptop - Installment",
    event_date: installmentDate,
    parent_event_id: laptop.id,
  });

  // Link installment to parent
  await EventInstallment.create({
    parent_event_id: laptop.id,
    installment_event_id: installment.id,
  });
}

console.log("Created installment plan: 12 x $100");
```

### 4. Query Events

```typescript
import { Event, EventType } from "./models/Event";
import { Currency } from "./models/Currency";
import { Op } from "sequelize";

// Get all expenses for a user
const expenses = await Event.findAll({
  where: {
    user_id: "user-uuid",
    type: EventType.EXPENSE,
  },
  include: [{ model: Currency, as: "currency" }],
  order: [["event_date", "DESC"]],
});

// Get events in date range
const eventsInRange = await Event.findAll({
  where: {
    user_id: "user-uuid",
    event_date: {
      [Op.between]: [new Date("2025-11-01"), new Date("2025-11-30")],
    },
  },
});

// Get recurring event with all instances
const recurringEvent = await Event.findByPk("parent-event-id", {
  include: [
    {
      model: Event,
      as: "childEvents",
      order: [["event_date", "ASC"]],
    },
  ],
});

// Get installment plan details
const installments = await EventInstallment.findAll({
  where: { parent_event_id: "parent-event-id" },
  include: [
    {
      model: Event,
      as: "installmentEvent",
      include: [{ model: Currency, as: "currency" }],
    },
  ],
});

// Count total installments
const totalInstallments = await EventInstallment.count({
  where: { parent_event_id: "parent-event-id" },
});
```

### 5. Update and Delete

```typescript
import { Event } from "./models/Event";

// Update an event
const event = await Event.findByPk("event-id");
await event.update({
  amount: "75.00",
  description: "Updated description",
});

// Soft delete (can be restored)
await event.destroy();

// Restore soft-deleted event
await event.restore();

// Permanently delete
await event.destroy({ force: true });

// Find including soft-deleted
const allEvents = await Event.findAll({
  paranoid: false, // Include soft-deleted
});
```

---

## Model Relationships

### Event → Currency

```typescript
const event = await Event.findByPk("event-id", {
  include: [{ model: Currency, as: "currency" }],
});

console.log(event.currency.symbol); // "USD"
console.log(event.currency.name); // "US Dollar"
```

### Event → Parent Event (Recurring)

```typescript
const instance = await Event.findByPk("instance-id", {
  include: [{ model: Event, as: "parentEvent" }],
});

console.log(instance.parentEvent.recurrence_rule); // "FREQ=MONTHLY;INTERVAL=1"
```

### Event → Child Events (Recurring)

```typescript
const parent = await Event.findByPk("parent-id", {
  include: [{ model: Event, as: "childEvents" }],
});

console.log(parent.childEvents.length); // 12
```

### EventInstallment → Events

```typescript
const installment = await EventInstallment.findByPk("installment-id", {
  include: [
    { model: Event, as: "parentEvent" },
    { model: Event, as: "installmentEvent" },
  ],
});

console.log(installment.parentEvent.amount); // "1200.00" (total)
console.log(installment.installmentEvent.amount); // "100.00" (each)
```

---

## Common Queries

### Get User's Total Expenses This Month

```typescript
import { Event, EventType } from "./models/Event";
import { Op } from "sequelize";

const startOfMonth = new Date();
startOfMonth.setDate(1);
startOfMonth.setHours(0, 0, 0, 0);

const endOfMonth = new Date(startOfMonth);
endOfMonth.setMonth(endOfMonth.getMonth() + 1);

const total = await Event.sum("amount", {
  where: {
    user_id: "user-uuid",
    type: EventType.EXPENSE,
    event_date: {
      [Op.between]: [startOfMonth, endOfMonth],
    },
  },
});

console.log("Total expenses this month:", total);
```

### Get Upcoming Events (Next 30 Days)

```typescript
const now = new Date();
const thirtyDaysLater = new Date();
thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

const upcomingEvents = await Event.findAll({
  where: {
    user_id: "user-uuid",
    event_date: {
      [Op.between]: [now, thirtyDaysLater],
    },
  },
  include: [{ model: Currency, as: "currency" }],
  order: [["event_date", "ASC"]],
});
```

### Get All Recurring Events

```typescript
const recurringEvents = await Event.findAll({
  where: {
    user_id: "user-uuid",
    recurrence_rule: { [Op.ne]: null },
    parent_event_id: null, // Only parents
  },
});
```

### Get All Installment Plans

```typescript
const installmentPlans = await Event.findAll({
  where: {
    user_id: "user-uuid",
    id: {
      [Op.in]: sequelize.literal(`(
        SELECT DISTINCT parent_event_id
        FROM event_installments
      )`),
    },
  },
});
```

---

## Troubleshooting

### Database Connection Issues

Check your `.env` file and ensure PostgreSQL is running:

```bash
psql -U postgres -h localhost
```

### Migration Errors

If migrations fail, check the migration files in `./migrations/` and ensure they're in the correct order.

Reset the database:

```bash
pnpm run db:reset
```

### Test Failures

Ensure you're using the correct Node.js version:

```bash
node --version  # Should be 18.x or higher
```

Run tests with verbose output:

```bash
pnpm test -- --verbose
```

---

## Next Steps

1. **Implement Natural Language Parser** (Feature 2.2)
   - Parse text like "100 USD for dinner yesterday"
   - Extract amount, currency, date, description

2. **Create API Endpoints** (Feature 2.3)
   - POST `/api/v1/events/create`
   - POST `/api/v1/events/parse`
   - GET `/api/v1/events/list`
   - GET `/api/v1/events/:id`
   - PUT `/api/v1/events/:id`
   - DELETE `/api/v1/events/:id`

3. **Build Dashboard UI** (Feature 3)
   - Event input component
   - Calendar view
   - Event list view
   - Analytics

4. **Add Integrations** (Features 4 & 5)
   - Google Calendar sync
   - Telegram bot

---

## Resources

- [Sequelize Documentation](https://sequelize.org/docs/v6/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [RRULE Documentation](https://github.com/jakubroztocil/rrule)
- [RFC 5545 (iCalendar)](https://tools.ietf.org/html/rfc5545)
