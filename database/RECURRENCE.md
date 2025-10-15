# Recurrence Rules (RRULE) Guide

## Overview

ExpenseCal uses RFC 5545 (iCalendar) RRULE format for recurring events. This is the industry standard used by Google
Calendar, Apple Calendar, and other calendar applications.

## Recommended Package

**rrule** - JavaScript library for working with recurrence rules

- pnpm: `rrule`
- GitHub: https://github.com/jakubroztocil/rrule
- Documentation: https://github.com/jakubroztocil/rrule#readme

Install:

```bash
pnpm install rrule
```

---

## RRULE Format

### Basic Structure

```
FREQ=frequency;INTERVAL=n;COUNT=n;UNTIL=date;BYDAY=days;BYMONTHDAY=days
```

### Frequency Options

- `DAILY` - Every day
- `WEEKLY` - Every week
- `MONTHLY` - Every month
- `YEARLY` - Every year

---

## Common Examples

### 1. Monthly Rent (1st of each month)

```
FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=1
```

**Usage**:

```typescript
import { RRule } from "rrule";

const rule = RRule.fromString("FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=1");
const startDate = new Date("2025-10-01T00:00:00Z");

// Generate next 12 occurrences
const occurrences = rule.between(startDate, new Date("2026-10-01T00:00:00Z"), true);
```

### 2. Weekly Gym (Every Monday and Wednesday)

```
FREQ=WEEKLY;BYDAY=MO,WE
```

### 3. Bi-weekly Paycheck (Every 2 weeks)

```
FREQ=WEEKLY;INTERVAL=2
```

### 4. Quarterly Payment (Every 3 months)

```
FREQ=MONTHLY;INTERVAL=3
```

### 5. Annual Subscription (Once a year)

```
FREQ=YEARLY;INTERVAL=1
```

### 6. Daily Coffee (Every day for 30 days)

```
FREQ=DAILY;COUNT=30
```

### 7. Monthly Subscription (Until specific date)

```
FREQ=MONTHLY;UNTIL=20261231T235959Z
```

---

## Using rrule Package

### Creating a Rule

```typescript
import { RRule, RRuleSet, rrulestr } from "rrule";

// Method 1: From string
const rule = RRule.fromString("FREQ=MONTHLY;INTERVAL=1;COUNT=12");

// Method 2: From object
const rule = new RRule({
  freq: RRule.MONTHLY,
  interval: 1,
  count: 12,
  dtstart: new Date("2025-10-01T00:00:00Z"),
});

// Method 3: Parse from text
const rule = rrulestr("FREQ=MONTHLY;INTERVAL=1;COUNT=12");
```

### Generating Occurrences

```typescript
const rule = new RRule({
  freq: RRule.MONTHLY,
  interval: 1,
  count: 12,
  dtstart: new Date("2025-10-01T00:00:00Z"),
});

// Get all occurrences
const allDates = rule.all();

// Get next N occurrences
const nextTen = rule.all((date, i) => i < 10);

// Get occurrences between dates
const dates = rule.between(
  new Date("2025-10-01T00:00:00Z"),
  new Date("2026-10-01T00:00:00Z"),
  true, // inclusive
);

// Get next occurrence after a date
const nextDate = rule.after(new Date("2025-11-01T00:00:00Z"));
```

### Converting to String

```typescript
const rule = new RRule({
  freq: RRule.MONTHLY,
  interval: 1,
  count: 12,
});

// Get RRULE string
const ruleString = rule.toString(); // "FREQ=MONTHLY;INTERVAL=1;COUNT=12"

// Get human-readable text
const text = rule.toText(); // "every month, 12 times"
```

---

## ExpenseCal Implementation

### Creating Recurring Events

```typescript
import { RRule } from "rrule";
import { Event, EventType } from "./models/Event";

async function createRecurringEvent(
  userId: string,
  amount: string,
  currencyId: string,
  description: string,
  startDate: Date,
  recurrenceRule: string,
  recurrenceEndDate?: Date,
) {
  // Create parent event
  const parentEvent = await Event.create({
    user_id: userId,
    type: EventType.EXPENSE,
    amount,
    currency_id: currencyId,
    description,
    event_date: startDate,
    recurrence_rule: recurrenceRule,
    recurrence_end_date: recurrenceEndDate,
  });

  // Parse recurrence rule
  const rule = RRule.fromString(recurrenceRule);

  // Generate occurrences (first 12 or until end date)
  const endDate = recurrenceEndDate || new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
  const occurrences = rule.between(startDate, endDate, true).slice(1, 13); // Skip first (parent), take next 12

  // Create recurring instances
  for (const occurrenceDate of occurrences) {
    await Event.create({
      user_id: userId,
      type: EventType.EXPENSE,
      amount,
      currency_id: currencyId,
      description,
      event_date: occurrenceDate,
      parent_event_id: parentEvent.id,
    });
  }

  return parentEvent;
}
```

### Parsing Natural Language to RRULE

