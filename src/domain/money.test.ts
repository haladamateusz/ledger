import { describe, expect, it } from 'vitest';
import { parseDecimalToMinorUnits } from './money.ts';

describe('parseDecimalToMinorUnits', () => {
    it('parses whole units', () => {
        expect(parseDecimalToMinorUnits('12', 'PLN')).toBe(1200);
        expect(parseDecimalToMinorUnits('12', 'EUR')).toBe(1200);
        expect(parseDecimalToMinorUnits('12', 'CHF')).toBe(1200);
    });

    it('parses decimal units', () => {
        expect(parseDecimalToMinorUnits('12.34', 'EUR')).toBe(1234);
        expect(parseDecimalToMinorUnits('12.3', 'CHF')).toBe(1230);
        expect(parseDecimalToMinorUnits('0.01', 'PLN')).toBe(1);
    });

    it('parses negative amounts', () => {
        expect(parseDecimalToMinorUnits('-12.34', 'EUR')).toBe(-1234);
        expect(parseDecimalToMinorUnits('-12', 'PLN')).toBe(-1200);
        expect(parseDecimalToMinorUnits('-0.01', 'CHF')).toBe(-1);
    });

    it('normalizes zero', () => {
        expect(parseDecimalToMinorUnits('0', 'EUR')).toBe(0);
        expect(parseDecimalToMinorUnits('0.00', 'EUR')).toBe(0);
        expect(parseDecimalToMinorUnits('-0.00', 'EUR')).toBe(0);
    });

    it('rejects too many decimal places', () => {
        expect(() => parseDecimalToMinorUnits('12.345', 'EUR')).toThrow('Too many decimal places');
    });

    it('rejects invalid decimal strings', () => {
        expect(() => parseDecimalToMinorUnits('', 'EUR')).toThrow('Invalid decimal amount');
        expect(() => parseDecimalToMinorUnits('12.', 'EUR')).toThrow('Invalid decimal amount');
        expect(() => parseDecimalToMinorUnits('.12', 'EUR')).toThrow('Invalid decimal amount');
        expect(() => parseDecimalToMinorUnits('12,34', 'EUR')).toThrow('Invalid decimal amount');
    });
});
