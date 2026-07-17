import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const client = new Client({
    name: 'currency-smoke-client',
    version: '1.0.0',
});

const transport = new StdioClientTransport({
    command: 'node',
    args: ['src/mcp/server.ts'],
});

await client.connect(transport);

try {
    const toolsResult = await client.listTools();

    console.log('Available tools:');
    for (const tool of toolsResult.tools) {
        console.log(`- ${tool.name}`);
    }

    const converted = await client.callTool({
        name: 'convert_currency',
        arguments: {
            amount: '100.00',
            fromCurrency: 'EUR',
            toCurrency: 'CHF',
        },
    });

    console.log('\nconvert_currency:');
    console.log(JSON.stringify(converted, null, 2));
} finally {
    await client.close();
}
