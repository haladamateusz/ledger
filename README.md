# Ledger

A small personal finance ledger for importing Revolut CSV exports into SQLite,
running spending reports, and exposing ledger/currency utilities over MCP.

## What It Does

- Imports Revolut CSV rows into a normalized `ledger_entries` table.
- Stores ledger data in a local SQLite database.
- Generates JSON reports for merchant spending and largest expenses.
- Provides an MCP stdio server with ledger report tools and currency conversion.
- Uses TypeScript, Vitest, oxlint, and oxfmt for development checks.

## Requirements

- Node.js `>=22.18`
- npm

## Setup

```sh
npm install
```

Initialize the default local database at `data/ledger.sqlite`:

```sh
npm run db:init
```

You can pass a custom database path directly to the underlying CLI:

```sh
node src/cli/init-db.ts path/to/ledger.sqlite
```

## Import Revolut Data

Inspect a Revolut CSV export before importing:

```sh
npm run inspect:revolut -- path/to/revolut.csv
```

Import rows into the default database:

```sh
npm run import:revolut -- path/to/revolut.csv
```

Import into a custom database:

```sh
npm run import:revolut -- path/to/revolut.csv path/to/ledger.sqlite
```

Imports are idempotent per source file and source row. Duplicate rows are skipped
using the database uniqueness constraint.

## Reports

Find monthly spending for a merchant:

```sh
npm run report:monthly-merchant -- "Merchant Name"
```

Find the month with the most posted card payments for a merchant:

```sh
npm run report:busiest-merchant-month -- "Merchant Name"
```

Find the largest expense, optionally filtered:

```sh
npm run report:largest-expense -- --merchant "Merchant Name"
npm run report:largest-expense -- --date-from 2026-01-01 --date-to 2026-01-31
npm run report:largest-expense -- --time-from 12:00 --time-to 14:00
```

All report commands print JSON.

## MCP Server

Start the stdio MCP server:

```sh
npm run mcp:server
```

By default, the server reads from `data/ledger.sqlite`. Set `LEDGER_DB_PATH` to
point at another database:

```sh
LEDGER_DB_PATH=path/to/ledger.sqlite npm run mcp:server
```

Available MCP tools:

- `find_busiest_merchant_month`
- `find_largest_expense`
- `get_entries`
- `find_total_merchant_spending`
- `convert_currency`

Smoke-test the MCP clients:

```sh
npm run mcp:smoke
```

## Development

Run the full check suite:

```sh
npm run check
```

Run individual checks:

```sh
npm run typecheck
npm test
npm run lint
npm run format:check
```

Format and lint-fix locally:

```sh
npm run format
npm run lint:fix
```

## Project Layout

```text
src/agent/          Local agent/MCP chat helpers
src/cli/            Command-line entry points
src/domain/         Core ledger, money, date, time, and currency types
src/exchange-rates/ NBP exchange-rate integration
src/importers/      Source-specific importers, currently Revolut
src/mcp/            MCP server and smoke clients
src/presentation/   Formatting helpers
src/reports/        Report queries and calculations
src/storage/        SQLite setup and persistence helpers
src/tools/          MCP tool implementations
```

## Notes

- Currency support is currently limited to `PLN`, `CHF`, and `EUR`.
- Currency conversion uses the latest NBP table A average exchange rates.
- The SQLite database is local; keep personal export files and database files out
  of version control.
