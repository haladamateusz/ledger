import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { parse } from 'csv-parse/sync';
import { RevolutRowSchema } from '../importers/revolut/row-schema.ts';

const csvPath = process.argv[2];

if (!csvPath) {
    throw new Error('Usage: node src/cli/inspect-revolut.ts <csv-path>');
}

const fileContent = readFileSync(csvPath, 'utf8');

const records: unknown[] = parse(fileContent, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
});

const types = new Set<string>();
const products = new Set<string>();
const currencies = new Set<string>();
const states = new Set<string>();

let validRows = 0;
let invalidRows = 0;

const invalidRowDetails: Array<{
    csvRow: number;
    issues: Array<{
        field: string;
        message: string;
    }>;
}> = [];

for (const [index, record] of records.entries()) {
    const parsed = RevolutRowSchema.safeParse(record);

    if (!parsed.success) {
        invalidRows += 1;
        invalidRowDetails.push({
            csvRow: index + 2,
            issues: parsed.error.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
            })),
        });
        continue;
    }

    validRows += 1;

    types.add(parsed.data.Type);
    products.add(parsed.data.Product);
    currencies.add(parsed.data.Currency);
    states.add(parsed.data.State);
}

const summary = {
    file: basename(csvPath),
    totalRows: records.length,
    validRows,
    invalidRows,
    types: [...types].sort(),
    products: [...products].sort(),
    currencies: [...currencies].sort(),
    states: [...states].sort(),
    invalidRowDetails,
};

console.log(JSON.stringify(summary, null, 2));
