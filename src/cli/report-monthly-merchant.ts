import { openLedgerDatabase } from '../storage/sqlite.ts';
import { getMonthlyMerchantSpending } from '../reports/monthly-merchant-spending.ts';

const merchant = process.argv[2];
const dbPath = process.argv[3] ?? 'data/ledger.sqlite';

if (!merchant) {
    throw new Error('Usage: node src/cli/report-monthly-merchant.ts <merchant> [db-path]');
}

const db = openLedgerDatabase(dbPath);

try {
    const rows = getMonthlyMerchantSpending(db, { merchant });

    console.log(
        JSON.stringify(
            {
                merchant,
                dbPath,
                rows,
            },
            null,
            2,
        ),
    );
} finally {
    db.close();
}
