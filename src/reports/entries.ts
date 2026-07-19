import type { Database as SqliteDatabase } from 'better-sqlite3';
import { type Currency, CurrencySchema } from '../domain/currency.ts';

export type EntriesOptions = {
    ids: number[];
};

export type EntriesRow = {
    id: number;
    occurredAt: string;
    description: string;
    amountMinor: number;
    currency: Currency;
    sourceType: string;
};

type EntriesQueryRow = {
    id: number;
    occurred_at: string;
    description: string;
    amount_minor: number;
    currency: string;
    source_type: string;
};

export function getEntries(db: SqliteDatabase, options: EntriesOptions): EntriesRow[] {
    const uniqueIds = [...new Set(options.ids)];

    if (uniqueIds.length === 0) {
        return [];
    }

    const placeholders = uniqueIds.map(() => '?').join(', ');
    const statement = db.prepare(`
        SELECT
            id,
            source_type,
            occurred_at,
            description,
            amount_minor,
            currency
        FROM ledger_entries
        WHERE id IN (${placeholders})
    `);
    const rows = statement.all(...uniqueIds) as EntriesQueryRow[];

    const rowsById = new Map(
        rows.map((row) => [
            row.id,
            {
                id: row.id,
                occurredAt: row.occurred_at,
                description: row.description,
                amountMinor: row.amount_minor,
                currency: CurrencySchema.parse(row.currency),
                sourceType: row.source_type,
            },
        ]),
    );

    // Preserve the requested id order
    return options.ids.flatMap((id) => {
        const row = rowsById.get(id);

        if (!row) {
            return [];
        }

        return [row];
    });
}
