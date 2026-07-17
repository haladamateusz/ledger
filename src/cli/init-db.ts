import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { initializeLedgerDatabase, openLedgerDatabase } from '../storage/sqlite.ts';

const dbPath = process.argv[2] ?? 'data/ledger.sqlite';

mkdirSync(dirname(dbPath), { recursive: true });

const db = openLedgerDatabase(dbPath);

try {
    initializeLedgerDatabase(db);
    console.log(`Initialized database: ${dbPath}`);
} finally {
    db.close();
}
