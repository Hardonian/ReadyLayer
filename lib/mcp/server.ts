import * as readline from 'node:readline';

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    additionalProperties: boolean;
  };
}

interface StdioLike {
  stdin: NodeJS.ReadableStream;
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
}

function sendResponse(
  out: NodeJS.WritableStream,
  id: string | number | null | undefined,
  result?: unknown,
  error?: JsonRpcError,
): void {
  if (typeof id === 'undefined') {
    return;
  }

  out.write(`${JSON.stringify({ jsonrpc: '2.0', id, ...(error ? { error } : { result }) })}\n`);
}

function getTools(): ToolDefinition[] {
  return [
    {
      name: 'readylayer.health',
      description: 'Returns ReadyLayer MCP health metadata.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: 'readylayer.echo',
      description: 'Echoes a provided message for connectivity validation.',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  ];
}

async function callTool(name: string, args?: Record<string, unknown>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  if (name === 'readylayer.health') {
    return {
      content: [{ type: 'text', text: JSON.stringify({ ok: true, service: 'readylayer', transport: 'stdio' }) }],
    };
  }

  if (name === 'readylayer.echo') {
    const message = typeof args?.message === 'string' ? args.message : '';
    return {
      content: [{ type: 'text', text: message }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

async function handleMessage(streams: StdioLike, message: string): Promise<void> {
  let request: JsonRpcRequest;
  try {
    request = JSON.parse(message) as JsonRpcRequest;
  } catch {
    streams.stderr.write('Invalid JSON message received\n');
    return;
  }

  if (request.jsonrpc !== '2.0' || !request.method) {
    sendResponse(streams.stdout, request.id, undefined, {
      code: -32600,
      message: 'Invalid Request',
    });
    return;
  }

  if (request.method === 'initialize') {
    sendResponse(streams.stdout, request.id, {
      protocolVersion: '2024-11-05',
      serverInfo: {
        name: 'readylayer-mcp',
        version: '1.0.0',
      },
      capabilities: {
        tools: {
          listChanged: false,
        },
      },
    });
    return;
  }

  if (request.method === 'tools/list') {
    sendResponse(streams.stdout, request.id, { tools: getTools() });
    return;
  }

  if (request.method === 'tools/call') {
    const params = request.params ?? {};
    const name = typeof params.name === 'string' ? params.name : '';
    const args = typeof params.arguments === 'object' && params.arguments && !Array.isArray(params.arguments)
      ? params.arguments as Record<string, unknown>
      : {};

    try {
      const result = await callTool(name, args);
      sendResponse(streams.stdout, request.id, result);
    } catch (error) {
      sendResponse(streams.stdout, request.id, undefined, {
        code: -32602,
        message: error instanceof Error ? error.message : 'Tool call failed',
      });
    }
    return;
  }

  sendResponse(streams.stdout, request.id, undefined, {
    code: -32601,
    message: `Method not found: ${request.method}`,
  });
}

export async function startMcpServer(streams: StdioLike = process): Promise<void> {
  const rl = readline.createInterface({ input: streams.stdin, crlfDelay: Infinity });

  const shutdown = (): void => {
    rl.close();
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  for await (const line of rl) {
    if (!line.trim()) {
      continue;
    }
    await handleMessage(streams, line);
  }
}
