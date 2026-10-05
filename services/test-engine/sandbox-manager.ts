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
import { randomUUID } from 'crypto';
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
  maxOutputBytes?: number;
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
      let settled = false;
      const finish = (available: boolean): void => {
        if (settled) {
          return;
        }
        settled = true;
        this.isDockerAvailableCache = available;
        resolve(available);
      };

      const proc = spawn('docker', ['--version']);
      const timeout = setTimeout(() => {
        proc.kill();
        finish(false);
      }, 5_000);
      proc.on('error', () => {
        clearTimeout(timeout);
        finish(false);
      });
      proc.on('close', (code) => {
        clearTimeout(timeout);
        finish(code === 0);
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
    const containerName = `readylayer-test-${randomUUID().replace(/-/g, '')}`;
    const volumeName = `readylayer-workspace-${randomUUID().replace(/-/g, '')}`;
    let volumeCreated = false;
    let containerCreated = false;

    try {
      this.writeFilesToDir(tempDir, files);

      const memLimit = options.memoryLimitMb ? `--memory=${options.memoryLimitMb}m` : '--memory=512m';
      const cpuLimit = options.cpuLimit ? `--cpus=${options.cpuLimit}` : '--cpus=1.0';
      const netFlag = options.networkEnabled ? '--net=bridge' : '--net=none';
      const imageName = options.image || 'node:20-alpine';
      const volumeMount = `type=volume,source=${volumeName},target=/workspace,volume-nocopy`;
      const setupTimeoutMs = Math.max(5_000, options.timeoutMs || 30_000);

      await this.runDockerSetup(['volume', 'create', volumeName], tempDir, setupTimeoutMs);
      volumeCreated = true;

      const dockerArgs = [
        'create',
        '--name',
        containerName,
        '--init',
        '--read-only',
        '--cap-drop',
        'ALL',
        '--security-opt',
        'no-new-privileges=true',
        '--pids-limit',
        '128',
        '--tmpfs',
        '/tmp:rw,nosuid,nodev,size=64m',
        memLimit,
        cpuLimit,
        netFlag,
        '--mount',
        volumeMount,
        '-w',
        '/workspace',
      ];

      if (options.env) {
        for (const [key, value] of Object.entries(options.env)) {
          dockerArgs.push('-e', `${key}=${value}`);
        }
      }

      dockerArgs.push(imageName, ...command);
      await this.runDockerSetup(dockerArgs, tempDir, setupTimeoutMs);
      containerCreated = true;

      // Docker Desktop bind mounts can hang on Windows. A managed volume keeps the
      // untrusted workspace inside Docker while docker cp uses its Engine API.
      await this.runDockerSetup(
        ['cp', `${tempDir}${path.sep}.`, `${containerName}:/workspace`],
        tempDir,
        setupTimeoutMs
      );
      await this.runDockerSetup(
        [
          'run',
          '--rm',
          '--user',
          '0:0',
          '--network',
          'none',
          '--read-only',
          '--tmpfs',
          '/tmp:rw,nosuid,nodev,size=64m',
          '--mount',
          volumeMount,
          imageName,
          'chown',
          '-R',
          '10001:10001',
          '/workspace',
        ],
        tempDir,
        setupTimeoutMs
      );

      return await this.spawnWithTimeout(
        'docker',
        ['start', '--attach', containerName],
        tempDir,
        options.timeoutMs || 30000,
        'docker',
        startTime,
        undefined,
        options.maxOutputBytes,
        () => this.stopDockerContainer(containerName)
      );
    } finally {
      if (containerCreated) {
        await this.removeDockerContainer(containerName);
      }
      if (volumeCreated) {
        await this.removeDockerVolume(volumeName);
      }
      this.cleanupDir(tempDir);
    }
  }

  private async runDockerSetup(args: string[], cwd: string, timeoutMs: number): Promise<void> {
    const result = await this.spawnWithTimeout('docker', args, cwd, timeoutMs, 'docker', Date.now());
    if (result.timedOut || result.exitCode !== 0) {
      const output = `${result.stdout}\n${result.stderr}`.trim();
      throw new Error(output || `Docker setup command failed: docker ${args.join(' ')}`);
    }
  }

  private async removeDockerContainer(containerName: string): Promise<void> {
    await this.runDockerCleanup(['rm', '--force', containerName]);
  }

  private async removeDockerVolume(volumeName: string): Promise<void> {
    await this.runDockerCleanup(['volume', 'rm', '--force', volumeName]);
  }

  private async runDockerCleanup(args: string[]): Promise<void> {
    try {
      await this.spawnWithTimeout('docker', args, os.tmpdir(), 5_000, 'docker', Date.now());
    } catch {
      // A failed cleanup cannot make a completed sandbox execution unsafe.
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

      return await this.spawnWithTimeout(
        binary,
        args,
        tempDir,
        options.timeoutMs || 30000,
        'process',
        startTime,
        env,
        options.maxOutputBytes
      );
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
    env?: NodeJS.ProcessEnv,
    maxOutputBytes: number = 1_000_000,
    onTerminate?: () => void
  ): Promise<SandboxExecutionResult> {
    return new Promise<SandboxExecutionResult>((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let outputLimitExceeded = false;
      let outputBytes = 0;
      let completed = false;

      const child = spawn(cmd, args, {
        cwd,
        env,
        shell: false,
      });

      const finish = (result: SandboxExecutionResult): void => {
        if (completed) {
          return;
        }
        completed = true;
        clearTimeout(timer);
        resolve(result);
      };

      const terminate = (): void => {
        onTerminate?.();
        child.kill('SIGKILL');
      };

      const timer = setTimeout(() => {
        timedOut = true;
        terminate();
      }, timeoutMs);

      const appendOutput = (stream: 'stdout' | 'stderr', data: Buffer | string): void => {
        if (outputLimitExceeded) {
          return;
        }

        const chunk = Buffer.from(data.toString(), 'utf8');
        const remainingBytes = Math.max(0, maxOutputBytes - outputBytes);
        const retained = chunk.subarray(0, remainingBytes);
        outputBytes += retained.byteLength;
        if (stream === 'stdout') {
          stdout += retained.toString('utf8');
        } else {
          stderr += retained.toString('utf8');
        }

        if (retained.byteLength < chunk.byteLength) {
          outputLimitExceeded = true;
          stderr += '\nSandbox output limit exceeded; execution terminated.';
          terminate();
        }
      };

      child.stdout?.on('data', (data: Buffer | string) => appendOutput('stdout', data));
      child.stderr?.on('data', (data: Buffer | string) => appendOutput('stderr', data));

      child.on('error', (err) => {
        finish({
          exitCode: -1,
          stdout,
          stderr: stderr + '\n' + err.message,
          durationMs: Date.now() - startTime,
          timedOut: false,
          sandboxType,
        });
      });

      child.on('close', (code) => {
        finish({
          exitCode: timedOut ? 124 : (outputLimitExceeded ? 137 : (code ?? 0)),
          stdout,
          stderr,
          durationMs: Date.now() - startTime,
          timedOut,
          sandboxType,
        });
      });
    });
  }

  private stopDockerContainer(containerName: string): void {
    const stopProcess = spawn('docker', ['kill', containerName], {
      stdio: 'ignore',
      windowsHide: true,
    });
    stopProcess.once('error', () => undefined);
    stopProcess.unref();
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
