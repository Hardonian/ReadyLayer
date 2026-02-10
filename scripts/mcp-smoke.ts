import { runMcpPing } from '../lib/mcp/ping';

async function main(): Promise<void> {
  const result = await runMcpPing();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

void main();
