import { z } from 'zod';
import { datePattern } from '../domain/date.ts';

export const NBP_TABLE_A_URL = 'https://api.nbp.pl/api/exchangerates/tables/a/?format=json';

const SupportedNbpCurrencySchema = z.enum(['EUR', 'CHF']);

export type SupportedNbpCurrency = z.infer<typeof SupportedNbpCurrencySchema>;

export type NbpTableARate = {
    code: SupportedNbpCurrency;
    mid: number;
};

export type NbpTableA = {
    table: 'A';
    no: string;
    effectiveDate: string;
    rates: NbpTableARate[];
};

const NbpRemoteRateSchema = z.object({
    currency: z.string(),
    code: z.string(),
    mid: z.number().positive(),
});

const NbpRemoteTableASchema = z.object({
    table: z.literal('A'),
    no: z.string().min(1),
    effectiveDate: z.string().regex(datePattern),
    rates: z.array(NbpRemoteRateSchema),
});

const NbpRemoteTableAResponseSchema = z.array(NbpRemoteTableASchema).min(1);

export async function fetchLatestNbpTableA(): Promise<NbpTableA> {
    const response = await fetch(NBP_TABLE_A_URL, {
        headers: {
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`NBP table A request failed with status ${response.status}`);
    }

    const payload: unknown = await response.json();
    const tables = NbpRemoteTableAResponseSchema.parse(payload);
    const table = tables[0];

    if (!table) {
        throw new Error('NBP table A response did not include a table');
    }

    return {
        table: table.table,
        no: table.no,
        effectiveDate: table.effectiveDate,
        rates: [findRequiredRate(table.rates, 'EUR'), findRequiredRate(table.rates, 'CHF')],
    };
}

function findRequiredRate(
    rates: Array<z.infer<typeof NbpRemoteRateSchema>>,
    code: SupportedNbpCurrency,
): NbpTableARate {
    const rate = rates.find((candidate) => candidate.code === code);

    if (!rate) {
        throw new Error(`NBP table A response did not include ${code}`);
    }

    return {
        code,
        mid: rate.mid,
    };
}
