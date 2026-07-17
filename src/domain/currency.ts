import { z } from 'zod';

export const CurrencySchema = z.enum(['PLN', 'CHF', 'EUR']);

export type Currency = z.infer<typeof CurrencySchema>;

export const currencyExponent: Record<Currency, number> = {
    PLN: 2,
    CHF: 2,
    EUR: 2,
};
