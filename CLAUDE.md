# Code Style Guide for ExpenseCal

This document outlines the code style and architecture patterns used throughout the ExpenseCal project. When making changes or adding new features, follow these patterns consistently.

## Table of Contents

1. [Context Controllers](#context-controllers)
2. [Route Centralization](#route-centralization)
3. [Date Handling](#date-handling)
4. [Database Models](#database-models)
5. [Database Migrations](#database-migrations)
6. [Next.js API Routes](#nextjs-api-routes)
7. [Design System](#design-system)

---

## Context Controllers

Context controllers manage React state and provide it to the application via React Context. They follow a consistent file structure.

### File Structure

Each context lives in its own directory: `@web/context/{ContextName}/`

Required files:
- `{ContextName}Context.tsx` - Creates and exports the context
- `{ContextName}Context.types.ts` - TypeScript type definitions
- `{ContextName}ContextController.tsx` - Provider component (marked with "use client")
- `use{ContextName}Context.tsx` - Custom hook for consuming the context

### Implementation Pattern

**{ContextName}Context.types.ts:**
```typescript
import { ReactNode } from "react";

export type {ContextName}ControllerProps = {
  children: ReactNode;
};

export type {ContextName}Type = {
  // Add context properties here
};
```

**{ContextName}Context.tsx:**
```typescript
import { createContext } from "react";
import { {ContextName}Type } from "./{ContextName}Context.types";

export const {ContextName}Context = createContext<{ContextName}Type | undefined>(
  undefined,
);
```

**{ContextName}ContextController.tsx:**
```typescript
"use client";

import { useState } from "react";
import { {ContextName}Context } from "./{ContextName}Context";
import {
  {ContextName}ControllerProps,
  {ContextName}Type,
} from "./{ContextName}Context.types";

export const {ContextName}ContextController = ({
  children,
}: {ContextName}ControllerProps) => {
  const [state, setState] = useState(/* initial state */);

  const props: {ContextName}Type = {
    // Define context value
  };

  return (
    <{ContextName}Context.Provider value={props}>
      {children}
    </{ContextName}Context.Provider>
  );
};
```

**use{ContextName}Context.tsx:**
```typescript
import { useContext } from "react";
import { {ContextName}Context } from "./{ContextName}Context";

export const use{ContextName}Context = () => {
  const context = useContext({ContextName}Context);

  if (context === undefined) {
    throw new Error("use{ContextName}Context must be used within {ContextName}Context");
  }

  return context;
};
```

### Registration

Add the context controller to `@web/app/providers.tsx` in the appropriate nesting order (typically in order of dependency).

---

## Route Centralization

All route strings (API endpoints and page routes) should be centralized using the `useRoutes` hook to maintain consistency and avoid hardcoding URLs throughout the codebase.

### Location

`@web/hooks/useRoutes/useRoutes.tsx` - Contains all route definitions organized by feature

### Usage Pattern

**In components and context controllers:**
```typescript
import { useRoutes } from "@/hooks/useRoutes/useRoutes";

export const MyComponent = () => {
  const routes = useRoutes();

  // Access routes via the structured object
  const calendarUrl = routes.api.v1.calendar.get();
  const eventUrl = routes.api.v1.events.detail(eventId);

  const response = await fetch(eventUrl);
};
```

### Benefits

- Single source of truth for all route definitions
- Easy to update routes without searching entire codebase
- Type-safe route access
- Organized structure makes it easy to find related endpoints

### Real-World Example

In `@web/context/Calendar/CalendarContextController.tsx` (line 21), the hook is imported and used:
```typescript
const routes = useRoutes();
const url = routes.api.v1.calendar.get();
const response = await fetch(url, { method: "GET" });
```

### Adding New Routes

When adding new API endpoints or pages, always add them to `useRoutes.tsx` first:

```typescript
export const routes = {
  home: () => `/`,
  api: {
    v1: {
      newFeature: {
        list: () => `/api/v1/new-feature`,
        detail: (id: string) => `/api/v1/new-feature/${encodeURIComponent(id)}`,
      },
    },
  },
};
```

---

## Date Handling

All date operations should use the centralized date utilities from `@web/lib/date` to maintain consistency and ensure UTC timezone handling across the application.

### Location

`@web/lib/date/` - Contains all date formatting, parsing, and manipulation utilities

### Usage Pattern

**In components:**
```typescript
import {
  toDateString,
  formatDateForDisplay,
  startOfMonth,
  endOfMonth,
  isSameDay,
} from "@web/lib/date";

export const MyComponent = () => {
  const today = new Date();

  // Format for display
  const displayDate = formatDateForDisplay(today); // "Jan 6, 2026"
  const dateOnly = toDateString(today); // "2026-01-06"

  // Get date boundaries
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  // Compare dates
  if (isSameDay(today, new Date())) {
    // Do something
  }
};
```

### Available Utilities

**Formatting:**
- `toDateString(date)` - Convert to YYYY-MM-DD format
- `toMonthString(date)` - Convert to YYYY-MM format
- `formatDateForDisplay(date, options?)` - Format for UI (e.g., "Jan 6, 2026")
- `formatDateShort(date)` - Short format (e.g., "Jan 6")

**Parsing:**
- `parseDateString(dateStr)` - Parse YYYY-MM-DD to Date object
- `parseMonthString(monthStr)` - Parse YYYY-MM or YYYYMM to start of month

**Date Boundaries:**
- `startOfDay(date)` - Get midnight UTC
- `endOfDay(date)` - Get 23:59:59.999 UTC
- `startOfMonth(date)` - Get first day of month at midnight UTC
- `endOfMonth(date)` - Get last day of month at 23:59:59.999 UTC
- `getWeekStart(date)` - Get Monday of the ISO week
- `getWeekEnd(date)` - Get Sunday of the ISO week

**Arithmetic:**
- `addDays(date, days)` - Add or subtract days
- `addMonths(date, months)` - Add or subtract months
- `getDaysDifference(date1, date2)` - Get days between dates
- `getDaysInMonth(date)` - Get number of days in a month

**Comparison:**
- `isSameDay(date1, date2)` - Check if dates are the same day
- `isSameMonth(date1, date2)` - Check if dates are in the same month
- `getWeekNumber(date)` - Get ISO week number (1-53)

### Key Points

- All functions work with **UTC** to maintain consistency across timezones
- Accept both `Date` objects and date strings as parameters
- Never use `Date.prototype.getMonth()`, `getDate()`, etc. directly - use UTC variants
- Use these utilities for any date formatting, parsing, or manipulation
- Never hardcode date formats or calculations in components

---

## Database Models

Database models use Sequelize ORM with TypeScript and represent tables in the PostgreSQL database.

### File Location

`@database/models/{ModelName}.ts`

### Implementation Pattern

```typescript
import { CreationOptional, DataTypes, Model, Sequelize } from "sequelize";

export interface {ModelName}Attributes {
  id?: string;
  // Add other properties here
  created_at?: Date;
  updated_at?: Date;
}

class {ModelName}
  extends Model<
    {ModelName}Attributes,
    Omit<{ModelName}Attributes, "id" | "created_at" | "updated_at">
  >
  implements {ModelName}Attributes
{
  declare id: CreationOptional<string>;
  // Add other properties with proper types
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof {ModelName} {
    const model = {ModelName}.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
          unique: true,
        },
        // Define other fields
        created_at: {
          type: DataTypes.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updated_at: {
          type: DataTypes.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      },
      {
        sequelize,
        tableName: "{table_name}",
        underscored: true,
        timestamps: false,
      },
    );

    return model;
  }

  static associate() {
    // Add model associations here (hasMany, belongsTo, etc.)
  }
}

export default {ModelName};
```

### Key Points

- Use `CreationOptional` for fields that are auto-generated (id, timestamps)
- Always use UUID with UUIDV4 default for primary keys
- Use `underscored: true` for snake_case column naming
- Set `timestamps: false` and manually define created_at/updated_at fields
- Implement the `associate()` method for relationships even if empty initially

---

## Database Migrations

Database migrations are versioned scripts that create and modify database schema.

### File Location

`@database/migrations/YYYYMMDDHHMMSS-{description}.js`

Naming convention: Timestamp + hyphenated description (e.g., `20251110000002-create-categories.js`)

### Implementation Pattern

```javascript
/* eslint-disable no-undef */
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("{table_name}", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: "Foreign key description",
      },
      field_name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Field description",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Add indexes for foreign keys and frequently queried fields
    await queryInterface.addIndex("{table_name}", ["user_id"]);
    await queryInterface.addIndex("{table_name}", ["field_name"]);
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable("{table_name}");
  },
};
```

### Key Points

- Include `/* eslint-disable no-undef */` and `"use strict";` at the top
- Add comments to foreign keys and important fields
- Always add indexes for foreign keys and commonly filtered fields
- Use UUID with UUIDV4 for primary keys
- Include timestamps with CURRENT_TIMESTAMP default
- Implement both `up()` and `down()` methods for rollback support

---

## Next.js API Routes

API endpoints follow a structured pattern with separate route handlers and type definitions.

### File Structure

Each API endpoint has:
- `route.ts` - Route handler (GET, POST, PUT, DELETE functions)
- `types.ts` - TypeScript types for requests and responses

### Implementation Pattern

**types.ts:**
```typescript
import { BaseErrorResponse, BaseSuccessResponse } from "../../v1/types";

export type GetRequestSuccessResponse = {
  data: {
    // Response data structure
  };
} & BaseSuccessResponse;

export type GetRequestErrorResponse = {
  details?: string;
  stage?: "validation" | "database" | "calculation";
} & BaseErrorResponse;

export type GetRequestResponse =
  | GetRequestSuccessResponse
  | GetRequestErrorResponse;
```

**route.ts:**
```typescript
import { stackServerApp } from "@/stack/server";
import db from "@expensecal/database/db";
import { initModels } from "@expensecal/database/models";
import { NextResponse } from "next/server";
import { GetRequestResponse } from "./types";

/**
 * GET /api/v2/endpoint
 * Brief description of what the endpoint does
 * Protected endpoint (requires authentication)
 *
 * Optional: Additional details about behavior, response structure, etc.
 */
export async function GET(): Promise<NextResponse<GetRequestResponse>> {
  try {
    // Authenticate user
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "You must be logged in to access this endpoint",
        },
        { status: 401 },
      );
    }

    // Initialize database models
    initModels(db);

    // Business logic here
    const data = await fetchData(user.id);

    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
        stage: "calculation",
      },
      { status: 500 },
    );
  }
}
```

### Key Points

- Include JSDoc comments with route path, description, and authentication requirements
- Always authenticate users with `stackServerApp.getUser()`
- Initialize models with `initModels(db)`
- Use appropriate HTTP status codes (200, 401, 404, 500)
- Return typed responses using NextResponse
- Differentiate error stages (validation, database, calculation) in responses
- Keep route handlers focused; move complex logic to service layers

---

## Design System

### UI Components

- **Framework**: HeroUI (`@heroui/system`)
- **Icons**: lucide-react (`lucide-react`)
- **Styling**: Tailwind CSS with Tailwind Variants

### Component Usage

When building UI components:
1. Import UI components from `@heroui/*` packages
2. Use lucide-react for all icons
3. Apply Tailwind classes for custom styling
4. Follow HeroUI's component props and patterns

### Color & Icons

- Use HeroUI's built-in color system (primary, secondary, success, warning, danger, etc.)
- Import icons from `lucide-react`: `import { IconName } from "lucide-react"`

---

## General Guidelines

- Use TypeScript for all new code
- Keep files focused on a single responsibility
- Add JSDoc comments for complex functions and API endpoints
- Use snake_case for database column names (Sequelize handles underscored conversion)
- Use camelCase for JavaScript variables and functions
- Use PascalCase for component and class names
- Always handle errors with try-catch in async operations
- Include proper type definitions; avoid `any`
