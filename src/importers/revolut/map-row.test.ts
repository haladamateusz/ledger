import { describe, expect, it } from "vitest";
import { mapRevolutRowToLedgerEntry } from "../../../src/importers/revolut/map-row.ts";
import type { RevolutRow } from "../../../src/importers/revolut/row-schema.ts";

const baseRow: RevolutRow = {
    Type: "Card Payment",
    Product: "Current",
    "Started Date": "2025-07-02 17:33:26",
    "Completed Date": "2025-07-02 17:33:26",
    Description: "Costa Coffee",
    Amount: "-12.34",
    Fee: "0",
    Currency: "PLN",
    State: "COMPLETED",
    Balance: "100.00",
};

describe("mapRevolutRowToLedgerEntry", () => {
    it("maps a completed Revolut row to a posted ledger entry", () => {
        const entry = mapRevolutRowToLedgerEntry(baseRow, {
            sourceFile: "statement.csv",
            sourceRow: 2,
        });

        expect(entry).toEqual({
            source: "revolut",
            sourceType: "Card Payment",
            occurredAt: "2025-07-02T17:33:26+02:00",
            description: "Costa Coffee",
            amountMinor: -1234,
            feeMinor: 0,
            currency: "PLN",
            status: "posted",
            sourceFile: "statement.csv",
            sourceRow: 2,
        });
    });

    it("maps a reverted Revolut row to a reversed ledger entry", () => {
        const entry = mapRevolutRowToLedgerEntry(
            {
                ...baseRow,
                State: "REVERTED",
                Balance: "",
            },
            {
                sourceFile: "statement.csv",
                sourceRow: 22,
            },
        );

        expect(entry.status).toBe("reversed");
        expect(entry.sourceRow).toBe(22);
    });

    it("uses Europe/Warsaw summer offset", () => {
        const entry = mapRevolutRowToLedgerEntry(baseRow, {
            sourceFile: "statement.csv",
            sourceRow: 2,
        });

        expect(entry.occurredAt).toBe("2025-07-02T17:33:26+02:00");
    });

    it("uses Europe/Warsaw winter offset", () => {
        const entry = mapRevolutRowToLedgerEntry(
            {
                ...baseRow,
                "Started Date": "2025-12-02 17:33:26",
            },
            {
                sourceFile: "statement.csv",
                sourceRow: 3,
            },
        );

        expect(entry.occurredAt).toBe("2025-12-02T17:33:26+01:00");
    });

    it("converts amount and fee to minor units", () => {
        const entry = mapRevolutRowToLedgerEntry(
            {
                ...baseRow,
                Amount: "-42.50",
                Fee: "1.25",
                Currency: "CHF",
            },
            {
                sourceFile: "statement.csv",
                sourceRow: 4,
            },
        );

        expect(entry.amountMinor).toBe(-4250);
        expect(entry.feeMinor).toBe(125);
        expect(entry.currency).toBe("CHF");
    });

    it("rejects unsupported currencies", () => {
        expect(() =>
            mapRevolutRowToLedgerEntry(
                {
                    ...baseRow,
                    Currency: "GBP",
                },
                {
                    sourceFile: "statement.csv",
                    sourceRow: 5,
                },
            ),
        ).toThrow();
    });

    it("rejects unsupported Revolut states", () => {
        expect(() =>
            mapRevolutRowToLedgerEntry(
                {
                    ...baseRow,
                    State: "DECLINED",
                },
                {
                    sourceFile: "statement.csv",
                    sourceRow: 6,
                },
            ),
        ).toThrow("Unsupported Revolut state");
    });
});