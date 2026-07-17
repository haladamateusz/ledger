import { afterEach, beforeEach, expect, it } from 'vitest';
import type { Database as SqliteDatabase } from 'better-sqlite3';
import type { LedgerEntry } from '../../src/domain/ledger-entry.ts';
import {
    initializeLedgerDatabase,
    insertLedgerEntry,
    openLedgerDatabase,
} from '../../src/storage/sqlite.ts';
import {
    findBusiestMerchantMonth,
    getMonthlyMerchantSpending,
} from '../../src/reports/monthly-merchant-spending.ts';

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
        occurredAt: '2025-07-02T08:30:00+02:00',
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

it('groups matching card payments by month', () => {
    insertEntry({
        sourceRow: 2,
        occurredAt: '2025-07-02T08:30:00+02:00',
        amountMinor: -1000,
    });
    insertEntry({
        sourceRow: 3,
        occurredAt: '2025-07-03T08:30:00+02:00',
        amountMinor: -1500,
    });
    insertEntry({
        sourceRow: 4,
        occurredAt: '2025-08-01T08:30:00+02:00',
        amountMinor: -2000,
    });

    expect(getMonthlyMerchantSpending(db, { merchant: 'Costa' })).toEqual([
        {
            month: '2025-07',
            merchant: 'Costa Coffee',
            currency: 'PLN',
            transactionCount: 2,
            totalAmountMinor: -2500,
            entryIds: [1, 2],
        },
        {
            month: '2025-08',
            merchant: 'Costa Coffee',
            currency: 'PLN',
            transactionCount: 1,
            totalAmountMinor: -2000,
            entryIds: [3],
        },
    ]);
});

it('excludes reversed entries and non-card payments', () => {
    insertEntry({
        sourceRow: 2,
        description: 'Costa Coffee',
        status: 'reversed',
    });
    insertEntry({
        sourceRow: 3,
        sourceType: 'Exchange',
        description: 'Exchanged to PLN',
        currency: 'PLN',
    });

    insertEntry({
        sourceRow: 4,
        description: 'Costa Coffee',
        sourceType: 'Card Payment',
        status: 'posted',
    });

    const rows = getMonthlyMerchantSpending(db, { merchant: 'Costa' });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.transactionCount).toBe(1);
    expect(rows[0]?.entryIds).toEqual([3]);
});

it('matches merchant case-insensitively', () => {
    insertEntry({
        sourceRow: 2,
        description: 'COSTA COFFEE WARSZAWA',
    });

    expect(getMonthlyMerchantSpending(db, { merchant: 'costa' })).toHaveLength(1);
});

it('excludes reversed entries and non-card payments', () => {
    insertEntry({
        sourceRow: 2,
        description: 'Costa Coffee',
        status: 'reversed',
    });
    insertEntry({
        sourceRow: 3,
        sourceType: 'Exchange',
        description: 'Exchanged to PLN',
        currency: 'PLN',
    });
    insertEntry({
        sourceRow: 4,
        description: 'Costa Coffee',
        sourceType: 'Card Payment',
        status: 'posted',
    });

    const rows = getMonthlyMerchantSpending(db, { merchant: 'Costa' });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.transactionCount).toBe(1);
    expect(rows[0]?.entryIds).toEqual([3]);
});

it('finds the month with the most merchant transactions', () => {
    insertEntry({
        sourceRow: 2,
        occurredAt: '2025-07-02T08:30:00+02:00',
    });
    insertEntry({
        sourceRow: 3,
        occurredAt: '2025-08-01T08:30:00+02:00',
    });
    insertEntry({
        sourceRow: 4,
        occurredAt: '2025-08-02T08:30:00+02:00',
    });

    expect(findBusiestMerchantMonth(db, { merchant: 'Costa' })).toEqual({
        month: '2025-08',
        currency: 'PLN',
        transactionCount: 2,
        totalAmountMinor: -2468,
        merchant: 'Costa Coffee',
        entryIds: [2, 3],
    });
});
