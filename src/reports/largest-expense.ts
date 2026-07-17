import type { Database as SqliteDatabase } from 'better-sqlite3';
import { type Currency, CurrencySchema } from '../domain/currency.ts';

export type LargestExpenseOptions = {
    merchant?: string;
    dateFrom?: string;
    dateTo?: string;
    timeFrom?: string;
    timeTo?: string;
};

export type LargestExpenseRow = {
    id: number;
    occurredAt: string;
    description: string;
    amountMinor: number;
    currency: Currency;
    sourceType: string;
};

type LargestExpenseQueryRow = {
    id: number;
    occurred_at: string;
    description: string;
    amount_minor: number;
    currency: string;
    source_type: string;
};

export function findLargestExpense(
    db: SqliteDatabase,
    options: LargestExpenseOptions = {},
): LargestExpenseRow | null {
    const statement = db.prepare(`
        SELECT
            id,
            occurred_at,
            description,
            amount_minor,
            currency,
            source_type
        FROM ledger_entries
        WHERE status = 'posted'
          AND source_type = 'Card Payment'
          AND amount_minor < 0
          AND (
              @merchant IS NULL
              OR LOWER(description) LIKE '%' || LOWER(@merchant) || '%'
          )
          AND (
              @dateFrom IS NULL
              OR substr(occurred_at, 1, 10) >= @dateFrom
          )
          AND (
              @dateTo IS NULL
              OR substr(occurred_at, 1, 10) <= @dateTo
          )
          AND (
              @timeFrom IS NULL
              OR substr(occurred_at, 12, 5) >= @timeFrom
          )
          AND (
              @timeTo IS NULL
              OR substr(occurred_at, 12, 5) <= @timeTo
          )
        ORDER BY amount_minor ASC
        LIMIT 1
    `);

    const row = statement.get({
        merchant: options.merchant ?? null,
        dateFrom: options.dateFrom ?? null,
        dateTo: options.dateTo ?? null,
        timeFrom: options.timeFrom ?? null,
        timeTo: options.timeTo ?? null,
    }) as LargestExpenseQueryRow | undefined;

    if (!row) {
        return null;
    }

    return {
        id: row.id,
        occurredAt: row.occurred_at,
        description: row.description,
        amountMinor: row.amount_minor,
        currency: CurrencySchema.parse(row.currency),
        sourceType: row.source_type,
    };
}
