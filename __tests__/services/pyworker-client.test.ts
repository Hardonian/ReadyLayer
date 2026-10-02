import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as net from 'net';
import { EventEmitter } from 'events';
import { PyWorkerIpcClient } from '../../services/worker-py/client';

class MockSocket extends EventEmitter {
  public write = vi.fn((data: string) => {
    // Simulate server response on next tick
    setTimeout(() => {
      const parsed = JSON.parse(data.trim());
      if (parsed.method === 'ping') {
        this.emit('data', Buffer.from(JSON.stringify({
          jsonrpc: '2.0',
          id: parsed.id,
          result: { status: 'ok', handlers: ['ast_analysis', 'model_inference'], pid: 12345 }
        }) + '\n'));
      } else if (parsed.method === 'execute') {
        this.emit('data', Buffer.from(JSON.stringify({
          jsonrpc: '2.0',
          id: parsed.id,
          result: { issues: [], complexity: 12 }
        }) + '\n'));
      }
    }, 10);
    return true;
  });
  public end = vi.fn();
  public destroy = vi.fn();
}

vi.mock('net', () => ({
  createConnection: vi.fn(),
}));

describe('Python Worker IPC Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('connects and receives ping response over socket', async () => {
    const mockSocket = new MockSocket();
    vi.mocked(net.createConnection).mockImplementation((_opts: any, cb: any) => {
      setTimeout(cb, 5);
      return mockSocket as any;
    });

    const client = new PyWorkerIpcClient({ host: '127.0.0.1', port: 50051 });
    const res = await client.ping();

    expect(res.status).toBe('ok');
    expect(res.handlers).toContain('ast_analysis');
    expect(res.pid).toBe(12345);
  });

  it('executes task over IPC and measures duration', async () => {
    const mockSocket = new MockSocket();
    vi.mocked(net.createConnection).mockImplementation((_opts: any, cb: any) => {
      setTimeout(cb, 5);
      return mockSocket as any;
    });

    const client = new PyWorkerIpcClient();
    const res = await client.executeTask('ast_analysis', { file: 'index.ts' });

    expect(res.status).toBe('success');
    expect(res.data).toEqual({ issues: [], complexity: 12 });
    expect(res.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('handles socket connection failure gracefully', async () => {
    const mockSocket = new MockSocket();
    vi.mocked(net.createConnection).mockImplementation(() => {
      setTimeout(() => {
        mockSocket.emit('error', new Error('ECONNREFUSED'));
      }, 5);
      return mockSocket as any;
    });

    const client = new PyWorkerIpcClient();
    const res = await client.executeTask('ast_analysis', {});

    expect(res.status).toBe('error');
    expect(res.error).toContain('ECONNREFUSED');
  });
});
