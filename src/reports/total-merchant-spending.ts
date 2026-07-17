import type { Database as SqliteDatabase } from 'better-sqlite3';
import { type Currency, CurrencySchema } from '../domain/currency.ts';

export type TotalMerchantSpendingRow = {
    merchant: string;
    currency: Currency;
    transactionCount: number;
    totalAmountMinor: number;
    entryIds: number[];
};

type TotalMerchantSpendingQueryRow = {
    currency: string;
    transaction_count: number;
    total_amount_minor: number;
    entry_ids: string;
};

export type TotalMerchantSpendingOptions = {
    merchant: string;
    currency: Currency;
};

export function getTotalMerchantSpending(
    db: SqliteDatabase,
    options: TotalMerchantSpendingOptions,
): TotalMerchantSpendingRow | null {
    const statement = db.prepare(`
        SELECT
            currency,
            COUNT(*) AS transaction_count,
            SUM(amount_minor) AS total_amount_minor,
            GROUP_CONCAT(id) AS entry_ids
        FROM ledger_entries
        WHERE status = 'posted'
          AND source_type = 'Card Payment'
          AND LOWER(description) LIKE '%' || LOWER(@merchant) || '%'
          AND currency = @currency
        GROUP BY currency
    `);

    const row = statement.get({
        merchant: options.merchant,
        currency: options.currency,
    }) as TotalMerchantSpendingQueryRow | undefined;

    if (!row) {
        return null;
    }

    return {
        merchant: options.merchant,
        currency: CurrencySchema.parse(row.currency),
        transactionCount: row.transaction_count,
        totalAmountMinor: row.total_amount_minor,
        entryIds: row.entry_ids.split(',').map(Number),
    };
}

export function findTotalMerchantSpending(
    db: SqliteDatabase,
    options: TotalMerchantSpendingOptions,
): TotalMerchantSpendingRow | null {
    return getTotalMerchantSpending(db, options);
}
