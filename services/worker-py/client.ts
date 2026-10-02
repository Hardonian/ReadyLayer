/**
 * Python Worker IPC Client
 * 
 * Communicates with the Python workhorse worker service over low-latency
 * JSON-RPC (TCP or Unix Domain Socket) for sub-50ms task execution.
 */

import * as net from 'net';
import { logger } from '../../observability/logging';

export interface PyWorkerExecuteResult<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
  durationMs: number;
}

export class PyWorkerIpcClient {
  private host: string;
  private port: number;
  private socketPath?: string;

  constructor(options?: { host?: string; port?: number; socketPath?: string }) {
    this.host = options?.host || process.env.PYTHON_WORKER_IPC_HOST || '127.0.0.1';
    this.port = options?.port || Number(process.env.PYTHON_WORKER_IPC_PORT) || 50051;
    this.socketPath = options?.socketPath || process.env.PYTHON_WORKER_SOCKET_PATH;
  }

  /**
   * Send JSON-RPC call over socket
   */
  public async call<T = unknown>(
    method: string,
    params: Record<string, unknown> = {},
    timeoutMs: number = 10000
  ): Promise<T> {
    const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
    return new Promise<T>((resolve, reject) => {
      let isResolved = false;

      const connectOpts = this.socketPath && process.platform !== 'win32'
        ? { path: this.socketPath }
        : { host: this.host, port: this.port };

      const socket: net.Socket = net.createConnection(connectOpts as net.NetConnectOpts, () => {
        socket.write(payload);
      });

      const timer = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          socket.destroy();
          reject(new Error(`Python IPC request timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      let buffer = '';

      socket.on('data', (chunk) => {
        buffer += chunk.toString();
        if (buffer.includes('\n')) {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timer);
            socket.end();
            try {
              const res = JSON.parse(buffer.trim()) as {
                id: string;
                result?: T;
                error?: { message: string; code: number };
              };
              if (res.error) {
                reject(new Error(res.error.message));
              } else {
                resolve(res.result as T);
              }
            } catch (err) {
              reject(err);
            }
          }
        }
      });

      socket.on('error', (err) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timer);
          reject(err);
        }
      });
    });
  }

  /**
   * Ping worker
   */
  public async ping(): Promise<{ status: string; handlers: string[]; pid: number }> {
    return this.call<{ status: string; handlers: string[]; pid: number }>('ping');
  }

  /**
   * Execute task synchronously over IPC
   */
  public async executeTask<T = unknown>(
    jobType: string,
    payload: Record<string, unknown>,
    timeoutMs: number = 15000
  ): Promise<PyWorkerExecuteResult<T>> {
    const start = Date.now();
    try {
      const data = await this.call<T>('execute', { job_type: jobType, payload }, timeoutMs);
      return {
        status: 'success',
        data,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      logger.warn(`Python worker IPC execution failed for ${jobType}: ${String(err)}`);
      return {
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      };
    }
  }
}

export const pyWorkerClient = new PyWorkerIpcClient();
