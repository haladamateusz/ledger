import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database as SqliteDatabase } from 'better-sqlite3';
import type { LedgerEntry } from '../../src/domain/ledger-entry.ts';
import {
    initializeLedgerDatabase,
    insertLedgerEntry,
    openLedgerDatabase,
} from '../../src/storage/sqlite.ts';
import { getEntries } from '../../src/reports/entries.ts';

let db: SqliteDatabase;

beforeEach(() => {
    db = openLedgerDatabase(':memory:');
    initializeLedgerDatabase(db);
});

afterEach(() => {
    db.close();
});

function insertEntry(overrides: Partial<LedgerEntry>): void {
    const entry: LedgerEntry = {
        source: 'test',
        sourceType: 'Card Payment',
        occurredAt: '2025-07-02T18:30:00+02:00',
        description: 'Costa Coffee',
        amountMinor: -1234,
        feeMinor: 0,
        currency: 'PLN',
        status: 'posted',
        sourceFile: 'fixture.csv',
        sourceRow: 2,
        ...overrides,
    };

    insertLedgerEntry(db, entry);
}

describe('getEntries', () => {
    it('returns entries matching the requested ids', () => {
        insertEntry({
            sourceRow: 2,
            description: 'Costa Coffee',
            amountMinor: -1234,
        });

        insertEntry({
            sourceRow: 3,
            description: 'Lidl',
            amountMinor: -2500,
            currency: 'CHF',
        });

        expect(getEntries(db, { ids: [1, 2] })).toEqual([
            {
                id: 1,
                occurredAt: '2025-07-02T18:30:00+02:00',
                description: 'Costa Coffee',
                amountMinor: -1234,
                currency: 'PLN',
                sourceType: 'Card Payment',
            },
            {
                id: 2,
                occurredAt: '2025-07-02T18:30:00+02:00',
                description: 'Lidl',
                amountMinor: -2500,
                currency: 'CHF',
                sourceType: 'Card Payment',
            },
        ]);
    });

    it('returns entries in requested id order', () => {
        insertEntry({
            sourceRow: 2,
            description: 'First',
        });

        insertEntry({
            sourceRow: 3,
            description: 'Second',
        });

        insertEntry({
            sourceRow: 4,
            description: 'Third',
        });

        expect(getEntries(db, { ids: [3, 1] }).map((entry) => entry.id)).toEqual([3, 1]);
    });

    it('does not fail when some requested ids are missing', () => {
        insertEntry({
            sourceRow: 2,
            description: 'Existing Entry',
        });

        expect(getEntries(db, { ids: [999, 1] })).toEqual([
            {
                id: 1,
                occurredAt: '2025-07-02T18:30:00+02:00',
                description: 'Existing Entry',
                amountMinor: -1234,
                currency: 'PLN',
                sourceType: 'Card Payment',
            },
        ]);
    });

    it('returns an empty array when ids is empty', () => {
        insertEntry({
            sourceRow: 2,
            description: 'Ignored Entry',
        });

        expect(getEntries(db, { ids: [] })).toEqual([]);
    });

    it('includes entries regardless of status or source type', () => {
        insertEntry({
            sourceRow: 2,
            description: 'Reversed Payment',
            status: 'reversed',
            amountMinor: -1000,
        });

        insertEntry({
            sourceRow: 3,
            description: 'Refund',
            sourceType: 'Card Refund',
            amountMinor: 1000,
        });

        expect(getEntries(db, { ids: [1, 2] })).toMatchObject([
            {
                id: 1,
                description: 'Reversed Payment',
                sourceType: 'Card Payment',
            },
            {
                id: 2,
                description: 'Refund',
                sourceType: 'Card Refund',
            },
        ]);
    });
});
