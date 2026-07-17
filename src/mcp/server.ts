import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { datePattern } from '../domain/date.ts';
import { timePattern } from '../domain/time.ts';
import { openLedgerDatabase } from '../storage/sqlite.ts';
import {
    findBusiestMerchantMonthTool,
    findLargestExpenseTool,
    findTotalMerchantSpendingTool,
} from '../tools/ledger-tools.ts';
import type { LargestExpenseOptions } from '../reports/largest-expense.ts';
import { CurrencySchema } from '../domain/currency.ts';
import { decimalPattern } from '../domain/decimal.ts';
import { convertCurrencyTool } from '../tools/currency-tools.ts';

const dbPath = process.env.LEDGER_DB_PATH ?? 'data/ledger.sqlite';

const server = new McpServer({
    name: 'ledger',
    version: '1.0.0',
});

server.registerTool(
    'find_busiest_merchant_month',
    {
        title: 'Find Busiest Merchant Month',
        description:
            'Find the month with the highest number of posted card payments matching a merchant name.',
        inputSchema: {
            merchant: z.string().min(1),
        },
    },
    async ({ merchant }) => {
        const db = openLedgerDatabase(dbPath);

        try {
            const result = findBusiestMerchantMonthTool(db, { merchant });

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result),
                    },
                ],
                structuredContent: result,
            };
        } finally {
            db.close();
        }
    },
);

server.registerTool(
    'find_largest_expense',
    {
        title: 'Find Largest Expense',
        description:
            'Find the largest posted card payment, optionally filtered by merchant, date range, and time range. Time filters can approximate meal periods, but no transaction category is available.',
        inputSchema: {
            merchant: z.string().min(1).optional(),
            dateFrom: z.string().regex(datePattern).optional(),
            dateTo: z.string().regex(datePattern).optional(),
            timeFrom: z.string().regex(timePattern).optional(),
            timeTo: z.string().regex(timePattern).optional(),
        },
    },
    async (input) => {
        const db = openLedgerDatabase(dbPath);

        try {
            const options: LargestExpenseOptions = {
                ...(input.merchant ? { merchant: input.merchant } : {}),
                ...(input.dateFrom ? { dateFrom: input.dateFrom } : {}),
                ...(input.dateTo ? { dateTo: input.dateTo } : {}),
                ...(input.timeFrom ? { timeFrom: input.timeFrom } : {}),
                ...(input.timeTo ? { timeTo: input.timeTo } : {}),
            };

            const result = findLargestExpenseTool(db, options);

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result),
                    },
                ],
                structuredContent: result,
            };
        } finally {
            db.close();
        }
    },
);

server.registerTool(
    'find_total_merchant_spending',
    {
        title: 'Find Total Merchant Spending',
        description:
            "Find the total posted card-payment spending for one merchant in one currency. Use this for questions like 'How much did I spend at Costa in PLN?'.",
        inputSchema: {
            merchant: z.string().min(1),
            currency: CurrencySchema,
        },
    },
    async ({ merchant, currency }) => {
        const db = openLedgerDatabase(dbPath);

        try {
            const result = findTotalMerchantSpendingTool(db, { merchant, currency });

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result),
                    },
                ],
                structuredContent: result,
            };
        } finally {
            db.close();
        }
    },
);

server.registerTool(
    'convert_currency',
    {
        title: 'Convert Currency',
        description:
            'Convert between PLN, EUR, and CHF using the latest NBP table A average exchange rates.',
        inputSchema: {
            amount: z.string().regex(decimalPattern),
            fromCurrency: CurrencySchema,
            toCurrency: CurrencySchema,
        },
    },
    async (input) => {
        const result = await convertCurrencyTool(input);

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result),
                },
            ],
            structuredContent: result,
        };
    },
);

async function main(): Promise<void> {
    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Important: stdio MCP servers must not write protocol-noise to stdout.
    console.error('Ledger MCP server running on stdio');
}

main().catch((error) => {
    console.error('Fatal error in Ledger MCP server:', error);
    process.exit(1);
});
