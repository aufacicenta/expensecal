# ExpenseCal

ExpenseCal is a SaaS that lets a person or AI Agent create calendar events for financial forecasting or expense tracking, among other use cases. This is not another calendar service, it is a financial tool.

## Examples

_100 USD for yesterday's dinner with friends_

Will be parsed by the ExpenseCal system in parts: 100 (amount), USD (currency), yesterday (datetime), dinner with friends (description)

_3500 MXN for a new cheap cellphone next year_

This a future event example picking up the same parts as before, but put as an event in the future, perhaps inferred as January of the next year. This inference is made by AI models tailored for these kind of events.

_12000 euros in 10 monthly installments for my new bike_

The system creates 10 calendar events associated to a parent total amount record of EUR currency for the purpose as described by the user.

## Feature Plan

### 1. Authentication

**✅ COMPLETED - Using Neon Auth with Stackframe**

This project uses [Neon Auth](https://neon.tech/docs/guides/neon-authorize) with [Stackframe](https://stackframe.co/) for complete authentication functionality. Stackframe provides a pre-built authentication system with a `neon_auth` schema and `users` table, handling all sign-up, sign-in, email verification, password reset, and session management out of the box.

#### 1.1 Sign Up Page

- [x] **Database Model Definition**: ✅ Handled by Stackframe with Neon Auth schema
- [x] **Database Model Tests**: ✅ Not required - using Stackframe's tested implementation
- [x] **Database Migration**: ✅ Handled by Stackframe initialization
- [x] **API Endpoint - Sign Up**: ✅ Provided by Stackframe
- [x] **API Types - Sign Up**: ✅ Provided by Stackframe
- [x] **useRoutes Hook Update**: ✅ Stackframe provides auth routes
- [x] **Sign Up Page UI**: ✅ Provided by Stackframe
- [x] **Auth Context Controller**: ✅ Provided by Stackframe
- [x] **Auth Context Types**: ✅ Provided by Stackframe
- [x] **E2E Tests - Sign Up**: ✅ Stackframe handles authentication flows

#### 1.2 Sign In Page

- [x] **API Endpoint - Sign In**: ✅ Provided by Stackframe
- [x] **API Types - Sign In**: ✅ Provided by Stackframe
- [x] **Session Model**: ✅ Handled by Stackframe with Neon Auth
- [x] **Session Model Tests**: ✅ Not required - using Stackframe's tested implementation
- [x] **Session Migration**: ✅ Handled by Stackframe initialization
- [x] **useRoutes Hook Update**: ✅ Stackframe provides auth routes
- [x] **Sign In Page UI**: ✅ Provided by Stackframe
- [x] **Auth Context - Sign In**: ✅ Provided by Stackframe
- [x] **E2E Tests - Sign In**: ✅ Stackframe handles authentication flows

#### 1.3 Email Verification

- [x] **API Endpoint - Verify Email**: ✅ Provided by Stackframe
- [x] **API Types - Verify Email**: ✅ Provided by Stackframe
- [x] **Email Service Utility**: ✅ Provided by Stackframe
- [x] **useRoutes Hook Update**: ✅ Stackframe provides auth routes
- [x] **Verification Page UI**: ✅ Provided by Stackframe
- [x] **Auth Context - Verification**: ✅ Provided by Stackframe
- [x] **E2E Tests - Verification**: ✅ Stackframe handles authentication flows

#### 1.4 Password Reset

- [x] **Password Reset Token Model**: ✅ Handled by Stackframe with Neon Auth
- [x] **Migration - Password Reset**: ✅ Handled by Stackframe initialization
- [x] **API Endpoint - Request Reset**: ✅ Provided by Stackframe
- [x] **API Endpoint - Reset Password**: ✅ Provided by Stackframe
- [x] **API Types - Password Reset**: ✅ Provided by Stackframe
- [x] **Email Service - Reset**: ✅ Provided by Stackframe
- [x] **useRoutes Hook Update**: ✅ Stackframe provides auth routes
- [x] **Request Reset Page UI**: ✅ Provided by Stackframe
- [x] **Reset Password Page UI**: ✅ Provided by Stackframe
- [x] **Auth Context - Password Reset**: ✅ Provided by Stackframe
- [x] **E2E Tests - Password Reset**: ✅ Stackframe handles authentication flows

#### 1.5 Protected Routes & Middleware

- [x] **Auth Middleware**: ✅ Provided by Stackframe
- [x] **Auth Utility Functions**: ✅ Provided by Stackframe (useUser, useStackApp hooks)
- [x] **useAuth Hook**: ✅ Provided by Stackframe (useUser hook)
- [x] **Protected Route Component**: ✅ Can be built using Stackframe's useUser hook
- [x] **E2E Tests - Protected Routes**: ✅ Stackframe handles authentication flows

**Note**: For ExpenseCal-specific user data beyond authentication (preferences, settings, etc.), we will create additional models that reference the Stackframe user ID as a foreign key.

### 2. Expense Event Management

Core functionality for creating, parsing, and managing expense calendar events.

#### 2.1 Event Model

- [x] **Event Model**: Create `./database/models/Event.ts` with fields: `id`, `user_id` (FK to neon_auth.users_sync), `type` (EXPENSE/INCOME), `amount` (DECIMAL 28,8 for crypto), `currency_id` (FK to currencies), `description`, `event_date`, `parent_event_id` (for recurring events), `recurrence_rule` (RFC 5545 RRULE), `recurrence_end_date`, `created_at`, `updated_at`, `deleted_at` (soft deletes)
- [x] **EventInstallment Model**: Create `./database/models/EventInstallment.ts` junction table with fields: `id`, `parent_event_id` (FK to events), `installment_event_id` (FK to events), `created_at`. Installments are Events themselves, tracked via this junction table.
- [x] **Currency Model**: Already created in `./database/models/Currency.ts` with fields: `id`, `symbol`, `name`, `decimal_units`
- [x] **Event Model Tests**: Create `./database/__tests__/Event.test.ts` with comprehensive tests for: event creation, recurring events, associations, soft deletes, queries and filters
- [x] **EventInstallment Model Tests**: Create `./database/__tests__/EventInstallment.test.ts` with tests for: installment relationships, cascade deletes, complex queries
- [x] **Database Migrations**: Created migrations for `currencies`, `events`, and `event_installments` tables with proper indexes and foreign keys
- [x] **Currency Seeder**: Created seeder with common currencies (USD, EUR, GBP, MXN, JPY, BTC, ETH, CAD, AUD, CHF)
- [x] **Models Index Update**: Updated `./database/models/index.ts` to include Currency, Event, and EventInstallment with proper associations

**Design Notes**:
- Event type is ENUM ('EXPENSE', 'INCOME') - TRANSFER type deferred for later
- Amount uses DECIMAL(28,8) to support crypto precision (8 decimals)
- Recurring events use RFC 5545 RRULE format (compatible with Google Calendar)
- Installments are Events themselves, linked via EventInstallment junction table
- Soft deletes enabled via `deleted_at` field (paranoid mode)
- All timestamps stored in UTC
- Integration tracking (created_via, synced_to_google) deferred to separate model
- Categories deferred to Feature 7

#### 2.2 Natural Language Parser

- [ ] **Parser Service**: Create `./web/lib/parser/expenseParser.ts` with functions to extract: amount, currency, date/time, description from natural language
- [ ] **Parser Tests**: Create `./web/__tests__/lib/parser/expenseParser.test.ts` with test cases for various input formats
- [ ] **Date Parser Utility**: Create `./web/lib/parser/dateParser.ts` for parsing relative dates (yesterday, next year, etc.)
- [ ] **Amount Parser Utility**: Create `./web/lib/parser/amountParser.ts` for extracting numeric amounts and currencies

#### 2.3 Create Expense Event API

- [ ] **API Endpoint - Create Event**: Create `./web/app/api/v1/events/create/route.ts` with POST handler
- [ ] **API Types - Create Event**: Create `./web/app/api/v1/events/create/types.ts` with request/response types
- [ ] **API Endpoint - Parse Text**: Create `./web/app/api/v1/events/parse/route.ts` for parsing natural language input
- [ ] **API Types - Parse Text**: Create `./web/app/api/v1/events/parse/types.ts`
- [ ] **useRoutes Hook Update**: Add event creation and parsing routes
- [ ] **E2E Tests - Create Event**: Create Cypress test for: manual event creation, parsed event creation, validation errors

#### 2.4 Installment Events

- [ ] **Installment Logic**: Create `./web/lib/events/createInstallments.ts` for generating multiple events from parent
- [ ] **API Endpoint - Create Installments**: Create `./web/app/api/v1/events/installments/route.ts`
- [ ] **API Types - Installments**: Create types file for installment creation
- [ ] **useRoutes Hook Update**: Add installments route
- [ ] **E2E Tests - Installments**: Create Cypress test for: creating installment series, parent-child relationship validation, installment calculation accuracy

#### 2.5 List & Filter Events

- [ ] **API Endpoint - List Events**: Create `./web/app/api/v1/events/list/route.ts` with GET handler supporting filters (date range, currency, user_id)
- [ ] **API Types - List Events**: Create `./web/app/api/v1/events/list/types.ts` with query parameters and response types
- [ ] **API Endpoint - Get Event**: Create `./web/app/api/v1/events/[id]/route.ts` for single event retrieval
- [ ] **useRoutes Hook Update**: Add list and get event routes
- [ ] **E2E Tests - List Events**: Create Cypress test for: listing all events, filtering by date range, filtering by currency, pagination

#### 2.6 Update & Delete Events

- [ ] **API Endpoint - Update Event**: Add PUT handler to `./web/app/api/v1/events/[id]/route.ts`
- [ ] **API Endpoint - Delete Event**: Add DELETE handler to `./web/app/api/v1/events/[id]/route.ts`
- [ ] **API Types - Update/Delete**: Update types file with update request and delete response types
- [ ] **Cascade Delete Logic**: Implement logic for handling deletion of parent events with installments
- [ ] **useRoutes Hook Update**: Add update and delete routes
- [ ] **E2E Tests - Update/Delete**: Create Cypress test for: updating event details, deleting single event, deleting parent with installments

### 3. User Dashboard

Main interface for users to view, manage, and analyze their expense events.

#### 3.1 Dashboard Layout

- [ ] **Dashboard Page**: Create `./web/app/dashboard/page.tsx` with main dashboard layout
- [ ] **Dashboard Context Controller**: Create `./web/context/Dashboard/DashboardContextController.tsx` for dashboard state management
- [ ] **Dashboard Context Types**: Create `./web/context/Dashboard/DashboardContext.types.ts`
- [ ] **Dashboard Provider**: Add DashboardContextController to providers chain in dashboard page
- [ ] **useRoutes Hook Update**: Add dashboard route

#### 3.2 Event Input Component

- [ ] **Event Input Component**: Create `./web/components/EventInput/EventInput.tsx` with natural language text input using @heroui
- [ ] **Event Input Types**: Create `./web/components/EventInput/EventInput.types.ts`
- [ ] **Real-time Parser Preview**: Add preview functionality showing parsed components before submission
- [ ] **Dashboard Context - Create Event**: Add createEvent function to DashboardContextController with toast notifications
- [ ] **E2E Tests - Event Input**: Create Cypress test for: text input, parser preview, successful submission, error handling

#### 3.3 Calendar View

- [ ] **Calendar Component**: Create `./web/components/Calendar/Calendar.tsx` for displaying events in calendar format
- [ ] **Calendar Types**: Create `./web/components/Calendar/Calendar.types.ts`
- [ ] **Calendar Library Integration**: Install and configure a calendar library (e.g., react-big-calendar or @fullcalendar)
- [ ] **Event Display Logic**: Implement logic to display events on calendar with color coding by currency or category
- [ ] **Dashboard Context - Load Events**: Add loadEvents function to fetch events for calendar view
- [ ] **E2E Tests - Calendar View**: Create Cypress test for: calendar rendering, event display, date navigation, event click interaction

#### 3.4 Event List View

- [ ] **Event List Component**: Create `./web/components/EventList/EventList.tsx` for tabular event display
- [ ] **Event List Types**: Create `./web/components/EventList/EventList.types.ts`
- [ ] **Event List Item Component**: Create `./web/components/EventListItem/EventListItem.tsx` for individual event rows
- [ ] **Sorting & Filtering UI**: Add UI controls for sorting (date, amount) and filtering (currency, date range)
- [ ] **Dashboard Context - Filter/Sort**: Add filtering and sorting state management
- [ ] **E2E Tests - Event List**: Create Cypress test for: list rendering, sorting functionality, filtering functionality, pagination

#### 3.5 Event Details Modal

- [ ] **Event Details Modal**: Create `./web/components/EventDetailsModal/EventDetailsModal.tsx` using @heroui Modal
- [ ] **Event Details Types**: Create `./web/components/EventDetailsModal/EventDetailsModal.types.ts`
- [ ] **Edit Event Form**: Add inline editing capability within modal
- [ ] **Delete Confirmation**: Add delete confirmation dialog
- [ ] **Dashboard Context - Update/Delete**: Add updateEvent and deleteEvent functions with toast notifications
- [ ] **E2E Tests - Event Details**: Create Cypress test for: modal open/close, view details, edit event, delete event

#### 3.6 Analytics & Summary

- [ ] **Analytics Component**: Create `./web/components/Analytics/Analytics.tsx` for expense summaries and charts
- [ ] **Analytics Types**: Create `./web/components/Analytics/Analytics.types.ts`
- [ ] **Chart Library Integration**: Install and configure a charting library (e.g., recharts or chart.js)
- [ ] **Summary Cards**: Create components for total expenses, expenses by currency, upcoming expenses
- [ ] **API Endpoint - Analytics**: Create `./web/app/api/v1/analytics/summary/route.ts` for aggregated data
- [ ] **API Types - Analytics**: Create `./web/app/api/v1/analytics/summary/types.ts`
- [ ] **useRoutes Hook Update**: Add analytics route
- [ ] **Dashboard Context - Analytics**: Add loadAnalytics function
- [ ] **E2E Tests - Analytics**: Create Cypress test for: summary display, chart rendering, date range filtering

### 4. Google Calendar Integration

Connect Google Calendar accounts to sync expense events as calendar entries.

#### 4.1 Google OAuth Setup

- [ ] **Google OAuth Config**: Create `./web/lib/integrations/google/config.ts` with OAuth client configuration
- [ ] **OAuth Token Model**: Create `./database/models/OAuthToken.ts` with fields: `id`, `user_id` (FK), `provider` (enum), `access_token`, `refresh_token`, `expires_at`, `created_at`, `updated_at`
- [ ] **OAuth Token Tests**: Create `./database/__tests__/OAuthToken.test.ts`
- [ ] **OAuth Token Migration**: Generate migration for `oauth_tokens` table
- [ ] **Environment Variables**: Document required Google OAuth credentials in README

#### 4.2 Google Calendar Connection

- [ ] **API Endpoint - OAuth Initiate**: Create `./web/app/api/v1/integrations/google/auth/route.ts` for OAuth flow initiation
- [ ] **API Endpoint - OAuth Callback**: Create `./web/app/api/v1/integrations/google/callback/route.ts` for handling OAuth callback
- [ ] **API Types - Google Auth**: Create types files for Google OAuth endpoints
- [ ] **Google Calendar Service**: Create `./web/lib/integrations/google/calendarService.ts` with functions to interact with Google Calendar API
- [ ] **useRoutes Hook Update**: Add Google OAuth routes
- [ ] **E2E Tests - OAuth Flow**: Create Cypress test for: OAuth initiation, callback handling, token storage

#### 4.3 Calendar Sync Configuration

- [ ] **Calendar Connection Model**: Create `./database/models/CalendarConnection.ts` with fields: `id`, `user_id` (FK), `provider`, `calendar_id`, `calendar_name`, `sync_enabled`, `last_sync_at`, `created_at`, `updated_at`
- [ ] **Calendar Connection Tests**: Create `./database/__tests__/CalendarConnection.test.ts`
- [ ] **Calendar Connection Migration**: Generate migration for `calendar_connections` table
- [ ] **API Endpoint - List Calendars**: Create `./web/app/api/v1/integrations/google/calendars/route.ts` to fetch user's Google calendars
- [ ] **API Endpoint - Connect Calendar**: Create `./web/app/api/v1/integrations/google/connect/route.ts` to link a specific calendar
- [ ] **API Types - Calendar Connection**: Create types files for calendar connection endpoints
- [ ] **useRoutes Hook Update**: Add calendar connection routes

#### 4.4 Event Sync to Google Calendar

- [ ] **Sync Service**: Create `./web/lib/integrations/google/syncService.ts` for bidirectional sync logic
- [ ] **API Endpoint - Sync Events**: Create `./web/app/api/v1/integrations/google/sync/route.ts` for manual sync trigger
- [ ] **API Types - Sync**: Create `./web/app/api/v1/integrations/google/sync/types.ts`
- [ ] **Event Mapping Logic**: Create utility to map ExpenseEvent to Google Calendar event format
- [ ] **Sync Status Tracking**: Add sync status fields to ExpenseEvent model (synced_to_google, google_event_id)
- [ ] **Sync Status Migration**: Generate migration to add sync tracking fields
- [ ] **useRoutes Hook Update**: Add sync route
- [ ] **E2E Tests - Event Sync**: Create Cypress test for: creating event and syncing to Google, updating synced event, deleting synced event

#### 4.5 Integration Settings UI

- [ ] **Integrations Page**: Create `./web/app/dashboard/integrations/page.tsx` for managing integrations
- [ ] **Google Integration Component**: Create `./web/components/GoogleIntegration/GoogleIntegration.tsx` with connection status and controls
- [ ] **Google Integration Types**: Create `./web/components/GoogleIntegration/GoogleIntegration.types.ts`
- [ ] **Integrations Context Controller**: Create `./web/context/Integrations/IntegrationsContextController.tsx`
- [ ] **Integrations Context Types**: Create `./web/context/Integrations/IntegrationsContext.types.ts`
- [ ] **Calendar Selection UI**: Add UI for selecting which Google calendar to sync with
- [ ] **Disconnect Integration**: Add functionality to disconnect and remove OAuth tokens
- [ ] **useRoutes Hook Update**: Add integrations page route
- [ ] **E2E Tests - Integration UI**: Create Cypress test for: viewing integration status, connecting Google Calendar, selecting calendar, disconnecting integration

### 5. Telegram Bot Integration

Allow users to create expense events by sending messages to @ExpenseCalBot on Telegram.

#### 5.1 Telegram Bot Setup

- [ ] **Telegram Bot Config**: Create `./web/lib/integrations/telegram/config.ts` with bot token configuration
- [ ] **Telegram User Model**: Create `./database/models/TelegramUser.ts` with fields: `id`, `user_id` (FK), `telegram_id`, `telegram_username`, `chat_id`, `is_active`, `created_at`, `updated_at`
- [ ] **Telegram User Tests**: Create `./database/__tests__/TelegramUser.test.ts`
- [ ] **Telegram User Migration**: Generate migration for `telegram_users` table
- [ ] **Environment Variables**: Document required Telegram bot token in README

#### 5.2 Telegram Webhook Handler

- [ ] **API Endpoint - Telegram Webhook**: Create `./web/app/api/v1/integrations/telegram/webhook/route.ts` for receiving Telegram updates
- [ ] **API Types - Telegram Webhook**: Create `./web/app/api/v1/integrations/telegram/webhook/types.ts`
- [ ] **Telegram Service**: Create `./web/lib/integrations/telegram/telegramService.ts` with functions to send messages and handle commands
- [ ] **Webhook Verification**: Implement Telegram webhook signature verification
- [ ] **useRoutes Hook Update**: Add Telegram webhook route

#### 5.3 Telegram Bot Commands

- [ ] **/start Command Handler**: Implement user registration flow linking Telegram account to ExpenseCal user
- [ ] **/help Command Handler**: Implement help message with usage instructions
- [ ] **/status Command Handler**: Implement status check showing recent events
- [ ] **Message Parser Integration**: Connect Telegram message handler to expense parser service
- [ ] **Command Router**: Create routing logic for different Telegram commands
- [ ] **E2E Tests - Bot Commands**: Create tests for: /start command, /help command, /status command

#### 5.4 Telegram Account Linking

- [ ] **API Endpoint - Generate Link Code**: Create `./web/app/api/v1/integrations/telegram/link/route.ts` for generating one-time link codes
- [ ] **API Types - Link Code**: Create types file for link code generation
- [ ] **Link Code Verification**: Implement verification logic in /start command handler
- [ ] **Telegram Settings UI**: Create `./web/components/TelegramIntegration/TelegramIntegration.tsx` in integrations page
- [ ] **Telegram Integration Types**: Create `./web/components/TelegramIntegration/TelegramIntegration.types.ts`
- [ ] **QR Code Generation**: Add QR code for easy mobile linking
- [ ] **useRoutes Hook Update**: Add Telegram link route
- [ ] **E2E Tests - Account Linking**: Create Cypress test for: generating link code, displaying QR code, successful linking confirmation

#### 5.5 Telegram Event Creation

- [ ] **Message Handler**: Implement natural language processing for Telegram messages
- [ ] **Event Creation via Telegram**: Connect message handler to event creation API
- [ ] **Confirmation Messages**: Send confirmation messages with event details after creation
- [ ] **Error Handling**: Send user-friendly error messages for invalid inputs
- [ ] **Telegram Context in Events**: Add `created_via` field to ExpenseEvent model to track source (web/telegram)
- [ ] **Created Via Migration**: Generate migration to add source tracking field
- [ ] **E2E Tests - Telegram Events**: Create tests for: creating event via Telegram, receiving confirmation, handling invalid input

#### 5.6 Telegram Notifications

- [ ] **Notification Service**: Create `./web/lib/integrations/telegram/notificationService.ts` for sending notifications
- [ ] **Daily Summary**: Implement scheduled job to send daily expense summaries
- [ ] **Upcoming Events Reminder**: Implement reminders for upcoming expense events
- [ ] **Notification Preferences Model**: Add notification preferences to TelegramUser model
- [ ] **Notification Preferences Migration**: Generate migration for notification settings
- [ ] **API Endpoint - Notification Settings**: Create `./web/app/api/v1/integrations/telegram/notifications/route.ts`
- [ ] **API Types - Notifications**: Create types file for notification settings
- [ ] **Notification Settings UI**: Add notification preferences to Telegram integration component
- [ ] **useRoutes Hook Update**: Add notification settings route
- [ ] **E2E Tests - Notifications**: Create tests for: updating notification preferences, receiving daily summary, receiving reminders

### 6. Recurring Events

Support for recurring expense events (monthly subscriptions, weekly expenses, etc.).

#### 6.1 Recurrence Pattern Model

- [ ] **Recurrence Pattern Enum**: Create `./database/types/RecurrencePattern.ts` with patterns: DAILY, WEEKLY, MONTHLY, YEARLY, CUSTOM
- [ ] **Recurrence Fields**: Add recurrence fields to ExpenseEvent model: `recurrence_frequency`, `recurrence_interval`, `recurrence_end_date`, `recurrence_count`
- [ ] **Recurrence Migration**: Generate migration to add recurrence fields to expense_events table
- [ ] **Recurrence Tests**: Add tests to ExpenseEvent.test.ts for recurrence validation

#### 6.2 Recurring Event Creation

- [ ] **Recurrence Logic**: Create `./web/lib/events/recurrenceService.ts` for generating recurring event instances
- [ ] **API Endpoint - Create Recurring**: Update create event endpoint to handle recurrence parameters
- [ ] **API Types - Recurrence**: Update create event types to include recurrence options
- [ ] **Recurrence Parser**: Update natural language parser to detect recurrence patterns (e.g., "every month", "weekly")
- [ ] **E2E Tests - Create Recurring**: Create Cypress test for: creating daily recurring event, creating monthly recurring event, creating event with end date

#### 6.3 Recurring Event Management

- [ ] **API Endpoint - Update Recurring**: Create `./web/app/api/v1/events/recurring/[id]/route.ts` with options to update single instance or all future instances
- [ ] **API Types - Update Recurring**: Create types file for recurring event updates
- [ ] **Delete Recurring Options**: Implement delete options (this instance, this and future, all instances)
- [ ] **Recurrence Exception Tracking**: Create mechanism to track modified/deleted instances
- [ ] **useRoutes Hook Update**: Add recurring event management routes
- [ ] **E2E Tests - Manage Recurring**: Create Cypress test for: updating single instance, updating all instances, deleting with different options

#### 6.4 Recurring Event UI

- [ ] **Recurrence Input Component**: Create `./web/components/RecurrenceInput/RecurrenceInput.tsx` for configuring recurrence patterns
- [ ] **Recurrence Input Types**: Create `./web/components/RecurrenceInput/RecurrenceInput.types.ts`
- [ ] **Recurrence Display**: Add visual indicators in calendar and list views for recurring events
- [ ] **Recurrence Edit Modal**: Update EventDetailsModal to show recurrence options when editing
- [ ] **Dashboard Context - Recurrence**: Add recurrence handling to dashboard context functions
- [ ] **E2E Tests - Recurrence UI**: Create Cypress test for: setting recurrence pattern, viewing recurring events, editing recurrence settings

### 7. Categories & Tags

Organize expense events with categories and custom tags.

#### 7.1 Category Model

- [ ] **Category Model**: Create `./database/models/Category.ts` with fields: `id`, `user_id` (FK), `name`, `color`, `icon`, `is_default`, `created_at`, `updated_at`
- [ ] **Category Tests**: Create `./database/__tests__/Category.test.ts`
- [ ] **Category Migration**: Generate migration for `categories` table
- [ ] **Default Categories Seeder**: Create seeder for default categories (Food, Transport, Entertainment, Bills, etc.)

#### 7.2 Event-Category Association

- [ ] **Add Category Field**: Add `category_id` (FK, nullable) to ExpenseEvent model
- [ ] **Category Association Migration**: Generate migration to add category_id to expense_events table
- [ ] **Category Association Tests**: Add tests for event-category relationship
- [ ] **API Endpoint - List Categories**: Create `./web/app/api/v1/categories/route.ts` for CRUD operations
- [ ] **API Types - Categories**: Create `./web/app/api/v1/categories/types.ts`
- [ ] **useRoutes Hook Update**: Add categories routes

#### 7.3 Tag Model

- [ ] **Tag Model**: Create `./database/models/Tag.ts` with fields: `id`, `user_id` (FK), `name`, `color`, `created_at`, `updated_at`
- [ ] **Tag Tests**: Create `./database/__tests__/Tag.test.ts`
- [ ] **Tag Migration**: Generate migration for `tags` table
- [ ] **EventTag Junction Model**: Create `./database/models/EventTag.ts` for many-to-many relationship
- [ ] **EventTag Tests**: Create `./database/__tests__/EventTag.test.ts`
- [ ] **EventTag Migration**: Generate migration for `event_tags` junction table

#### 7.4 Category & Tag Management API

- [ ] **API Endpoint - Create Category**: Add POST handler to categories route
- [ ] **API Endpoint - Update Category**: Add PUT handler to categories route
- [ ] **API Endpoint - Delete Category**: Add DELETE handler to categories route
- [ ] **API Endpoint - Tag Operations**: Create `./web/app/api/v1/tags/route.ts` for tag CRUD
- [ ] **API Types - Tags**: Create `./web/app/api/v1/tags/types.ts`
- [ ] **API Endpoint - Assign Tags**: Create endpoint for assigning/removing tags from events
- [ ] **useRoutes Hook Update**: Add tag management routes
- [ ] **E2E Tests - Category/Tag API**: Create tests for: creating category, updating category, deleting category, tag operations

#### 7.5 Category & Tag UI

- [ ] **Category Manager Component**: Create `./web/components/CategoryManager/CategoryManager.tsx` for managing categories
- [ ] **Category Manager Types**: Create `./web/components/CategoryManager/CategoryManager.types.ts`
- [ ] **Tag Manager Component**: Create `./web/components/TagManager/TagManager.tsx` for managing tags
- [ ] **Tag Manager Types**: Create `./web/components/TagManager/TagManager.types.ts`
- [ ] **Category Selector**: Create `./web/components/CategorySelector/CategorySelector.tsx` for event forms
- [ ] **Tag Input**: Create `./web/components/TagInput/TagInput.tsx` with autocomplete for event forms
- [ ] **Categories Context Controller**: Create `./web/context/Categories/CategoriesContextController.tsx`
- [ ] **Categories Context Types**: Create `./web/context/Categories/CategoriesContext.types.ts`
- [ ] **Filter by Category/Tag**: Add category and tag filters to event list and calendar views
- [ ] **E2E Tests - Category/Tag UI**: Create Cypress test for: creating category, assigning category to event, creating tag, filtering by category/tag

### 8. Multi-Currency Support

Handle multiple currencies with conversion and reporting.

#### 8.1 Currency Model & Exchange Rates

- [ ] **Currency Model**: Create `./database/models/Currency.ts` with fields: `code` (PK), `name`, `symbol`, `is_active`, `updated_at`
- [ ] **Currency Tests**: Create `./database/__tests__/Currency.test.ts`
- [ ] **Currency Migration**: Generate migration for `currencies` table
- [ ] **Currency Seeder**: Create seeder for common currencies (USD, EUR, GBP, MXN, JPY, etc.)
- [ ] **ExchangeRate Model**: Create `./database/models/ExchangeRate.ts` with fields: `id`, `from_currency`, `to_currency`, `rate`, `date`, `created_at`
- [ ] **ExchangeRate Tests**: Create `./database/__tests__/ExchangeRate.test.ts`
- [ ] **ExchangeRate Migration**: Generate migration for `exchange_rates` table

#### 8.2 Exchange Rate Service

- [ ] **Exchange Rate API Integration**: Create `./web/lib/currency/exchangeRateService.ts` to fetch rates from external API (e.g., exchangerate-api.com)
- [ ] **Rate Caching**: Implement caching mechanism for exchange rates
- [ ] **API Endpoint - Get Rates**: Create `./web/app/api/v1/currency/rates/route.ts` for fetching current rates
- [ ] **API Types - Rates**: Create `./web/app/api/v1/currency/rates/types.ts`
- [ ] **Scheduled Rate Updates**: Implement scheduled job to update exchange rates daily
- [ ] **useRoutes Hook Update**: Add currency rates route
- [ ] **E2E Tests - Exchange Rates**: Create tests for: fetching rates, rate caching, rate updates

#### 8.3 Currency Conversion

- [ ] **Conversion Utility**: Create `./web/lib/currency/convert.ts` for converting amounts between currencies
- [ ] **API Endpoint - Convert**: Create `./web/app/api/v1/currency/convert/route.ts` for currency conversion
- [ ] **API Types - Convert**: Create `./web/app/api/v1/currency/convert/types.ts`
- [ ] **User Base Currency**: Add `base_currency` field to User model
- [ ] **Base Currency Migration**: Generate migration to add base_currency to users table
- [ ] **useRoutes Hook Update**: Add conversion route
- [ ] **E2E Tests - Conversion**: Create tests for: converting between currencies, handling conversion errors

#### 8.4 Multi-Currency Analytics

- [ ] **API Endpoint - Multi-Currency Summary**: Update analytics endpoint to support multi-currency aggregation
- [ ] **Currency Breakdown Component**: Create `./web/components/CurrencyBreakdown/CurrencyBreakdown.tsx` showing expenses by currency
- [ ] **Currency Breakdown Types**: Create `./web/components/CurrencyBreakdown/CurrencyBreakdown.types.ts`
- [ ] **Converted Total Display**: Add option to view all expenses converted to base currency
- [ ] **Currency Filter**: Add currency filter to analytics and reports
- [ ] **E2E Tests - Multi-Currency Analytics**: Create tests for: viewing expenses by currency, viewing converted totals, filtering by currency

#### 8.5 Currency Settings UI

- [ ] **Currency Settings Page**: Create `./web/app/dashboard/settings/currency/page.tsx`
- [ ] **Base Currency Selector**: Add UI for selecting user's base currency
- [ ] **Currency List Component**: Create component showing available currencies with enable/disable toggle
- [ ] **Currency Context Controller**: Create `./web/context/Currency/CurrencyContextController.tsx`
- [ ] **Currency Context Types**: Create `./web/context/Currency/CurrencyContext.types.ts`
- [ ] **API Endpoint - Update Base Currency**: Create endpoint for updating user's base currency
- [ ] **API Types - Currency Settings**: Create types file for currency settings
- [ ] **useRoutes Hook Update**: Add currency settings routes
- [ ] **E2E Tests - Currency Settings**: Create Cypress test for: selecting base currency, viewing currency list, updating settings

### 9. Budgets & Forecasting

Set budgets and forecast future expenses.

#### 9.1 Budget Model

- [ ] **Budget Model**: Create `./database/models/Budget.ts` with fields: `id`, `user_id` (FK), `name`, `amount`, `currency`, `period` (WEEKLY, MONTHLY, YEARLY), `category_id` (FK, nullable), `start_date`, `end_date`, `created_at`, `updated_at`
- [ ] **Budget Tests**: Create `./database/__tests__/Budget.test.ts`
- [ ] **Budget Migration**: Generate migration for `budgets` table
- [ ] **Budget Period Enum**: Create `./database/types/BudgetPeriod.ts`

#### 9.2 Budget Management API

- [ ] **API Endpoint - Create Budget**: Create `./web/app/api/v1/budgets/route.ts` with POST handler
- [ ] **API Endpoint - List Budgets**: Add GET handler to budgets route
- [ ] **API Endpoint - Update Budget**: Add PUT handler to budgets route
- [ ] **API Endpoint - Delete Budget**: Add DELETE handler to budgets route
- [ ] **API Types - Budgets**: Create `./web/app/api/v1/budgets/types.ts`
- [ ] **useRoutes Hook Update**: Add budget management routes
- [ ] **E2E Tests - Budget API**: Create tests for: creating budget, listing budgets, updating budget, deleting budget

#### 9.3 Budget Tracking

- [ ] **Budget Progress Calculation**: Create `./web/lib/budgets/calculateProgress.ts` for tracking spending against budgets
- [ ] **API Endpoint - Budget Status**: Create `./web/app/api/v1/budgets/status/route.ts` for current budget status
- [ ] **API Types - Budget Status**: Create types file for budget status
- [ ] **Budget Alert Logic**: Implement logic to detect when budget thresholds are reached (50%, 75%, 90%, 100%)
- [ ] **useRoutes Hook Update**: Add budget status route
- [ ] **E2E Tests - Budget Tracking**: Create tests for: calculating budget progress, detecting threshold alerts

#### 9.4 Budget UI

- [ ] **Budgets Page**: Create `./web/app/dashboard/budgets/page.tsx`
- [ ] **Budget Card Component**: Create `./web/components/BudgetCard/BudgetCard.tsx` showing budget progress
- [ ] **Budget Card Types**: Create `./web/components/BudgetCard/BudgetCard.types.ts`
- [ ] **Create Budget Modal**: Create `./web/components/CreateBudgetModal/CreateBudgetModal.tsx`
- [ ] **Create Budget Types**: Create `./web/components/CreateBudgetModal/CreateBudgetModal.types.ts`
- [ ] **Budget Progress Bar**: Create visual progress indicator with color coding
- [ ] **Budgets Context Controller**: Create `./web/context/Budgets/BudgetsContextController.tsx`
- [ ] **Budgets Context Types**: Create `./web/context/Budgets/BudgetsContext.types.ts`
- [ ] **useRoutes Hook Update**: Add budgets page route
- [ ] **E2E Tests - Budget UI**: Create Cypress test for: creating budget, viewing budget progress, editing budget, deleting budget

#### 9.5 Forecasting

- [ ] **Forecast Model**: Create `./database/models/Forecast.ts` with fields: `id`, `user_id` (FK), `period_start`, `period_end`, `predicted_amount`, `currency`, `confidence_score`, `created_at`
- [ ] **Forecast Tests**: Create `./database/__tests__/Forecast.test.ts`
- [ ] **Forecast Migration**: Generate migration for `forecasts` table
- [ ] **Forecast Algorithm**: Create `./web/lib/forecasting/generateForecast.ts` using historical data to predict future expenses
- [ ] **API Endpoint - Generate Forecast**: Create `./web/app/api/v1/forecasts/generate/route.ts`
- [ ] **API Endpoint - Get Forecasts**: Create `./web/app/api/v1/forecasts/route.ts`
- [ ] **API Types - Forecasts**: Create `./web/app/api/v1/forecasts/types.ts`
- [ ] **useRoutes Hook Update**: Add forecast routes
- [ ] **E2E Tests - Forecasting**: Create tests for: generating forecast, viewing forecasts, forecast accuracy

#### 9.6 Forecast UI

- [ ] **Forecast Component**: Create `./web/components/Forecast/Forecast.tsx` displaying predicted expenses
- [ ] **Forecast Types**: Create `./web/components/Forecast/Forecast.types.ts`
- [ ] **Forecast Chart**: Add chart showing historical vs predicted expenses
- [ ] **Forecast Confidence Indicator**: Display confidence score for predictions
- [ ] **Add Forecast to Dashboard**: Integrate forecast component into main dashboard
- [ ] **E2E Tests - Forecast UI**: Create Cypress test for: viewing forecast, understanding confidence scores, comparing with actuals

### 10. Reports & Export

Generate reports and export data in various formats.

#### 10.1 Report Generation

- [ ] **Report Service**: Create `./web/lib/reports/reportService.ts` for generating various report types
- [ ] **API Endpoint - Generate Report**: Create `./web/app/api/v1/reports/generate/route.ts` with parameters for date range, categories, currencies
- [ ] **API Types - Reports**: Create `./web/app/api/v1/reports/types.ts`
- [ ] **Report Types**: Support multiple report types (summary, detailed, by category, by currency, by time period)
- [ ] **useRoutes Hook Update**: Add report generation route
- [ ] **E2E Tests - Report Generation**: Create tests for: generating summary report, generating detailed report, filtering report data

#### 10.2 Export Formats

- [ ] **CSV Export**: Create `./web/lib/export/csvExport.ts` for exporting data to CSV
- [ ] **PDF Export**: Create `./web/lib/export/pdfExport.ts` for generating PDF reports
- [ ] **Excel Export**: Create `./web/lib/export/excelExport.ts` for XLSX format
- [ ] **JSON Export**: Create `./web/lib/export/jsonExport.ts` for raw data export
- [ ] **API Endpoint - Export**: Create `./web/app/api/v1/export/route.ts` supporting multiple formats
- [ ] **API Types - Export**: Create `./web/app/api/v1/export/types.ts`
- [ ] **useRoutes Hook Update**: Add export route
- [ ] **E2E Tests - Export**: Create tests for: CSV export, PDF export, Excel export, JSON export

#### 10.3 Reports UI

- [ ] **Reports Page**: Create `./web/app/dashboard/reports/page.tsx`
- [ ] **Report Builder Component**: Create `./web/components/ReportBuilder/ReportBuilder.tsx` with filters and options
- [ ] **Report Builder Types**: Create `./web/components/ReportBuilder/ReportBuilder.types.ts`
- [ ] **Report Preview**: Add preview functionality before export
- [ ] **Export Button Group**: Create UI for selecting export format
- [ ] **Reports Context Controller**: Create `./web/context/Reports/ReportsContextController.tsx`
- [ ] **Reports Context Types**: Create `./web/context/Reports/ReportsContext.types.ts`
- [ ] **useRoutes Hook Update**: Add reports page route
- [ ] **E2E Tests - Reports UI**: Create Cypress test for: building report, previewing report, exporting in different formats

#### 10.4 Scheduled Reports

- [ ] **Scheduled Report Model**: Create `./database/models/ScheduledReport.ts` with fields: `id`, `user_id` (FK), `name`, `report_type`, `frequency`, `format`, `email_to`, `last_sent_at`, `is_active`, `created_at`, `updated_at`
- [ ] **Scheduled Report Tests**: Create `./database/__tests__/ScheduledReport.test.ts`
- [ ] **Scheduled Report Migration**: Generate migration for `scheduled_reports` table
- [ ] **Report Scheduler**: Create scheduled job to generate and send reports
- [ ] **Email Report Service**: Create `./web/lib/email/sendReport.ts` for emailing reports
- [ ] **API Endpoint - Scheduled Reports**: Create `./web/app/api/v1/reports/scheduled/route.ts` for CRUD operations
- [ ] **API Types - Scheduled Reports**: Create types file for scheduled reports
- [ ] **useRoutes Hook Update**: Add scheduled reports routes
- [ ] **E2E Tests - Scheduled Reports**: Create tests for: creating scheduled report, updating schedule, disabling scheduled report

#### 10.5 Scheduled Reports UI

- [ ] **Scheduled Reports Section**: Add section to reports page for managing scheduled reports
- [ ] **Create Schedule Modal**: Create `./web/components/CreateScheduleModal/CreateScheduleModal.tsx`
- [ ] **Create Schedule Types**: Create `./web/components/CreateScheduleModal/CreateScheduleModal.types.ts`
- [ ] **Schedule List Component**: Display list of active scheduled reports
- [ ] **Reports Context - Scheduled**: Add scheduled report functions to ReportsContextController
- [ ] **E2E Tests - Scheduled Reports UI**: Create Cypress test for: creating schedule, viewing schedules, editing schedule, deleting schedule

### 11. User Settings & Profile

Manage user account settings and preferences.

#### 11.1 Profile Management

- [ ] **API Endpoint - Get Profile**: Create `./web/app/api/v1/user/profile/route.ts` with GET handler
- [ ] **API Endpoint - Update Profile**: Add PUT handler to profile route
- [ ] **API Types - Profile**: Create `./web/app/api/v1/user/profile/types.ts`
- [ ] **Profile Fields**: Support updating: first_name, last_name, email, timezone, date_format, number_format
- [ ] **Add Profile Fields**: Add timezone, date_format, number_format to User model
- [ ] **Profile Fields Migration**: Generate migration for new user fields
- [ ] **useRoutes Hook Update**: Add profile routes
- [ ] **E2E Tests - Profile API**: Create tests for: getting profile, updating profile, validation errors

#### 11.2 Settings Page

- [ ] **Settings Page**: Create `./web/app/dashboard/settings/page.tsx` with tabbed interface
- [ ] **Profile Tab Component**: Create `./web/components/settings/ProfileTab/ProfileTab.tsx`
- [ ] **Profile Tab Types**: Create `./web/components/settings/ProfileTab/ProfileTab.types.ts`
- [ ] **Settings Context Controller**: Create `./web/context/Settings/SettingsContextController.tsx`
- [ ] **Settings Context Types**: Create `./web/context/Settings/SettingsContext.types.ts`
- [ ] **useRoutes Hook Update**: Add settings page route
- [ ] **E2E Tests - Settings Page**: Create Cypress test for: viewing settings, updating profile, tab navigation

#### 11.3 Notification Preferences

- [ ] **Notification Preferences Model**: Add notification fields to User model: `email_notifications`, `push_notifications`, `notification_frequency`
- [ ] **Notification Preferences Migration**: Generate migration for notification fields
- [ ] **API Endpoint - Notification Preferences**: Create `./web/app/api/v1/user/notifications/route.ts`
- [ ] **API Types - Notifications**: Create `./web/app/api/v1/user/notifications/types.ts`
- [ ] **Notifications Tab Component**: Create `./web/components/settings/NotificationsTab/NotificationsTab.tsx`
- [ ] **Notifications Tab Types**: Create `./web/components/settings/NotificationsTab/NotificationsTab.types.ts`
- [ ] **useRoutes Hook Update**: Add notification preferences route
- [ ] **E2E Tests - Notifications**: Create Cypress test for: updating notification preferences, toggling notification types

#### 11.4 Security Settings

- [ ] **API Endpoint - Change Password**: Create `./web/app/api/v1/user/change-password/route.ts`
- [ ] **API Types - Change Password**: Create `./web/app/api/v1/user/change-password/types.ts`
- [ ] **API Endpoint - Active Sessions**: Create `./web/app/api/v1/user/sessions/route.ts` to list active sessions
- [ ] **API Endpoint - Revoke Session**: Add DELETE handler to sessions route
- [ ] **Security Tab Component**: Create `./web/components/settings/SecurityTab/SecurityTab.tsx`
- [ ] **Security Tab Types**: Create `./web/components/settings/SecurityTab/SecurityTab.types.ts`
- [ ] **Two-Factor Auth Setup**: Add 2FA fields to User model (2fa_enabled, 2fa_secret)
- [ ] **2FA Migration**: Generate migration for 2FA fields
- [ ] **useRoutes Hook Update**: Add security routes
- [ ] **E2E Tests - Security**: Create Cypress test for: changing password, viewing sessions, revoking session

#### 11.5 Account Deletion

- [ ] **API Endpoint - Delete Account**: Create `./web/app/api/v1/user/delete/route.ts`
- [ ] **API Types - Delete Account**: Create `./web/app/api/v1/user/delete/types.ts`
- [ ] **Data Cleanup Logic**: Implement cascade deletion for all user data
- [ ] **Account Tab Component**: Create `./web/components/settings/AccountTab/AccountTab.tsx`
- [ ] **Account Tab Types**: Create `./web/components/settings/AccountTab/AccountTab.types.ts`
- [ ] **Delete Confirmation Modal**: Create multi-step confirmation for account deletion
- [ ] **useRoutes Hook Update**: Add account deletion route
- [ ] **E2E Tests - Account Deletion**: Create Cypress test for: account deletion flow, confirmation steps, data cleanup verification

### 12. Mobile Responsiveness & PWA

Ensure the application works well on mobile devices and can be installed as a PWA.

#### 12.1 Responsive Design

- [ ] **Mobile Navigation**: Update navbar component for mobile-friendly hamburger menu
- [ ] **Responsive Dashboard**: Ensure dashboard layout adapts to mobile screens
- [ ] **Responsive Calendar**: Make calendar component touch-friendly and mobile-optimized
- [ ] **Responsive Forms**: Optimize all forms for mobile input
- [ ] **Touch Gestures**: Add swipe gestures for navigation where appropriate
- [ ] **E2E Tests - Mobile**: Create Cypress tests with mobile viewport for: navigation, event creation, calendar interaction

#### 12.2 PWA Configuration

- [ ] **PWA Manifest**: Create `./web/public/manifest.json` with app metadata
- [ ] **Service Worker**: Create `./web/public/sw.js` for offline functionality
- [ ] **PWA Icons**: Generate and add app icons in various sizes
- [ ] **Offline Page**: Create `./web/app/offline/page.tsx` for offline fallback
- [ ] **Install Prompt**: Add custom PWA install prompt component
- [ ] **Next.js PWA Plugin**: Configure next-pwa plugin in next.config.js
- [ ] **E2E Tests - PWA**: Create tests for: PWA installation, offline functionality, service worker registration

#### 12.3 Mobile-Specific Features

- [ ] **Camera Integration**: Add ability to scan receipts using device camera
- [ ] **Geolocation**: Add optional location tagging for expenses
- [ ] **Share API**: Implement Web Share API for sharing reports
- [ ] **Haptic Feedback**: Add haptic feedback for mobile interactions
- [ ] **E2E Tests - Mobile Features**: Create tests for: camera access, geolocation, share functionality

### 13. Performance & Optimization

Optimize application performance and loading times.

#### 13.1 Database Optimization

- [ ] **Index Analysis**: Review and add database indexes for frequently queried fields
- [ ] **Query Optimization**: Optimize N+1 queries using proper includes/joins
- [ ] **Connection Pooling**: Configure optimal database connection pool settings
- [ ] **Query Performance Tests**: Add tests measuring query execution times
- [ ] **Database Monitoring**: Set up query logging for slow queries

#### 13.2 API Optimization

- [ ] **Response Caching**: Implement caching for frequently accessed endpoints
- [ ] **Pagination**: Add pagination to all list endpoints
- [ ] **Rate Limiting**: Implement rate limiting on API endpoints
- [ ] **API Response Compression**: Enable gzip compression for API responses
- [ ] **E2E Tests - Pagination**: Create tests for: paginated list navigation, page size handling

#### 13.3 Frontend Optimization

- [ ] **Code Splitting**: Implement dynamic imports for large components
- [ ] **Image Optimization**: Use Next.js Image component for all images
- [ ] **Bundle Analysis**: Run bundle analyzer and optimize large dependencies
- [ ] **Lazy Loading**: Implement lazy loading for below-fold content
- [ ] **Memoization**: Add React.memo and useMemo where appropriate
- [ ] **Performance Monitoring**: Set up Web Vitals monitoring

#### 13.4 Caching Strategy

- [ ] **Redis Integration**: Set up Redis for caching (optional, for production)
- [ ] **Cache Invalidation**: Implement proper cache invalidation strategies
- [ ] **Client-Side Caching**: Implement SWR or React Query for client-side caching
- [ ] **Static Generation**: Use Next.js static generation where possible

### 14. Error Handling & Logging

Implement comprehensive error handling and logging.

#### 14.1 Error Handling

- [ ] **Global Error Handler**: Create global error handler for API routes
- [ ] **Error Types**: Define custom error types and error codes
- [ ] **Error Response Format**: Standardize error response format across all endpoints
- [ ] **Validation Errors**: Implement consistent validation error handling
- [ ] **Error Boundary**: Add React Error Boundary components
- [ ] **E2E Tests - Error Handling**: Create tests for: API errors, validation errors, network errors

#### 14.2 Logging System

- [ ] **Logger Service**: Create `./web/lib/logger/logger.ts` with different log levels
- [ ] **API Request Logging**: Log all API requests with relevant metadata
- [ ] **Error Logging**: Log all errors with stack traces and context
- [ ] **User Action Logging**: Log important user actions for audit trail
- [ ] **Log Rotation**: Implement log rotation strategy
- [ ] **Production Logging**: Configure production logging service (e.g., Sentry, LogRocket)

#### 14.3 Monitoring & Alerts

- [ ] **Health Check Endpoint**: Create `./web/app/api/health/route.ts`
- [ ] **Database Health Check**: Add database connectivity check
- [ ] **External Service Health**: Check health of external services (Google, Telegram, etc.)
- [ ] **Alert Configuration**: Set up alerts for critical errors
- [ ] **Uptime Monitoring**: Configure uptime monitoring service

### 15. Testing Infrastructure

Comprehensive testing setup and coverage.

#### 15.1 Unit Testing

- [ ] **Database Model Tests**: Ensure all models have comprehensive unit tests
- [ ] **Utility Function Tests**: Test all utility functions in isolation
- [ ] **Service Layer Tests**: Test business logic services
- [ ] **Test Coverage**: Achieve >80% code coverage for critical paths
- [ ] **CI Test Integration**: Configure tests to run on CI/CD pipeline

#### 15.2 Integration Testing

- [ ] **API Integration Tests**: Test API endpoints with real database
- [ ] **Database Integration Tests**: Test complex queries and transactions
- [ ] **External Service Mocks**: Create mocks for external services (Google, Telegram)
- [ ] **Test Database Setup**: Configure separate test database

#### 15.3 E2E Testing Organization

- [ ] **E2E Test Structure**: Organize Cypress tests by feature in logical folders
- [ ] **Cucumber Feature Files**: Create .feature files for all major user flows
- [ ] **Step Definitions**: Implement reusable step definitions
- [ ] **Test Data Management**: Create fixtures and factories for test data
- [ ] **CI E2E Integration**: Configure E2E tests to run on CI/CD
- [ ] **Visual Regression Tests**: Add visual regression testing for UI components

### 16. Documentation

Comprehensive documentation for users and developers.

#### 16.1 User Documentation

- [ ] **User Guide**: Create comprehensive user guide in `./docs/user-guide.md`
- [ ] **Getting Started**: Write getting started guide for new users
- [ ] **Feature Documentation**: Document each feature with screenshots
- [ ] **FAQ**: Create FAQ document addressing common questions
- [ ] **Video Tutorials**: Create video tutorials for key features (optional)

#### 16.2 Developer Documentation

- [ ] **API Documentation**: Generate API documentation using OpenAPI/Swagger
- [ ] **Database Schema**: Document database schema with ER diagrams
- [ ] **Architecture Documentation**: Document system architecture and design decisions
- [ ] **Setup Guide**: Create detailed development environment setup guide
- [ ] **Contributing Guide**: Create CONTRIBUTING.md with guidelines
- [ ] **Code Style Guide**: Document code style and conventions

#### 16.3 Deployment Documentation

- [ ] **Deployment Guide**: Create deployment guide for production
- [ ] **Environment Variables**: Document all required environment variables
- [ ] **Database Migration Guide**: Document migration process
- [ ] **Backup & Recovery**: Document backup and recovery procedures
- [ ] **Monitoring Setup**: Document monitoring and alerting setup

### 17. Security

Implement security best practices.

#### 17.1 Authentication Security

- [ ] **Password Hashing**: Implement bcrypt for password hashing
- [ ] **Session Security**: Implement secure session management with httpOnly cookies
- [ ] **CSRF Protection**: Implement CSRF token validation
- [ ] **Rate Limiting - Auth**: Add rate limiting to auth endpoints
- [ ] **Account Lockout**: Implement account lockout after failed login attempts

#### 17.2 API Security

- [ ] **Input Validation**: Implement comprehensive input validation on all endpoints
- [ ] **SQL Injection Prevention**: Ensure all queries use parameterized statements
- [ ] **XSS Prevention**: Implement XSS protection measures
- [ ] **CORS Configuration**: Configure CORS properly for production
- [ ] **Security Headers**: Add security headers (CSP, HSTS, etc.)

#### 17.3 Data Security

- [ ] **Encryption at Rest**: Implement encryption for sensitive data
- [ ] **Encryption in Transit**: Ensure all connections use HTTPS
- [ ] **Data Access Logging**: Log all data access for audit trail
- [ ] **Data Retention Policy**: Implement data retention and cleanup policies
- [ ] **GDPR Compliance**: Ensure GDPR compliance for EU users

#### 17.4 Security Testing

- [ ] **Security Audit**: Conduct security audit of codebase
- [ ] **Dependency Scanning**: Set up automated dependency vulnerability scanning
- [ ] **Penetration Testing**: Conduct penetration testing (optional, for production)
- [ ] **Security Headers Testing**: Test security headers configuration
- [ ] **E2E Security Tests**: Create tests for: CSRF protection, XSS prevention, authentication bypass attempts

### 18. Deployment & DevOps

Set up deployment pipeline and infrastructure.

#### 18.1 CI/CD Pipeline

- [ ] **GitHub Actions**: Set up GitHub Actions workflow for CI/CD
- [ ] **Automated Testing**: Configure automated test runs on PR
- [ ] **Build Pipeline**: Set up automated build process
- [ ] **Deployment Pipeline**: Configure automated deployment to staging/production
- [ ] **Environment Management**: Set up separate staging and production environments

#### 18.2 Infrastructure Setup

- [ ] **Database Hosting**: Set up production database (Neon, AWS RDS, etc.)
- [ ] **Application Hosting**: Deploy application (Vercel, Railway, AWS, etc.)
- [ ] **CDN Configuration**: Set up CDN for static assets
- [ ] **Domain & SSL**: Configure custom domain and SSL certificates
- [ ] **Backup Strategy**: Implement automated database backups

#### 18.3 Monitoring & Analytics

- [ ] **Application Monitoring**: Set up application performance monitoring
- [ ] **Error Tracking**: Configure error tracking service (Sentry)
- [ ] **Analytics**: Set up user analytics (Google Analytics, Plausible, etc.)
- [ ] **Log Aggregation**: Set up centralized logging
- [ ] **Alerting**: Configure alerts for critical issues

### 19. Onboarding & Help

Help new users get started with the application.

#### 19.1 Onboarding Flow

- [ ] **Welcome Screen**: Create welcome screen for new users
- [ ] **Interactive Tutorial**: Create interactive tutorial for first-time users
- [ ] **Sample Data**: Provide option to load sample data for exploration
- [ ] **Onboarding Checklist**: Create checklist of initial setup tasks
- [ ] **E2E Tests - Onboarding**: Create tests for: completing onboarding flow, skipping tutorial

#### 19.2 In-App Help

- [ ] **Help Center**: Create in-app help center with searchable articles
- [ ] **Contextual Help**: Add contextual help tooltips throughout the app
- [ ] **Feature Announcements**: Create system for announcing new features
- [ ] **Support Contact**: Add support contact form
- [ ] **E2E Tests - Help**: Create tests for: accessing help center, searching help articles

### 20. Advanced Features

Additional features for enhanced functionality.

#### 20.1 Attachments & Receipts

- [ ] **Attachment Model**: Create model for storing file attachments
- [ ] **File Upload API**: Create endpoint for uploading receipt images
- [ ] **File Storage**: Set up file storage (S3, Cloudinary, etc.)
- [ ] **OCR Integration**: Integrate OCR for extracting data from receipts (optional)
- [ ] **Attachment UI**: Add UI for uploading and viewing attachments
- [ ] **E2E Tests - Attachments**: Create tests for: uploading receipt, viewing attachment, deleting attachment

#### 20.2 Collaboration & Sharing

- [ ] **Shared Budgets**: Allow multiple users to share budgets
- [ ] **Expense Splitting**: Add functionality to split expenses between users
- [ ] **Sharing Permissions**: Implement permission system for shared resources
- [ ] **Collaboration UI**: Create UI for managing shared resources
- [ ] **E2E Tests - Collaboration**: Create tests for: sharing budget, splitting expense, managing permissions

#### 20.3 AI-Powered Features

- [ ] **Smart Categorization**: Use AI to automatically categorize expenses
- [ ] **Spending Insights**: Generate AI-powered spending insights
- [ ] **Anomaly Detection**: Detect unusual spending patterns
- [ ] **Natural Language Improvements**: Enhance natural language parser with AI
- [ ] **E2E Tests - AI Features**: Create tests for: auto-categorization, viewing insights

#### 20.4 Webhooks & API Access

- [ ] **Webhook Model**: Create model for webhook subscriptions
- [ ] **Webhook API**: Create endpoints for managing webhooks
- [ ] **Webhook Events**: Implement webhook events for key actions
- [ ] **API Keys**: Implement API key authentication for external access
- [ ] **API Documentation**: Document public API for third-party integrations
- [ ] **E2E Tests - Webhooks**: Create tests for: creating webhook, receiving webhook events

---

## Development Guidelines

### Iteration Workflow

1. **Select a Feature Part**: Choose one unchecked item from the feature plan
2. **Implement**: Complete the implementation following the project patterns
3. **Test**: Ensure corresponding tests pass
4. **Mark Complete**: Check off the item in this README
5. **Commit**: Commit changes with descriptive message referencing the feature part
6. **Next Iteration**: Move to the next unchecked item

### Completion Criteria

A feature part is considered complete when:
- Code is implemented following project patterns
- Unit tests are written and passing (for database models and utilities)
- E2E tests are written and passing (for user-facing features)
- Code is committed to version control
- Item is checked off in this README

### Priority Order

Features should generally be implemented in the order listed, as later features often depend on earlier ones. However, within a feature section, parts can sometimes be implemented in parallel by different agents or developers.