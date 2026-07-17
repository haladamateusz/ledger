import Database from 'better-sqlite3';
import type { Database as SqliteDatabase } from 'better-sqlite3';
import type { LedgerEntry } from '../domain/ledger-entry.ts';

export function openLedgerDatabase(path: string): SqliteDatabase {
    return new Database(path);
}

export function initializeLedgerDatabase(db: SqliteDatabase): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS ledger_entries (
            id INTEGER PRIMARY KEY,

            source TEXT NOT NULL,
            source_type TEXT NOT NULL,

            occurred_at TEXT NOT NULL,
            description TEXT NOT NULL,

            amount_minor INTEGER NOT NULL,
            fee_minor INTEGER NOT NULL DEFAULT 0,
            currency TEXT NOT NULL CHECK (
                currency IN ('PLN', 'CHF', 'EUR')
            ),

            status TEXT NOT NULL CHECK (
                status IN ('posted', 'reversed', 'pending', 'failed')
            ),

            source_file TEXT NOT NULL,
            source_row INTEGER NOT NULL,

            UNIQUE(source, source_file, source_row)
        );
    `);
}

export function insertLedgerEntry(db: SqliteDatabase, entry: LedgerEntry): Database.RunResult {
    const statement = db.prepare(`
        INSERT INTO ledger_entries (
            source,
            source_type,
            occurred_at,
            description,
            amount_minor,
            fee_minor,
            currency,
            status,
            source_file,
            source_row
        )
        VALUES (
            @source,
            @sourceType,
            @occurredAt,
            @description,
            @amountMinor,
            @feeMinor,
            @currency,
            @status,
            @sourceFile,
            @sourceRow
        )
        ON CONFLICT(source, source_file, source_row) DO NOTHING
    `);

    return statement.run(entry);
}
