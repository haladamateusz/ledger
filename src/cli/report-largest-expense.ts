import { parseArgs } from 'node:util';
import { z } from 'zod';
import { openLedgerDatabase } from '../storage/sqlite.ts';
import { findLargestExpense, type LargestExpenseOptions } from '../reports/largest-expense.ts';
import { datePattern } from '../domain/date.ts';
import { timePattern } from '../domain/time.ts';

const CliArgsSchema = z.object({
    merchant: z.string().min(1).optional(),
    'date-from': z.string().regex(datePattern).optional(),
    'date-to': z.string().regex(datePattern).optional(),
    'time-from': z.string().regex(timePattern).optional(),
    'time-to': z.string().regex(timePattern).optional(),
    db: z.string().min(1).optional(),
});

const { values } = parseArgs({
    options: {
        merchant: { type: 'string' },
        'date-from': { type: 'string' },
        'date-to': { type: 'string' },
        'time-from': { type: 'string' },
        'time-to': { type: 'string' },
        db: { type: 'string' },
    },
});

const args = CliArgsSchema.parse(values);

const dbPath = args.db ?? 'data/ledger.sqlite';

const options: LargestExpenseOptions = {
    ...(args.merchant ? { merchant: args.merchant } : {}),
    ...(args['date-from'] ? { dateFrom: args['date-from'] } : {}),
    ...(args['date-to'] ? { dateTo: args['date-to'] } : {}),
    ...(args['time-from'] ? { timeFrom: args['time-from'] } : {}),
    ...(args['time-to'] ? { timeTo: args['time-to'] } : {}),
};

const db = openLedgerDatabase(dbPath);

try {
    const result = findLargestExpense(db, options);

    console.log(
        JSON.stringify(
            {
                dbPath,
                filters: options,
                result,
            },
            null,
            2,
        ),
    );
} finally {
    db.close();
}