```typescript
function parseRecurrenceFromText(text: string): string | null {
  const lowerText = text.toLowerCase();

  // Daily
  if (lowerText.includes("every day") || lowerText.includes("daily")) {
    return "FREQ=DAILY;INTERVAL=1";
  }

  // Weekly
  if (lowerText.includes("every week") || lowerText.includes("weekly")) {
    return "FREQ=WEEKLY;INTERVAL=1";
  }

  // Bi-weekly
  if (lowerText.includes("every 2 weeks") || lowerText.includes("bi-weekly")) {
    return "FREQ=WEEKLY;INTERVAL=2";
  }

  // Monthly
  if (lowerText.includes("every month") || lowerText.includes("monthly")) {
    return "FREQ=MONTHLY;INTERVAL=1";
  }

  // Quarterly
  if (lowerText.includes("every 3 months") || lowerText.includes("quarterly")) {
    return "FREQ=MONTHLY;INTERVAL=3";
  }

  // Yearly
  if (lowerText.includes("every year") || lowerText.includes("yearly") || lowerText.includes("annually")) {
    return "FREQ=YEARLY;INTERVAL=1";
  }

  // Specific days of week
  const dayMatch = lowerText.match(/every (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
  if (dayMatch) {
    const dayMap: { [key: string]: string } = {
      monday: "MO",
      tuesday: "TU",
      wednesday: "WE",
      thursday: "TH",
      friday: "FR",
      saturday: "SA",
      sunday: "SU",
    };
    const day = dayMap[dayMatch[1]];
    return `FREQ=WEEKLY;BYDAY=${day}`;
  }

  return null;
}
```

### Querying Recurring Events

```typescript
// Get parent event with all instances
async function getRecurringEventWithInstances(parentEventId: string) {
  const parentEvent = await Event.findByPk(parentEventId, {
    include: [
      {
        model: Event,
        as: "childEvents",
        order: [["event_date", "ASC"]],
      },
    ],
  });

  return parentEvent;
}

// Get all recurring events for a user
async function getUserRecurringEvents(userId: string) {
  const recurringEvents = await Event.findAll({
    where: {
      user_id: userId,
      recurrence_rule: { [Op.ne]: null },
      parent_event_id: null, // Only parent events
    },
    include: [
      {
        model: Event,
        as: "childEvents",
      },
    ],
  });

  return recurringEvents;
}

// Get events in a date range (including recurring instances)
async function getEventsInRange(userId: string, startDate: Date, endDate: Date) {
  const { Op } = require("sequelize");

  const events = await Event.findAll({
    where: {
      user_id: userId,
      event_date: {
        [Op.between]: [startDate, endDate],
      },
    },
    include: [
      {
        model: Currency,
        as: "currency",
      },
    ],
    order: [["event_date", "ASC"]],
  });

  return events;
}
```

### Updating Recurring Events

```typescript
// Update single instance
async function updateRecurringInstance(instanceId: string, updates: Partial<EventAttributes>) {
  const instance = await Event.findByPk(instanceId);
  if (!instance) throw new Error("Instance not found");

  await instance.update(updates);
  return instance;
}

// Update all future instances
async function updateFutureInstances(instanceId: string, updates: Partial<EventAttributes>) {
  const instance = await Event.findByPk(instanceId);
  if (!instance || !instance.parent_event_id) {
    throw new Error("Not a recurring instance");
  }

  const { Op } = require("sequelize");

  // Update all instances after this one
  await Event.update(updates, {
    where: {
      parent_event_id: instance.parent_event_id,
      event_date: {
        [Op.gte]: instance.event_date,
      },
    },
  });
}

// Update all instances (including parent)
async function updateAllInstances(parentEventId: string, updates: Partial<EventAttributes>) {
  // Update parent
  await Event.update(updates, {
    where: { id: parentEventId },
  });

  // Update all children
  await Event.update(updates, {
    where: { parent_event_id: parentEventId },
  });
}
```

---

## Best Practices

### 1. Generate Limited Instances Initially

Don't generate all instances upfront. Generate the first 12 occurrences, then generate more as needed:

```typescript
// Generate next batch of instances
async function generateNextInstances(parentEventId: string, count: number = 12) {
  const parentEvent = await Event.findByPk(parentEventId);
  if (!parentEvent || !parentEvent.recurrence_rule) {
    throw new Error("Not a recurring event");
  }

  // Get last instance date
  const lastInstance = await Event.findOne({
    where: { parent_event_id: parentEventId },
    order: [["event_date", "DESC"]],
  });

  const startDate = lastInstance ? lastInstance.event_date : parentEvent.event_date;
  const rule = RRule.fromString(parentEvent.recurrence_rule);

  // Generate next occurrences
  const occurrences = rule.after(startDate, true).slice(0, count);

  // Create instances
  for (const occurrenceDate of occurrences) {
    await Event.create({
      user_id: parentEvent.user_id,
      type: parentEvent.type,
      amount: parentEvent.amount,
      currency_id: parentEvent.currency_id,
      description: parentEvent.description,
      event_date: occurrenceDate,
      parent_event_id: parentEvent.id,
    });
  }
}
```

### 2. Handle Exceptions

Allow users to skip or modify individual instances:

```typescript
// Skip an instance (soft delete)
async function skipInstance(instanceId: string) {
  const instance = await Event.findByPk(instanceId);
  if (!instance) throw new Error("Instance not found");

  await instance.destroy(); // Soft delete
}

// Modify an instance (breaks from series)
async function modifyInstance(instanceId: string, updates: Partial<EventAttributes>) {
  const instance = await Event.findByPk(instanceId);
  if (!instance) throw new Error("Instance not found");

  // Option 1: Update in place (keeps parent_event_id)
  await instance.update(updates);

  // Option 2: Break from series (remove parent_event_id)
  await instance.update({
    ...updates,
    parent_event_id: null,
  });
}
```

### 3. Validate RRULE

Always validate RRULE strings before saving:

```typescript
function validateRRule(ruleString: string): boolean {
  try {
    RRule.fromString(ruleString);
    return true;
  } catch (error) {
    return false;
  }
}
```

---

## Resources

- RFC 5545 Specification: https://tools.ietf.org/html/rfc5545
- rrule.js Documentation: https://github.com/jakubroztocil/rrule
- RRULE Tester: https://icalendar.org/rrule-tool.html
- Google Calendar RRULE: https://developers.google.com/calendar/api/v3/reference/events
