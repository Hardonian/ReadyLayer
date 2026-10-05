/**
 * Ephemeral Sandbox Execution Manager
 *
 * Provides isolated sandbox execution environments for running untrusted AI-generated code
 * and test suites with CPU, memory, network, and timeout constraints.
 * Development may use an isolated temporary directory process fallback. Production fails
 * closed when a container sandbox is unavailable.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import { logger } from '../../observability/logging';

export interface SandboxOptions {
  image?: string;
  memoryLimitMb?: number;
  cpuLimit?: number;
  networkEnabled?: boolean;
  timeoutMs?: number;
  env?: Record<string, string>;
  workingDir?: string;
  allowProcessFallback?: boolean;
}

export interface SandboxFile {
  path: string;
  content: string;
}

export interface SandboxExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  sandboxType: 'docker' | 'process' | 'unavailable';
}

export class SandboxManager {
  private isDockerAvailableCache: boolean | null = null;

  /**
   * Check if Docker CLI is available on the system.
   */
  async isDockerAvailable(): Promise<boolean> {
    if (this.isDockerAvailableCache !== null) {
      return this.isDockerAvailableCache;
    }

    return new Promise<boolean>((resolve) => {
      const proc = spawn('docker', ['--version']);
      proc.on('error', () => {
        this.isDockerAvailableCache = false;
        resolve(false);
      });
      proc.on('close', (code) => {
        this.isDockerAvailableCache = code === 0;
        resolve(this.isDockerAvailableCache);
      });
    });
  }

  /**
   * Run command in an ephemeral sandbox with supplied virtual files.
   */
  async runInSandbox(
    command: string[],
    files: SandboxFile[] = [],
    options: SandboxOptions = {}
  ): Promise<SandboxExecutionResult> {
    const hasDocker = await this.isDockerAvailable();

    if (hasDocker && options.image) {
      try {
        return await this.runDockerSandbox(command, files, options);
      } catch (err) {
        logger.warn({ err }, 'Docker sandbox execution failed');
      }
    }

    if (!this.canUseProcessFallback(options)) {
      return {
        exitCode: -1,
        stdout: '',
        stderr: 'Container sandbox is required in production. Configure Docker and a sandbox image.',
        durationMs: 0,
        timedOut: false,
        sandboxType: 'unavailable',
      };
    }

    return this.runProcessSandbox(command, files, options);
  }

  private canUseProcessFallback(options: SandboxOptions): boolean {
    return process.env.NODE_ENV !== 'production' && options.allowProcessFallback !== false;
  }

  /**
   * Docker-isolated container execution.
   */
  private async runDockerSandbox(
    command: string[],
    files: SandboxFile[],
    options: SandboxOptions
  ): Promise<SandboxExecutionResult> {
    const startTime = Date.now();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rl-docker-sandbox-'));

    try {
      this.writeFilesToDir(tempDir, files);

      const memLimit = options.memoryLimitMb ? `--memory=${options.memoryLimitMb}m` : '--memory=512m';
      const cpuLimit = options.cpuLimit ? `--cpus=${options.cpuLimit}` : '--cpus=1.0';
      const netFlag = options.networkEnabled ? '--net=bridge' : '--net=none';
      const imageName = options.image || 'node:20-alpine';

      const dockerArgs = [
        'run',
        '--rm',
        memLimit,
        cpuLimit,
        netFlag,
        '-v',
        `${tempDir}:/workspace`,
        '-w',
        '/workspace',
      ];

      if (options.env) {
        for (const [key, value] of Object.entries(options.env)) {
          dockerArgs.push('-e', `${key}=${value}`);
        }
      }

      dockerArgs.push(imageName, ...command);

      return await this.spawnWithTimeout('docker', dockerArgs, tempDir, options.timeoutMs || 30000, 'docker', startTime);
    } finally {
      this.cleanupDir(tempDir);
    }
  }

  /**
   * Process-isolated execution in a sandboxed temporary directory.
   */
  private async runProcessSandbox(
    command: string[],
    files: SandboxFile[],
    options: SandboxOptions
  ): Promise<SandboxExecutionResult> {
    const startTime = Date.now();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rl-proc-sandbox-'));

    try {
      this.writeFilesToDir(tempDir, files);

      const [binary, ...args] = command;
      const env = {
        ...process.env,
        ...options.env,
        SANDBOX_ACTIVE: '1',
      };

      return await this.spawnWithTimeout(binary, args, tempDir, options.timeoutMs || 30000, 'process', startTime, env);
    } finally {
      this.cleanupDir(tempDir);
    }
  }

  private spawnWithTimeout(
    cmd: string,
    args: string[],
    cwd: string,
    timeoutMs: number,
    sandboxType: 'docker' | 'process',
    startTime: number,
    env?: NodeJS.ProcessEnv
  ): Promise<SandboxExecutionResult> {
    return new Promise<SandboxExecutionResult>((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const child = spawn(cmd, args, {
        cwd,
        env,
        shell: false,
      });

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, timeoutMs);

      child.stdout?.on('data', (data: Buffer | string) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer | string) => {
        stderr += data.toString();
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          exitCode: -1,
          stdout,
          stderr: stderr + '\n' + err.message,
          durationMs: Date.now() - startTime,
          timedOut: false,
          sandboxType,
        });
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          exitCode: timedOut ? 124 : (code ?? 0),
          stdout,
          stderr,
          durationMs: Date.now() - startTime,
          timedOut,
          sandboxType,
        });
      });
    });
  }

  private writeFilesToDir(targetDir: string, files: SandboxFile[]): void {
    for (const file of files) {
      const fullPath = path.resolve(targetDir, file.path);
      const relativePath = path.relative(targetDir, fullPath);
      if (
        !relativePath ||
        relativePath === '..' ||
        relativePath.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relativePath)
      ) {
        throw new Error(`Sandbox file path escapes the workspace: ${file.path}`);
      }
      const dirName = path.dirname(fullPath);
      if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
      }
      fs.writeFileSync(fullPath, file.content, 'utf-8');
    }
  }

  private cleanupDir(dir: string): void {
    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch {
      // Ignore temporary directory cleanup failure
    }
  }
}

export const sandboxManager = new SandboxManager();
