# ExpenseCal

ExpenseCal is a SaaS that lets a person or AI Agent create calendar events for financial forecasting or expense tracking, among other use cases.

## Examples

_100 USD for yesterday's dinner with friends_

Will be parsed by the ExpenseCal system in parts: 100 (amount), USD (currency), yesterday (datetime), dinner with friends (description)

_3500 MXN for a new cheap cellphone next year_

This a future event example picking up the same parts as before, but put as an event in the future, perhaps inferred as January of the next year. This inference is made by AI models tailored for these kind of events.

_12000 euros in 10 monthly installments for my new bike_

The system creates 10 calendar events associated to a parent total amount record of EUR currency for the purpose as described by the user.

## Feature Plan

### Authentication

Handles a user's SignUp and SignIn flows. This project uses Neon Auth with a `neon_auth` schema and a `users` table.

#### Sign Up Page

- [] Database Model Definition
- [] Database Model Tests
- [] Database Model Migrations
- [] API Endpoints
- [] UI Components
- [] Context Controllers
- [] E2E Tests

### API

### User Dashboard

### Integrations

- Google Calendar: connect a Google Calendar account and let the user authorize a new events calendar instance to sync calendar events into ExpenseCal
- Telegram: let a user send ExpenseCal event texts to @ExpenseCalBot