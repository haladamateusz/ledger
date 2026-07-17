import { describe, expect, it } from 'vitest';
import { formatMoneyMinor } from './money.ts';

describe('formatMoneyMinor', () => {
    it('formats minor units with currency', () => {
        expect(formatMoneyMinor(1234, 'PLN')).toBe('12.34 PLN');
        expect(formatMoneyMinor(5, 'EUR')).toBe('0.05 EUR');
        expect(formatMoneyMinor(1200, 'CHF')).toBe('12.00 CHF');
    });

    it('preserves negative signs by default', () => {
        expect(formatMoneyMinor(-1234, 'PLN')).toBe('-12.34 PLN');
    });

    it('can format expenses as absolute values', () => {
        expect(formatMoneyMinor(-1234, 'PLN', { absolute: true })).toBe('12.34 PLN');
    });
});
