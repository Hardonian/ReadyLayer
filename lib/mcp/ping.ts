import { once } from 'node:events';
import { spawn } from 'node:child_process';
import * as path from 'node:path';

interface JsonRpcResponse {
  id?: number;
  result?: unknown;
  error?: { code: number; message: string };
}

async function request(
  child: ReturnType<typeof spawn>,
  payload: Record<string, unknown>,
  expectedId: number,
  timeoutMs: number,
): Promise<JsonRpcResponse> {
  if (!child.stdin || !child.stdout) {
    throw new Error('Failed to open stdio pipes for MCP ping');
  }

  const stdout = child.stdout;
  child.stdin.write(`${JSON.stringify(payload)}\n`);

  const deadline = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`MCP request timeout for id=${expectedId}`)), timeoutMs);
  });

  const receive = (async (): Promise<JsonRpcResponse> => {
    while (true) {
      const event = await once(stdout, 'data');
      const chunk = event[0] as Buffer | string;
      const lines = String(chunk).split('\n').filter(Boolean);
      for (const line of lines) {
        const parsed = JSON.parse(line) as JsonRpcResponse;
        if (parsed.id === expectedId) {
          return parsed;
        }
      }
    }
  })();

  return Promise.race([receive, deadline]);
}

export async function runMcpPing(timeoutMs = 2000): Promise<Record<string, unknown>> {
  const cliPath = path.resolve(process.cwd(), 'cli/readylayer-cli.ts');
  const child = spawn('npx', ['tsx', cliPath, 'mcp', 'serve'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  try {
    const init = await request(
      child,
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05' } },
      1,
      timeoutMs,
    );

    if (init.error) {
      throw new Error(`initialize failed: ${init.error.message}`);
    }

    const list = await request(child, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, 2, timeoutMs);
    if (list.error) {
      throw new Error(`tools/list failed: ${list.error.message}`);
    }

    const call = await request(
      child,
      { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'readylayer.health', arguments: {} } },
      3,
      timeoutMs,
    );

    if (call.error) {
      throw new Error(`tools/call failed: ${call.error.message}`);
    }

    return {
      ok: true,
      initialize: init.result,
      tools: list.result,
      call: call.result,
    };
  } finally {
    child.kill('SIGTERM');
  }
}
