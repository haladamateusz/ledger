import { describe, expect, it } from 'vitest';
import type { NbpTableA } from '../../src/exchange-rates/nbp.ts';
import { convertCurrencyTool } from '../../src/tools/currency-tools.ts';

const fakeTableA: NbpTableA = {
    table: 'A',
    no: '001/A/NBP/2026',
    effectiveDate: '2026-01-02',
    rates: [
        {
            code: 'EUR',
            mid: 4.25,
        },
        {
            code: 'CHF',
            mid: 4.6,
        },
    ],
};

describe('currency tools', () => {
    it('converts EUR to PLN using NBP table A rates', async () => {
        await expect(
            convertCurrencyTool(
                {
                    amount: '100.00',
                    fromCurrency: 'EUR',
                    toCurrency: 'PLN',
                },
                {
                    fetchTableA: async () => fakeTableA,
                },
            ),
        ).resolves.toEqual({
            amount: '100.00',
            fromCurrency: 'EUR',
            toCurrency: 'PLN',
            convertedAmount: '425.00',
            convertedAmountDisplay: '425.00 PLN',
            rateDate: '2026-01-02',
            source: 'NBP table A average exchange rates',
            tableNo: '001/A/NBP/2026',
        });
    });

    it('converts PLN to CHF using NBP table A rates', async () => {
        await expect(
            convertCurrencyTool(
                {
                    amount: '230.00',
                    fromCurrency: 'PLN',
                    toCurrency: 'CHF',
                },
                {
                    fetchTableA: async () => fakeTableA,
                },
            ),
        ).resolves.toMatchObject({
            convertedAmount: '50.00',
            convertedAmountDisplay: '50.00 CHF',
            rateDate: '2026-01-02',
        });
    });

    it('converts between two foreign currencies through PLN', async () => {
        await expect(
            convertCurrencyTool(
                {
                    amount: '100.00',
                    fromCurrency: 'EUR',
                    toCurrency: 'CHF',
                },
                {
                    fetchTableA: async () => fakeTableA,
                },
            ),
        ).resolves.toMatchObject({
            convertedAmount: '92.39',
            convertedAmountDisplay: '92.39 CHF',
        });
    });

    it('returns the same amount without fetching NBP rates when currencies match', async () => {
        let fetched = false;

        await expect(
            convertCurrencyTool(
                {
                    amount: '123.45',
                    fromCurrency: 'EUR',
                    toCurrency: 'EUR',
                },
                {
                    fetchTableA: async () => {
                        fetched = true;
                        return fakeTableA;
                    },
                },
            ),
        ).resolves.toEqual({
            amount: '123.45',
            fromCurrency: 'EUR',
            toCurrency: 'EUR',
            convertedAmount: '123.45',
            convertedAmountDisplay: '123.45 EUR',
            rateDate: null,
            source: 'No conversion needed',
            tableNo: null,
        });

        expect(fetched).toBe(false);
    });

    it('rounds converted amounts to the target currency minor unit', async () => {
        await expect(
            convertCurrencyTool(
                {
                    amount: '1.00',
                    fromCurrency: 'PLN',
                    toCurrency: 'EUR',
                },
                {
                    fetchTableA: async () => fakeTableA,
                },
            ),
        ).resolves.toMatchObject({
            convertedAmount: '0.24',
            convertedAmountDisplay: '0.24 EUR',
        });
    });

    it('rejects amounts with too many decimal places for the source currency', async () => {
        await expect(
            convertCurrencyTool(
                {
                    amount: '10.001',
                    fromCurrency: 'PLN',
                    toCurrency: 'EUR',
                },
                {
                    fetchTableA: async () => fakeTableA,
                },
            ),
        ).rejects.toThrow('Too many decimal places for PLN');
    });

    it('throws a clear error when the needed NBP rate is missing', async () => {
        const tableWithoutChf: NbpTableA = {
            table: 'A',
            no: '001/A/NBP/2026',
            effectiveDate: '2026-01-02',
            rates: [
                {
                    code: 'EUR',
                    mid: 4.25,
                },
            ],
        };

        await expect(
            convertCurrencyTool(
                {
                    amount: '100.00',
                    fromCurrency: 'PLN',
                    toCurrency: 'CHF',
                },
                {
                    fetchTableA: async () => tableWithoutChf,
                },
            ),
        ).rejects.toThrow('NBP table A did not include CHF');
    });
});
