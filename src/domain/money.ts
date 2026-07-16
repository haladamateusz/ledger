import type { Currency } from "./currency.ts";
import { currencyExponent } from "./currency.ts";
import { decimalPattern } from "./decimal.ts";

export function parseDecimalToMinorUnits(
    amount: string,
    currency: Currency,
): number {
    if (!decimalPattern.test(amount)) {
        throw new Error(`Invalid decimal amount: ${amount}`);
    }

    const exponent = currencyExponent[currency];

    const isNegative = amount.startsWith("-");
    const unsignedAmount = isNegative ? amount.slice(1) : amount;

    const [wholePart, fractionalPart = ""] = unsignedAmount.split(".");

    if (fractionalPart.length > exponent) {
        throw new Error(
            `Too many decimal places for ${currency}: expected at most ${exponent}`,
        );
    }

    const paddedFractionalPart = fractionalPart.padEnd(exponent, "0");
    const minorUnitsText = `${wholePart}${paddedFractionalPart}`;

    const unsignedMinorUnits = BigInt(minorUnitsText);
    const minorUnits = isNegative ? -unsignedMinorUnits : unsignedMinorUnits;

    if (
        minorUnits < BigInt(Number.MIN_SAFE_INTEGER) ||
        minorUnits > BigInt(Number.MAX_SAFE_INTEGER)
    ) {
        throw new Error(`Amount is outside safe integer range: ${amount} ${currency}`);
    }

    return Number(minorUnits);
}