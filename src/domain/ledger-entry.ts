import type { Currency } from "./currency.ts";

export type LedgerStatus =
    | "posted"
    | "reversed"
    | "pending"
    | "failed";

export type LedgerEntry = {
    source: string;
    sourceType: string;

    occurredAt: string;
    description: string;

    amountMinor: number;
    feeMinor: number;
    currency: Currency;

    status: LedgerStatus;

    sourceFile: string;
    sourceRow: number;
};