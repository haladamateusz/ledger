import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database as SqliteDatabase } from 'better-sqlite3';
import type { LedgerEntry } from '../domain/ledger-entry.ts';
import {
    initializeLedgerDatabase,
    insertLedgerEntry,
    openLedgerDatabase,
} from '../storage/sqlite.ts';
import { findTotalMerchantSpending, getTotalMerchantSpending } from './total-merchant-spending.ts';

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

describe('total merchant spending', () => {
    it('sums matching card payments for one merchant and currency', () => {
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

        expect(
            getTotalMerchantSpending(db, {
                merchant: 'costa',
                currency: 'PLN',
            }),
        ).toEqual({
            merchant: 'costa',
            currency: 'PLN',
            transactionCount: 2,
            totalAmountMinor: -3500,
            entryIds: [1, 2],
        });
    });

    it('filters by currency', () => {
        insertEntry({
            sourceRow: 2,
            description: 'Costa Coffee',
            currency: 'PLN',
            amountMinor: -1000,
        });

        insertEntry({
            sourceRow: 3,
            description: 'Costa Coffee',
            currency: 'CHF',
            amountMinor: -5000,
        });

        expect(
            getTotalMerchantSpending(db, {
                merchant: 'Costa',
                currency: 'PLN',
            }),
        ).toEqual({
            merchant: 'Costa',
            currency: 'PLN',
            transactionCount: 1,
            totalAmountMinor: -1000,
            entryIds: [1],
        });
    });

    it('matches merchant case-insensitively', () => {
        insertEntry({
            sourceRow: 2,
            description: 'COSTA COFFEE',
            currency: 'PLN',
            amountMinor: -1000,
        });

        expect(
            getTotalMerchantSpending(db, {
                merchant: 'costa',
                currency: 'PLN',
            }),
        ).toMatchObject({
            transactionCount: 1,
            totalAmountMinor: -1000,
        });
    });

    it('excludes reversed transactions', () => {
        insertEntry({
            sourceRow: 2,
            description: 'Costa Coffee',
            currency: 'PLN',
            status: 'reversed',
            amountMinor: -9999,
        });

        insertEntry({
            sourceRow: 3,
            description: 'Costa Coffee',
            currency: 'PLN',
            status: 'posted',
            amountMinor: -1000,
        });

        expect(
            getTotalMerchantSpending(db, {
                merchant: 'Costa',
                currency: 'PLN',
            }),
        ).toMatchObject({
            transactionCount: 1,
            totalAmountMinor: -1000,
            entryIds: [2],
        });
    });

    it('excludes non-card-payment source types', () => {
        insertEntry({
            sourceRow: 2,
            sourceType: 'Exchange',
            description: 'Exchanged to PLN',
            currency: 'PLN',
            amountMinor: -9999,
        });

        insertEntry({
            sourceRow: 3,
            sourceType: 'Card Payment',
            description: 'Costa Coffee',
            currency: 'PLN',
            amountMinor: -1000,
        });

        expect(
            getTotalMerchantSpending(db, {
                merchant: 'Costa',
                currency: 'PLN',
            }),
        ).toMatchObject({
            transactionCount: 1,
            totalAmountMinor: -1000,
            entryIds: [2],
        });
    });

    it('returns null when no merchant matches', () => {
        expect(
            getTotalMerchantSpending(db, {
                merchant: 'missing',
                currency: 'PLN',
            }),
        ).toBeNull();
    });

    it('uses findTotalMerchantSpending as the public wrapper', () => {
        insertEntry({
            sourceRow: 2,
            description: 'Costa Coffee',
            currency: 'PLN',
            amountMinor: -1000,
        });

        expect(
            findTotalMerchantSpending(db, {
                merchant: 'Costa',
                currency: 'PLN',
            }),
        ).toEqual({
            merchant: 'Costa',
            currency: 'PLN',
            transactionCount: 1,
            totalAmountMinor: -1000,
            entryIds: [1],
        });
    });
});
