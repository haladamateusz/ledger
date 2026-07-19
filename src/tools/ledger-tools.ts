import type { Database as SqliteDatabase } from 'better-sqlite3';
import {
    findBusiestMerchantMonth,
    type MonthlyMerchantSpendingOptions,
} from '../reports/monthly-merchant-spending.ts';
import { findLargestExpense, type LargestExpenseOptions } from '../reports/largest-expense.ts';
import {
    findTotalMerchantSpending,
    type TotalMerchantSpendingOptions,
} from '../reports/total-merchant-spending.ts';
import { formatMoneyMinor } from '../presentation/money.ts';
import { type Currency, CurrencySchema } from '../domain/currency.ts';
import { type EntriesOptions, getEntries } from '../reports/entries.ts';

export type TotalMerchantSpendingToolResult = {
    merchant: string;
    currency: Currency;
    transactionCount: number;
    totalAmountMinor: number;
    totalAmountDisplay: string;
    entryIds: number[];
};

export type FindLargestExpenseToolResult = {
    id: number | null;
    occurredAt: string | null;
    description: string | null;
    amountMinor: number | null;
    amountDisplay: string | null;
    currency: Currency | null;
    sourceType: string | null;
};

export type FindBusiestMerchantMonthToolResult = {
    merchant: string;
    month: string | null;
    currency: Currency | null;
    transactionCount: number | null;
    totalAmountMinor: number | null;
    totalAmountDisplay: string | null;
    entryIds: number[];
};

export type GetEntriesToolResult = {
    id: number;
    occurredAt: string;
    description: string;
    amountMinor: number;
    amountMinorDisplay: string;
    currency: Currency;
    sourceType: string;
};

export function findBusiestMerchantMonthTool(
    db: SqliteDatabase,
    input: MonthlyMerchantSpendingOptions,
): FindBusiestMerchantMonthToolResult {
    const row = findBusiestMerchantMonth(db, {
        merchant: input.merchant,
    });

    if (!row) {
        return {
            merchant: input.merchant,
            month: null,
            transactionCount: null,
            totalAmountMinor: null,
            currency: null,
            totalAmountDisplay: null,
            entryIds: [],
        };
    }

    return {
        merchant: input.merchant,
        month: row.month,
        transactionCount: row.transactionCount,
        totalAmountMinor: row.totalAmountMinor,
        totalAmountDisplay: formatMoneyMinor(row.totalAmountMinor, row.currency, {
            absolute: true,
        }),
        currency: row.currency,
        entryIds: row.entryIds,
    };
}

export function getEntriesTool(db: SqliteDatabase, input: EntriesOptions): GetEntriesToolResult[] {
    const rows = getEntries(db, input);

    if (!rows.length) {
        return [];
    }

    return rows.map((row) => ({
        id: row.id,
        occurredAt: row.occurredAt,
        description: row.description,
        amountMinor: row.amountMinor,
        amountMinorDisplay: formatMoneyMinor(row.amountMinor, row.currency, {
            absolute: true,
        }),
        currency: row.currency,
        sourceType: row.sourceType,
    }));
}

export function findLargestExpenseTool(
    db: SqliteDatabase,
    input: LargestExpenseOptions = {},
): FindLargestExpenseToolResult {
    const row = findLargestExpense(db, input);

    if (!row) {
        return {
            id: null,
            occurredAt: null,
            description: null,
            amountMinor: null,
            amountDisplay: null,
            currency: null,
            sourceType: null,
        };
    }

    return {
        id: row.id,
        occurredAt: row.occurredAt,
        description: row.description,
        amountMinor: row.amountMinor,
        amountDisplay: formatMoneyMinor(row.amountMinor, row.currency, {
            absolute: true,
        }),
        currency: row.currency,
        sourceType: row.sourceType,
    };
}

export function findTotalMerchantSpendingTool(
    db: SqliteDatabase,
    input: TotalMerchantSpendingOptions,
): TotalMerchantSpendingToolResult {
    const row = findTotalMerchantSpending(db, {
        merchant: input.merchant,
        currency: CurrencySchema.parse(input.currency),
    });

    if (!row) {
        return {
            merchant: input.merchant,
            transactionCount: 0,
            totalAmountMinor: 0,
            totalAmountDisplay: formatMoneyMinor(0, input.currency),
            currency: input.currency,
            entryIds: [],
        };
    }

    return {
        merchant: input.merchant,
        transactionCount: row.transactionCount,
        totalAmountMinor: row.totalAmountMinor,
        totalAmountDisplay: formatMoneyMinor(row.totalAmountMinor, row.currency, {
            absolute: true,
        }),
        currency: row.currency,
        entryIds: row.entryIds,
    };
}
