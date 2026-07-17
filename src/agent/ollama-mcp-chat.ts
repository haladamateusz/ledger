import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const model = 'mistral-nemo:12b';
const prompt = process.argv.slice(2).join(' ');

if (!prompt) {
    throw new Error('Usage: node src/agent/ollama-mcp-chat.ts "your question"');
}

const mcpClient = new Client({
    name: 'ledger-ollama-client',
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

await mcpClient.connect(transport);

try {
    const { tools } = await mcpClient.listTools();

    const ollamaTools = tools.map((tool) => ({
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description ?? '',
            parameters: tool.inputSchema,
        },
    }));

    const messages: OllamaMessage[] = [
        {
            role: 'system',
            content:
                'You are a finance assistant. Use the available ledger tools to answer questions. Do not guess transaction data. If a tool result is empty, say so clearly. For dinner-related questions, explain that the data only supports filtering by time of day, not true meal category.',
        },
        {
            role: 'user',
            content: prompt,
        },
    ];

    for (let step = 0; step < 5; step += 1) {
        const response = await chatWithOllama({
            model,
            messages,
            tools: ollamaTools,
        });

        const assistantMessage = response.message;
        messages.push(assistantMessage);

        const toolCalls = assistantMessage.tool_calls ?? [];

        if (toolCalls.length === 0) {
            console.log(assistantMessage.content ?? '');
            break;
        }

        for (const toolCall of toolCalls) {
            const toolName = toolCall.function.name;
            const toolArguments = parseToolArguments(toolCall.function.arguments);

            console.error(`[tool:start] ${toolName}`);
            console.error(JSON.stringify(toolArguments, null, 2));

            const toolResult = await mcpClient.callTool({
                name: toolName,
                arguments: toolArguments,
            });

            const structuredResult = extractToolResult(toolResult);

            console.error(`[tool:end] ${toolName}`);
            console.error(JSON.stringify(structuredResult, null, 2));

            messages.push({
                role: 'tool',
                content: JSON.stringify(structuredResult),
            });
        }
    }
} finally {
    await mcpClient.close();
}

type OllamaMessage = {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content?: string;
    tool_calls?: Array<{
        function: {
            name: string;
            arguments?: unknown;
        };
    }>;
};

type OllamaChatResponse = {
    message: OllamaMessage;
};

async function chatWithOllama(input: {
    model: string;
    messages: OllamaMessage[];
    tools: unknown[];
}): Promise<OllamaChatResponse> {
    const response = await fetch('http://127.0.0.1:11434/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: input.model,
            messages: input.messages,
            tools: input.tools,
            stream: false,
        }),
    });

    if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.status} ${await response.text()}`);
    }

    return (await response.json()) as OllamaChatResponse;
}

function parseToolArguments(argumentsValue: unknown): Record<string, unknown> {
    if (!argumentsValue) {
        return {};
    }

    if (typeof argumentsValue === 'string') {
        return JSON.parse(argumentsValue) as Record<string, unknown>;
    }

    return argumentsValue as Record<string, unknown>;
}

function extractToolResult(toolResult: unknown): unknown {
    if (
        typeof toolResult === 'object' &&
        toolResult !== null &&
        'structuredContent' in toolResult
    ) {
        return toolResult.structuredContent;
    }

    return toolResult;
}
