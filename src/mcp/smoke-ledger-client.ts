import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const client = new Client({
    name: 'ledger-smoke-client',
    version: '1.0.0',
});

const transport = new StdioClientTransport({
    command: 'node',
    args: ['src/mcp/server.ts'],
    env: {
        ...process.env,
        LEDGER_DB_PATH: 'data/ledger.sqlite',
    },
});

await client.connect(transport);

try {
    const toolsResult = await client.listTools();

    console.log('Available tools:');
    for (const tool of toolsResult.tools) {
        console.log(`- ${tool.name}`);
    }

    const busiestMonth = await client.callTool({
        name: 'find_busiest_merchant_month',
        arguments: {
            merchant: 'Costa',
        },
    });

    console.log('\nfind_busiest_merchant_month:');
    console.log(JSON.stringify(busiestMonth, null, 2));

    const largestExpense = await client.callTool({
        name: 'find_largest_expense',
        arguments: {
            timeFrom: '17:00',
            timeTo: '23:59',
        },
    });

    console.log('\nfind_largest_expense:');
    console.log(JSON.stringify(largestExpense, null, 2));

    const totalMerchantSpending = await client.callTool({
        name: 'find_total_merchant_spending',
        arguments: {
            merchant: 'Costa',
            currency: 'PLN',
        },
    });

    console.log('\nfind_total_merchant_spending:');
    console.log(JSON.stringify(totalMerchantSpending, null, 2));
} finally {
    await client.close();
}
