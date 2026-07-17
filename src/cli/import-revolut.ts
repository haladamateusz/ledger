import { readFileSync, mkdirSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { parse } from 'csv-parse/sync';
import { mapRevolutRowToLedgerEntry } from '../importers/revolut/map-row.ts';
import { RevolutRowSchema } from '../importers/revolut/row-schema.ts';
import {
    initializeLedgerDatabase,
    insertLedgerEntry,
    openLedgerDatabase,
} from '../storage/sqlite.ts';
import type { LedgerEntry } from '../domain/ledger-entry.ts';

const csvPath = process.argv[2];
const dbPath = process.argv[3] ?? 'data/ledger.sqlite';

if (!csvPath) {
    throw new Error('Usage: node src/cli/import-revolut.ts <csv-path> [db-path]');
}

mkdirSync(dirname(dbPath), { recursive: true });

const fileContent = readFileSync(csvPath, 'utf8');

const records: unknown[] = parse(fileContent, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
});

const db = openLedgerDatabase(dbPath);

try {
    initializeLedgerDatabase(db);

    let validRows = 0;
    let invalidRows = 0;
    let mappedRows = 0;
    let insertedRows = 0;

    const invalidRowDetails: Array<{
        csvRow: number;
        issues: Array<{
            field: string;
            message: string;
        }>;
    }> = [];

    const entries: LedgerEntry[] = [];

    for (const [index, record] of records.entries()) {
        const csvRow = index + 2;
        const parsed = RevolutRowSchema.safeParse(record);

        if (!parsed.success) {
            invalidRows += 1;

            invalidRowDetails.push({
                csvRow,
                issues: parsed.error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                })),
            });

            continue;
        }

        validRows += 1;

        const entry = mapRevolutRowToLedgerEntry(parsed.data, {
            sourceFile: basename(csvPath),
            sourceRow: csvRow,
        });

        mappedRows += 1;
        entries.push(entry);
    }

    const insertAll = db.transaction(() => {
        for (const entry of entries) {
            const result = insertLedgerEntry(db, entry);

            if (result.changes > 0) {
                insertedRows += 1;
            }
        }
    });

    insertAll();

    const summary = {
        csvFile: basename(csvPath),
        dbPath,
        totalRows: records.length,
        validRows,
        invalidRows,
        mappedRows,
        insertedRows,
        skippedDuplicateRows: mappedRows - insertedRows,
        invalidRowDetails,
    };

    console.log(JSON.stringify(summary, null, 2));
} finally {
    db.close();
}
