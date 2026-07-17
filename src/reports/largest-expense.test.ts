import { afterEach, beforeEach, expect, it } from 'vitest';
import type { Database as SqliteDatabase } from 'better-sqlite3';
import type { LedgerEntry } from '../../src/domain/ledger-entry.ts';
import {
    initializeLedgerDatabase,
    insertLedgerEntry,
    openLedgerDatabase,
} from '../../src/storage/sqlite.ts';
import { findLargestExpense } from '../../src/reports/largest-expense.ts';

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
        description: 'Dinner Place',
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

it('returns the posted card payment with the largest expense amount', () => {
    insertEntry({
        sourceRow: 2,
        description: 'Small Dinner',
        amountMinor: -1000,
    });
    insertEntry({
        sourceRow: 3,
        description: 'Big Dinner',
        amountMinor: -5000,
    });
    insertEntry({
        sourceRow: 4,
        description: 'Medium Dinner',
        amountMinor: -2500,
    });

    expect(findLargestExpense(db)).toMatchObject({
        id: 2,
        description: 'Big Dinner',
        amountMinor: -5000,
    });
});

it('filters by merchant case-insensitively', () => {
    insertEntry({
        sourceRow: 2,
        description: 'Costa Coffee',
        amountMinor: -1000,
    });
    insertEntry({
        sourceRow: 3,
        description: 'Restaurant',
        amountMinor: -5000,
    });

    expect(findLargestExpense(db, { merchant: 'costa' })).toMatchObject({
        description: 'Costa Coffee',
        amountMinor: -1000,
    });
});

it('filters by date range', () => {
    insertEntry({
        sourceRow: 2,
        occurredAt: '2025-07-02T18:30:00+02:00',
        description: 'July Dinner',
        amountMinor: -5000,
    });
    insertEntry({
        sourceRow: 3,
        occurredAt: '2025-08-02T18:30:00+02:00',
        description: 'August Dinner',
        amountMinor: -3000,
    });

    expect(
        findLargestExpense(db, {
            dateFrom: '2025-08-01',
            dateTo: '2025-08-31',
        }),
    ).toMatchObject({
        description: 'August Dinner',
    });
});

it('filters by time range', () => {
    insertEntry({
        sourceRow: 2,
        occurredAt: '2025-07-02T08:30:00+02:00',
        description: 'Breakfast',
        amountMinor: -5000,
    });
    insertEntry({
        sourceRow: 3,
        occurredAt: '2025-07-02T19:30:00+02:00',
        description: 'Dinner',
        amountMinor: -3000,
    });

    expect(
        findLargestExpense(db, {
            timeFrom: '17:00',
            timeTo: '23:59',
        }),
    ).toMatchObject({
        description: 'Dinner',
    });
});

it('excludes reversed entries, refunds, exchanges, and positive amounts', () => {
    insertEntry({
        sourceRow: 2,
        description: 'Reversed',
        status: 'reversed',
        amountMinor: -9000,
    });
    insertEntry({
        sourceRow: 3,
        description: 'Refund',
        sourceType: 'Card Refund',
        amountMinor: 9000,
    });
    insertEntry({
        sourceRow: 4,
        description: 'Exchange',
        sourceType: 'Exchange',
        amountMinor: -9000,
    });
    insertEntry({
        sourceRow: 5,
        description: 'Positive Card Payment',
        amountMinor: 9000,
    });
    insertEntry({
        sourceRow: 6,
        description: 'Real Expense',
        sourceType: 'Card Payment',
        status: 'posted',
        amountMinor: -1000,
    });

    expect(findLargestExpense(db)).toMatchObject({
        description: 'Real Expense',
        amountMinor: -1000,
    });
});

it('returns null when no expense matches', () => {
    expect(findLargestExpense(db, { merchant: 'missing' })).toBeNull();
});
