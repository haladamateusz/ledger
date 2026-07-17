import { type Currency, currencyExponent } from '../domain/currency.ts';
import { parseDecimalToMinorUnits } from '../domain/money.ts';
import { formatMoneyMinor } from '../presentation/money.ts';
import { fetchLatestNbpTableA, type NbpTableA } from '../exchange-rates/nbp.ts';

export type ConvertCurrencyToolInput = {
    amount: string;
    fromCurrency: Currency;
    toCurrency: Currency;
};

export type ConvertCurrencyToolResult = {
    amount: string;
    fromCurrency: Currency;
    toCurrency: Currency;
    convertedAmount: string;
    convertedAmountDisplay: string;
    rateDate: string | null;
    source: string;
    tableNo: string | null;
};

export type ConvertCurrencyToolOptions = {
    fetchTableA?: () => Promise<NbpTableA>;
};

export async function convertCurrencyTool(
    input: ConvertCurrencyToolInput,
    options: ConvertCurrencyToolOptions = {},
): Promise<ConvertCurrencyToolResult> {
    const sourceMinor = parseDecimalToMinorUnits(input.amount, input.fromCurrency);

    if (input.fromCurrency === input.toCurrency) {
        return {
            amount: input.amount,
            fromCurrency: input.fromCurrency,
            toCurrency: input.toCurrency,
            convertedAmount: formatMinorAsDecimal(sourceMinor, input.toCurrency),
            convertedAmountDisplay: formatMoneyMinor(sourceMinor, input.toCurrency),
            rateDate: null,
            source: 'No conversion needed',
            tableNo: null,
        };
    }

    const fetchTableA = options.fetchTableA ?? fetchLatestNbpTableA;
    const table = await fetchTableA();

    const ratesToPln = buildRatesToPln(table);
    const sourceMajor = minorToMajor(sourceMinor, input.fromCurrency);

    const convertedMajor =
        (sourceMajor * ratesToPln[input.fromCurrency]) / ratesToPln[input.toCurrency];

    const convertedMinor = majorToMinor(convertedMajor, input.toCurrency);

    return {
        amount: input.amount,
        fromCurrency: input.fromCurrency,
        toCurrency: input.toCurrency,
        convertedAmount: formatMinorAsDecimal(convertedMinor, input.toCurrency),
        convertedAmountDisplay: formatMoneyMinor(convertedMinor, input.toCurrency),
        rateDate: table.effectiveDate,
        source: 'NBP table A average exchange rates',
        tableNo: table.no,
    };
}

function buildRatesToPln(table: NbpTableA): Record<Currency, number> {
    return {
        PLN: 1,
        EUR: findRate(table, 'EUR'),
        CHF: findRate(table, 'CHF'),
    };
}

function findRate(table: NbpTableA, currency: Exclude<Currency, 'PLN'>): number {
    const rate = table.rates.find((candidate) => candidate.code === currency);

    if (!rate) {
        throw new Error(`NBP table A did not include ${currency}`);
    }

    return rate.mid;
}

function minorToMajor(amountMinor: number, currency: Currency): number {
    return amountMinor / 10 ** currencyExponent[currency];
}

function majorToMinor(amountMajor: number, currency: Currency): number {
    return Math.round(amountMajor * 10 ** currencyExponent[currency]);
}

function formatMinorAsDecimal(amountMinor: number, currency: Currency): string {
    const exponent = currencyExponent[currency];
    const sign = amountMinor < 0 ? '-' : '';
    const absoluteMinor = Math.abs(amountMinor);

    const divisor = 10 ** exponent;
    const whole = Math.floor(absoluteMinor / divisor);
    const fractional = String(absoluteMinor % divisor).padStart(exponent, '0');

    return `${sign}${whole}.${fractional}`;
}
