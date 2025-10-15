# ExpenseCal API - Postman Collection

This directory contains Postman collections and environments for testing the ExpenseCal API.

## Structure

```
postman/
├── collections/
│   └── ExpenseCal-API-v1.postman_collection.json
├── environments/
│   ├── local.postman_environment.json
│   ├── development.postman_environment.json
│   └── production.postman_environment.json
└── README.md
```

## Getting Started

### Import into Postman

1. Open Postman
2. Click **Import** in the top left
3. Select the collection file: `collections/ExpenseCal-API-v1.postman_collection.json`
4. Import the environment you need from the `environments/` folder

### Select Environment

1. Click the environment dropdown in the top right
2. Select **Local Development**, **Development**, or **Production**

## Environments

### Local Development
- **Base URL**: `http://localhost:3000`
- Use this when running the Next.js dev server locally

### Development
- **Base URL**: `https://dev.expensecal.com`
- Use this for testing against the development deployment

### Production
- **Base URL**: `https://expensecal.com`
- Use this for testing against the production deployment

## Available Endpoints

### Events

#### Parse Event Text
**POST** `/api/v1/events/parse`

Parse natural language expense text into structured data.

**Request Body:**
```json
{
  "text": "100 USD for yesterday's dinner",
  "current_date": "2025-10-15T00:00:00.000Z" // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "amount": 100,
    "currency": "USD",
    "quantity": 1,
    "description": "dinner",
    "event_date": "2025-10-14T00:00:00.000Z",
    "type": "EXPENSE",
    "confidence": 0.95,
    "raw_text": "100 USD for yesterday's dinner"
  }
}
```

**Example Texts to Try:**
- `"100 USD for yesterday's dinner"`
- `"3500 MXN for a new cheap cellphone next year"`
- `"12000 euros in 10 monthly installments for my new bike"`
- `"50 EUR income from freelance work last week"`

## Testing with cURL

If you prefer using cURL instead of Postman:

```bash
# Local
curl -X POST http://localhost:3000/api/v1/events/parse \
  -H "Content-Type: application/json" \
  -d '{"text": "100 USD for yesterday'\''s dinner"}'

# With current_date
curl -X POST http://localhost:3000/api/v1/events/parse \
  -H "Content-Type: application/json" \
  -d '{
    "text": "3500 MXN for a new cheap cellphone next year",
    "current_date": "2025-10-15T00:00:00.000Z"
  }'
```

## Notes

- The Parse endpoint is **public** and does not require authentication
- Make sure Ollama is running locally when testing the parse endpoint
- The collection includes example responses for success and error cases
- All dates should be in ISO 8601 format

## Adding New Endpoints

When adding new endpoints to the collection:

1. Open the collection in Postman
2. Add the new request to the appropriate folder
3. Include example requests and responses
4. Export the collection and save it back to `collections/`
5. Update this README with the new endpoint documentation
