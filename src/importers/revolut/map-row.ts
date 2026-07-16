import { CurrencySchema } from "../../domain/currency.ts";
import type { LedgerEntry, LedgerStatus } from "../../domain/ledger-entry.ts";
import { parseDecimalToMinorUnits } from "../../domain/money.ts";
import type { RevolutRow } from "./row-schema.ts";
import { revolutTimestampPattern } from "./patterns.ts";

export type MapRevolutRowOptions = {
    sourceFile: string;
    sourceRow: number;
};

type DateTimeParts = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
};

export function mapRevolutRowToLedgerEntry(
    row: RevolutRow,
    options: MapRevolutRowOptions,
): LedgerEntry {
    const currency = CurrencySchema.parse(row.Currency);

    return {
        source: "revolut",
        sourceType: row.Type,
        occurredAt: toZonedIsoTimestamp(row["Started Date"]),
        description: row.Description,
        amountMinor: parseDecimalToMinorUnits(row.Amount, currency),
        feeMinor: parseDecimalToMinorUnits(row.Fee, currency),
        currency,
        status: mapStatus(row.State),
        sourceFile: options.sourceFile,
        sourceRow: options.sourceRow,
    };
}

function mapStatus(state: string): LedgerStatus {
    switch (state) {
        case "COMPLETED":
            return "posted";

        case "REVERTED":
            return "reversed";

        default:
            throw new Error(`Unsupported Revolut state: ${state}`);
    }
}


function toZonedIsoTimestamp(revolutTimestamp: string): string {
    const match = revolutTimestampPattern.exec(revolutTimestamp);

    if (!match) {
        throw new Error(`Invalid Revolut timestamp: ${revolutTimestamp}`);
    }

    const [, year, month, day, hour, minute, second] = match;

    const offset = getWarsawOffset({
        year: Number(year),
        month: Number(month),
        day: Number(day),
        hour: Number(hour),
        minute: Number(minute),
        second: Number(second),
    });

    return `${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`;
}

function getWarsawOffset(parts: DateTimeParts): string {
    const approximateInstant = new Date(
        Date.UTC(
            parts.year,
            parts.month - 1,
            parts.day,
            parts.hour,
            parts.minute,
            parts.second,
        ),
    );

    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Warsaw",
        timeZoneName: "longOffset",
    });

    const timeZoneName = formatter
        .formatToParts(approximateInstant)
        .find((part) => part.type === "timeZoneName")?.value;

    if (!timeZoneName) {
        throw new Error("Could not determine Europe/Warsaw offset");
    }

    if (timeZoneName === "GMT") {
        return "+00:00";
    }

    const offsetMatch = /^GMT([+-]\d{2}:\d{2})$/.exec(timeZoneName);

    if (!offsetMatch) {
        throw new Error(`Unexpected timezone offset format: ${timeZoneName}`);
    }

    const offset = offsetMatch[1];

    if (!offset) {
        throw new Error(`Unexpected timezone offset format: ${timeZoneName}`);
    }

    return offset;
}