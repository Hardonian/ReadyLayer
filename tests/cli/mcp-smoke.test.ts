import { describe, expect, it } from 'vitest';
import { runMcpPing } from '@/lib/mcp/ping';

describe('MCP stdio smoke', () => {
  it('handshakes, lists tools, and calls health tool', async () => {
    const result = await runMcpPing();
    expect(result.ok).toBe(true);
  });
});
