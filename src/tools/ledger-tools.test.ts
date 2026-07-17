import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database as SqliteDatabase } from 'better-sqlite3';
import type { LedgerEntry } from '../../src/domain/ledger-entry.ts';
import {
    initializeLedgerDatabase,
    insertLedgerEntry,
    openLedgerDatabase,
} from '../../src/storage/sqlite.ts';
import {
    findBusiestMerchantMonthTool,
    findLargestExpenseTool,
    findTotalMerchantSpendingTool,
} from '../../src/tools/ledger-tools.ts';

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

describe('ledger tools', () => {
    describe('findBusiestMerchantMonthTool', () => {
        it('returns null fields when busiest merchant month has no match', () => {
            insertEntry({
                sourceRow: 2,
                description: 'Lidl',
            });

            expect(findBusiestMerchantMonthTool(db, { merchant: 'Costa' })).toEqual({
                merchant: 'Costa',
                month: null,
                transactionCount: null,
                totalAmountMinor: null,
                totalAmountDisplay: null,
                currency: null,
                entryIds: [],
            });
        });

        it('returns busiest merchant month with evidence entry ids', () => {
            insertEntry({
                sourceRow: 2,
                occurredAt: '2025-07-02T08:30:00+02:00',
                description: 'Costa Coffee',
                amountMinor: -1000,
            });

            insertEntry({
                sourceRow: 3,
                occurredAt: '2025-08-02T08:30:00+02:00',
                description: 'Costa Coffee',
                amountMinor: -2000,
            });

            insertEntry({
                sourceRow: 4,
                occurredAt: '2025-08-03T08:30:00+02:00',
                description: 'COSTA COFFEE',
                amountMinor: -3000,
            });

            expect(findBusiestMerchantMonthTool(db, { merchant: 'costa' })).toEqual({
                merchant: 'costa',
                month: '2025-08',
                transactionCount: 2,
                totalAmountMinor: -5000,
                totalAmountDisplay: '50.00 PLN',
                currency: 'PLN',
                entryIds: [2, 3],
            });
        });
    });

    describe('findLargestExpenseTool', () => {
        it('returns null fields when largest expense has no match', () => {
            insertEntry({
                sourceRow: 2,
                description: 'Costa Coffee',
                amountMinor: -1000,
            });

            expect(findLargestExpenseTool(db, { merchant: 'missing' })).toEqual({
                id: null,
                occurredAt: null,
                description: null,
                amountMinor: null,
                amountDisplay: null,
                currency: null,
                sourceType: null,
            });
        });

        it('forwards largest expense filters and returns the largest matching expense', () => {
            insertEntry({
                sourceRow: 2,
                occurredAt: '2025-07-02T08:30:00+02:00',
                description: 'Costa Coffee Breakfast',
                amountMinor: -9000,
            });

            insertEntry({
                sourceRow: 3,
                occurredAt: '2025-07-02T19:30:00+02:00',
                description: 'Costa Coffee Evening',
                amountMinor: -3000,
            });

            insertEntry({
                sourceRow: 4,
                occurredAt: '2025-07-02T20:30:00+02:00',
                description: 'Restaurant',
                amountMinor: -10000,
            });

            expect(
                findLargestExpenseTool(db, {
                    merchant: 'costa',
                    timeFrom: '17:00',
                    timeTo: '23:59',
                }),
            ).toEqual({
                id: 2,
                occurredAt: '2025-07-02T19:30:00+02:00',
                description: 'Costa Coffee Evening',
                amountMinor: -3000,
                amountDisplay: '30.00 PLN',
                currency: 'PLN',
                sourceType: 'Card Payment',
            });
        });
    });

    describe('findTotalMerchantSpendingTool', () => {
        it('returns zero total spending when merchant and currency have no match', () => {
            insertEntry({
                sourceRow: 2,
                description: 'Lidl',
                currency: 'PLN',
                amountMinor: -1000,
            });

            expect(
                findTotalMerchantSpendingTool(db, {
                    merchant: 'Costa',
                    currency: 'PLN',
                }),
            ).toEqual({
                merchant: 'Costa',
                currency: 'PLN',
                transactionCount: 0,
                totalAmountMinor: 0,
                totalAmountDisplay: '0.00 PLN',
                entryIds: [],
            });
        });

        it('returns total merchant spending with formatted display amount', () => {
            insertEntry({
                sourceRow: 2,
                description: 'Costa Coffee',
                currency: 'PLN',
                amountMinor: -1000,
            });

            insertEntry({
                sourceRow: 3,
                description: 'COSTA COFFEE WARSZAWA',
                currency: 'PLN',
                amountMinor: -2500,
            });

            insertEntry({
                sourceRow: 4,
                description: 'Costa Coffee',
                currency: 'CHF',
                amountMinor: -9999,
            });

            expect(
                findTotalMerchantSpendingTool(db, {
                    merchant: 'costa',
                    currency: 'PLN',
                }),
            ).toEqual({
                merchant: 'costa',
                currency: 'PLN',
                transactionCount: 2,
                totalAmountMinor: -3500,
                totalAmountDisplay: '35.00 PLN',
                entryIds: [1, 2],
            });
        });

        it('formats tool money output with the matching currency', () => {
            insertEntry({
                sourceRow: 2,
                description: 'Costa Coffee',
                currency: 'CHF',
                amountMinor: -1250,
            });

            expect(
                findTotalMerchantSpendingTool(db, {
                    merchant: 'Costa',
                    currency: 'CHF',
                }),
            ).toMatchObject({
                currency: 'CHF',
                totalAmountDisplay: '12.50 CHF',
            });
        });
    });
});
