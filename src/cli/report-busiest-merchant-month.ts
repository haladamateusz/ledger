import { openLedgerDatabase } from '../storage/sqlite.ts';
import { findBusiestMerchantMonth } from '../reports/monthly-merchant-spending.ts';

const merchant = process.argv[2];
const dbPath = process.argv[3] ?? 'data/ledger.sqlite';

if (!merchant) {
    throw new Error('Usage: node src/cli/report-busiest-merchant-month.ts <merchant> [db-path]');
}

const db = openLedgerDatabase(dbPath);

try {
    const row = findBusiestMerchantMonth(db, { merchant });

    console.log(
        JSON.stringify(
            {
                merchant,
                dbPath,
                result: row,
            },
            null,
            2,
        ),
    );
} finally {
    db.close();
}
