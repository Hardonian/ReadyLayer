#!/usr/bin/env tsx
/**
 * Middleware Smoke Test
 * 
 * Verifies middleware doesn't crash on common routes
 * Tests that public routes work and protected routes redirect properly
 */

import { spawn, spawnSync, type ChildProcess } from 'child_process';
import * as http from 'http';
import { dirname, join } from 'path';
import { console } from './logger';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const npmCliPath = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');

function stopServer(serverProcess: ChildProcess): void {
  if (!serverProcess.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', serverProcess.pid.toString(), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  serverProcess.kill('SIGTERM');
}

interface TestResult {
  path: string;
  status: number;
  success: boolean;
  error?: string;
}

async function makeRequest(port: number, path: string): Promise<TestResult> {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port,
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'middleware-smoke-test',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          path,
          status: res.statusCode || 0,
          success: res.statusCode !== 500,
          error: res.statusCode === 500 ? `Status 500: ${data.substring(0, 100)}` : undefined,
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        path,
        status: 0,
        success: false,
        error: error.message,
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        path,
        status: 0,
        success: false,
        error: 'Request timeout',
      });
    });

    req.end();
  });
}

async function waitForServer(port: number, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await makeRequest(port, '/api/health');
      if (result.status === 200 || result.status === 503) {
        // Server is responding (even if unhealthy)
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await sleep(1000);
  }
  return false;
}

async function runTests(port: number): Promise<boolean> {
  const tests: Array<{ path: string; expectedStatus: number[]; description: string }> = [
    {
      path: '/',
      expectedStatus: [200, 302, 307, 308], // Homepage should work (200) or redirect (3xx)
      description: 'Homepage (public)',
    },
    {
      path: '/auth/signin',
      expectedStatus: [200],
      description: 'Sign in page (public)',
    },
    {
      path: '/api/health',
      expectedStatus: [200, 503], // Health check (may be 503 if DB down, but not 500)
      description: 'Health check (public)',
    },
    {
      path: '/api/ready',
      expectedStatus: [200, 503], // Ready check (may be 503 if DB down, but not 500)
      description: 'Ready check (public)',
    },
    {
      path: '/dashboard',
      expectedStatus: [302, 307, 308], // Should redirect to signin if not authenticated
      description: 'Dashboard (protected, should redirect)',
    },
    {
      path: '/api/v1/repos',
      expectedStatus: [401, 403, 503], // 503 is the graceful local fallback when Supabase is unavailable
      description: 'API route (protected, should require auth)',
    },
    {
      path: '/favicon.ico',
      expectedStatus: [200, 404], // Static asset (may not exist, but shouldn't 500)
      description: 'Static asset (favicon)',
    },
    {
      path: '/_next/static/test.js',
      expectedStatus: [404], // Next.js static (may not exist, but shouldn't 500)
      description: 'Next.js static asset',
    },
  ];

  console.log(`\n🧪 Running middleware smoke tests on port ${port}...\n`);

  const results: TestResult[] = [];

  for (const test of tests) {
    const result = await makeRequest(port, test.path);
    const success = result.success && test.expectedStatus.includes(result.status);
    if (!success && !result.error) {
      result.error = `Unexpected status ${result.status}; expected ${test.expectedStatus.join(', ')}`;
    }
    result.success = success;

    results.push(result);

    const statusIcon = success ? '✅' : '❌';
    const statusText = result.status > 0 ? result.status.toString() : 'ERROR';
    console.log(
      `${statusIcon} ${test.description}: ${statusText} ${result.error ? `(${result.error})` : ''}`
    );
  }

  const failures = results.filter((r) => !r.success || r.status === 500);
  const hasFailures = failures.length > 0;

  if (hasFailures) {
    console.log(`\n❌ ${failures.length} test(s) failed:\n`);
    failures.forEach((failure) => {
      console.log(`  - ${failure.path}: ${failure.error || `Status ${failure.status}`}`);
    });
  } else {
    console.log(`\n✅ All tests passed!`);
  }

  return !hasFailures;
}

async function main(): Promise<void> {
  const port = parseInt(process.env.PORT || '3000', 10);
  const buildOnly = process.argv.includes('--build-only');

  console.log('🔨 Building Next.js application...');
  const buildProcess = spawn(process.execPath, [npmCliPath, 'run', 'build'], {
    stdio: 'inherit',
  });

  const buildSuccess = await new Promise<boolean>((resolve) => {
    buildProcess.on('close', (code) => {
      resolve(code === 0);
    });
    buildProcess.on('error', () => {
      resolve(false);
    });
  });

  if (!buildSuccess) {
    console.error('❌ Build failed');
    process.exit(1);
  }

  if (buildOnly) {
    console.log('✅ Build successful (--build-only flag set)');
    process.exit(0);
  }

  console.log(`\n🚀 Starting Next.js server on port ${port}...`);
  const serverProcess = spawn(process.execPath, [npmCliPath, 'run', 'start'], {
    stdio: 'pipe',
    env: {
      ...process.env,
      PORT: port.toString(),
    },
  });

// Capture server output for debugging
  serverProcess.stdout?.on('data', (data: Buffer) => {
    const output = data.toString();
    if (output.includes('Ready') || output.includes('started')) {
      // Server is ready
    }
  });

  serverProcess.stderr?.on('data', (data: Buffer) => {
    // Log errors but don't fail test
    console.error(`Server stderr: ${data.toString()}`);
  });

  try {
    // Wait for server to be ready
    console.log('⏳ Waiting for server to start...');
    const serverReady = await waitForServer(port);

    if (!serverReady) {
      console.error('❌ Server failed to start within timeout');
      stopServer(serverProcess);
      process.exit(1);
    }

    // Run tests
    const testsPassed = await runTests(port);

    // Cleanup
    stopServer(serverProcess);

    if (!testsPassed) {
      console.error('\n❌ Smoke tests failed');
      process.exit(1);
    }

    console.log('\n✅ All smoke tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    stopServer(serverProcess);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
