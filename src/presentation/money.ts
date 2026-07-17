import { currencyExponent, type Currency } from '../domain/currency.ts';

export type FormatMoneyOptions = {
    absolute?: boolean;
};

export function formatMoneyMinor(
    amountMinor: number,
    currency: Currency,
    options: FormatMoneyOptions = {},
): string {
    const exponent = currencyExponent[currency];
    const sign = amountMinor < 0 && !options.absolute ? '-' : '';
    const absoluteMinor = Math.abs(amountMinor);

    const divisor = 10 ** exponent;
    const whole = Math.floor(absoluteMinor / divisor);
    const fractional = String(absoluteMinor % divisor).padStart(exponent, '0');

    return `${sign}${whole}.${fractional} ${currency}`;
}
