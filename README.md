# ExpenseCal

ExpenseCal is a SaaS for financial forecasting and expense tracking with AI-powered asset valuation. Track cash flow and inventory to see your complete net worth — a very powerful financial forecasting tool.

<img width="1755" height="1084" alt="Screenshot 2026-02-08 at 21 30 02" src="https://github.com/user-attachments/assets/0fa1691a-de15-4f31-bfbb-a11fe03e1b1a" />


## Examples

_100 USD for yesterday's dinner with friends_

Will be parsed by the ExpenseCal system in parts: 100 (amount), USD (currency), yesterday (datetime), dinner with friends (description)

_3500 MXN for a new cheap cellphone next year_

This a future event example picking up the same parts as before, but put as an event in the future, perhaps inferred as January of the next year. This inference is made by AI models tailored for these kind of events.

_12000 euros in 10 monthly installments for my new bike_

The system creates 10 calendar events associated to a parent total amount record of EUR currency for the purpose as described by the user.

### Basic Examples (Simple Expenses & Income)

100 USD for yesterday's dinner with friends
Expected parsing: 100 USD expense from yesterday, description: "dinner with friends"

5 coffees at 3 EUR each this morning
Expected parsing: 3 EUR expense, quantity: 5, description: "coffees", today's date

Received 5000 dollars salary today
Expected parsing: 5000 USD income, description: "salary", today's date

Complex Examples (Installments & Recurring)

12000 euros in 10 monthly installments for my new bike
Expected parsing: Monthly recurring expense, 12000 EUR total, 10 installments, description: "new bike"

Monthly rent of 1500 USD starting today
Expected parsing: 1500 USD recurring expense, monthly recurrence, description: "rent"

3500 MXN for a new cheap cellphone next year
Expected parsing: 3500 MXN expense, date: ~January next year, description: "new cellphone"

### Edge Cases & Variations

500 GBP for groceries last week
Expected parsing: 500 GBP expense, relative date 7 days ago, description: "groceries"

2 BTC received as bonus tomorrow
Expected parsing: 2 BTC income, tomorrow's date, description: "bonus"

Weekly gym membership 25 CHF
Expected parsing: 25 CHF recurring expense, weekly pattern, description: "gym membership"

Paid 750 JPY for dinner with 2 friends but I only paid for 1
Expected parsing: 750 JPY expense, description: "dinner with 2 friends", quantity detection

50 USD quarterly insurance next month for 3 years
Expected parsing: 50 AUD recurring expense, quarterly pattern, description: "insurance"

