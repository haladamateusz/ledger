import type { Database as SqliteDatabase } from 'better-sqlite3';
import { type Currency, CurrencySchema } from '../domain/currency.ts';

export type MonthlyMerchantSpendingRow = {
    merchant: string;
    month: string;
    currency: Currency;
    transactionCount: number;
    totalAmountMinor: number;
    entryIds: number[];
};

type MonthlyMerchantSpendingQueryRow = {
    merchant: string;
    month: string;
    currency: string;
    transaction_count: number;
    total_amount_minor: number;
    entry_ids: string;
};

export type MonthlyMerchantSpendingOptions = {
    merchant: string;
};

export function getMonthlyMerchantSpending(
    db: SqliteDatabase,
    options: MonthlyMerchantSpendingOptions,
): MonthlyMerchantSpendingRow[] {
    const statement = db.prepare(`
        SELECT
            substr(occurred_at, 1, 7) AS month,
            currency,
            COUNT(*) AS transaction_count,
            SUM(amount_minor) AS total_amount_minor,
            GROUP_CONCAT(id) AS entry_ids,
            description as merchant
        FROM ledger_entries
        WHERE status = 'posted'
          AND source_type = 'Card Payment'
          AND LOWER(description) LIKE '%' || LOWER(@merchant) || '%'
        GROUP BY month, currency
        ORDER BY month, currency
    `);

    const rows = statement.all({
        merchant: options.merchant,
    }) as MonthlyMerchantSpendingQueryRow[];

    return rows.map((row) => ({
        merchant: row.merchant,
        month: row.month,
        currency: CurrencySchema.parse(row.currency),
        transactionCount: row.transaction_count,
        totalAmountMinor: row.total_amount_minor,
        entryIds: row.entry_ids.split(',').map(Number),
    }));
}

export function findBusiestMerchantMonth(
    db: SqliteDatabase,
    options: MonthlyMerchantSpendingOptions,
): MonthlyMerchantSpendingRow | null {
    const rows = getMonthlyMerchantSpending(db, options);

    return rows.reduce<MonthlyMerchantSpendingRow | null>((best, row) => {
        if (!best) {
            return row;
        }

        if (row.transactionCount > best.transactionCount) {
            return row;
        }

        return best;
    }, null);
}
