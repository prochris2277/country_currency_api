# Country Currency & Exchange API

A RESTful API that fetches country data and USD exchange rates from external APIs, computes an estimated GDP for each country, caches everything in MySQL, and serves it through CRUD-style endpoints. It also generates a summary image after every refresh.

## Features

- Fetches all countries and USD exchange rates, then caches them in MySQL
- Computes `estimated_gdp = population × random(1000–2000) ÷ exchange_rate`
- Filtering and sorting on the list endpoint
- Summary image (total countries, top 5 by estimated GDP, last refresh time)
- Consistent JSON error responses

## Tech Stack

- Node.js (18+) and Express
- MySQL (`mysql2`)
- `@napi-rs/canvas` for image generation
- `dotenv` for configuration

## Setup

### Prerequisites

- Node.js 18 or higher
- MySQL 8 running locally (or a hosted MySQL database)
- A free REST Countries API key (see the note below)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd country-currency-api
npm install
```

### 2. Create the database

```sql
CREATE DATABASE country_api;
```

The tables (`countries`, `refresh_meta`) are created automatically when the server starts.

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description | Example |
| --- | --- | --- |
| `PORT` | Port the server listens on | `3000` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL user | `root` |
| `DB_PASSWORD` | MySQL password | `your_password` |
| `DB_NAME` | Database name | `country_api` |
| `COUNTRIES_API_KEY` | REST Countries API key | `your_key` |

### 4. Run locally

```bash
npm run dev     # development, auto-restarts with nodemon
npm start       # production
```

The server runs at `http://localhost:3000`. Call `POST /countries/refresh` once to populate the database.

## Dependencies

| Package | Purpose |
| --- | --- |
| `express` | HTTP server and routing |
| `mysql2` | MySQL client |
| `dotenv` | Loads `.env` configuration |
| `@napi-rs/canvas` | Generates the summary image |
| `nodemon` (dev) | Auto-restart during development |

Install everything with `npm install`.

## API Endpoints

### `POST /countries/refresh`

Fetches all countries and exchange rates, then inserts or updates every record in the database (matched by name, case-insensitive), regenerates the summary image, and updates the global refresh timestamp.

```json
{
  "message": "Countries refreshed successfully",
  "total_countries": 254,
  "last_refreshed_at": "2026-11-25T14:00:00.000Z"
}
```

### `GET /countries`

Returns all cached countries.

| Query param | Example | Description |
| --- | --- | --- |
| `region` | `?region=Africa` | Filter by region |
| `currency` | `?currency=NGN` | Filter by currency code |
| `sort` | `?sort=gdp_desc` | One of `gdp_desc`, `gdp_asc`, `name_asc`, `name_desc`, `population_desc`, `population_asc` |

Filters can be combined, for example `/countries?region=Africa&sort=gdp_desc`.

```json
[
  {
    "id": 1,
    "name": "Nigeria",
    "capital": "Abuja",
    "region": "Africa",
    "population": 223800000,
    "currency_code": "NGN",
    "exchange_rate": 1600.23,
    "estimated_gdp": 25767448125.2,
    "flag_url": "https://flags.restcountries.com/v5/svg/ng.svg",
    "last_refreshed_at": "2026-11-25T14:00:00.000Z"
  }
]
```

### `GET /countries/:name`

Returns one country by name (case-insensitive). Returns `404` if not found.

### `DELETE /countries/:name`

Deletes a country record. Returns `404` if not found.

### `GET /status`

```json
{
  "total_countries": 254,
  "last_refreshed_at": "2026-11-25T14:00:00.000Z"
}
```

### `GET /countries/image`

Serves the generated summary image (`cache/summary.png`). If no image exists yet:

```json
{ "error": "Summary image not found" }
```

## Refresh Behavior

- If a country has several currencies, only the first currency code is stored.
- **No currencies:** `currency_code` and `exchange_rate` are `null`, `estimated_gdp` is `0`, and the country is still stored.
- **Currency not found in the exchange rates API:** `exchange_rate` and `estimated_gdp` are `null`, and the country is still stored.
- Existing countries are updated, new ones are inserted. A fresh random multiplier (1000–2000) is generated per country on every refresh.
- Both external APIs are fetched before the database is touched, and all writes run in a single transaction. If either API fails, nothing is modified.
- External API calls are retried up to 2 times before failing.

## Error Responses

| Status | Body |
| --- | --- |
| 400 | `{ "error": "Validation failed", "details": { "field": "reason" } }` |
| 404 | `{ "error": "Country not found" }` |
| 500 | `{ "error": "Internal server error" }` |
| 503 | `{ "error": "External data source unavailable", "details": "Could not fetch data from [API name]" }` |

## Notes

- **Countries API change:** the task's original endpoint (`restcountries.com/v2/all`) was retired by REST Countries, and requests to it now return a deprecation notice. This project uses their current v5 API (`api.restcountries.com/countries/v5`), which provides the same data (name, capital, region, population, flag, currencies) but requires a free API key. The v5 response is converted to the original shape inside `src/services/externalApis.js`.
- **Validation:** `name` and `population` are required, and records missing them are skipped during refresh. `currency_code` is nullable because the refresh rules require storing countries that have no currency.
- **Timestamps** are stored and returned in UTC (ISO 8601).
- **Exchange rates** come from `https://open.er-api.com/v6/latest/USD`.

## Project Structure

```
src/
├── app.js
├── config/         # database connection and table setup
├── controllers/    # route handlers
├── routes/         # route definitions
├── services/       # external APIs, refresh logic, image generation
└── utils/          # error handling and helpers
cache/              # generated summary image
```