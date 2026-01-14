#!/usr/bin/env tsx

/**
 * CI Health Check
 * 
 * Validates deployment health after staging/production deploy
 * Run with: pnpm tsx scripts/ci-health-check.ts
 */

import https from 'https';

interface HealthCheckConfig {
  baseUrl: string;
  endpoints: Array<{
    path: string;
    method: 'GET' | 'POST';
    critical: boolean; // Must be healthy
    timeout?: number;
  }>;
  maxRetries?: number;
  retryDelay?: number;
}

const DEFAULT_CONFIG: HealthCheckConfig = {
  baseUrl: process.env.STAGING_URL || 'http://localhost:3000',
  endpoints: [
    {
      path: '/api/health',
      method: 'GET',
      critical: true,
      timeout: 10000,
    },
    {
      path: '/api/ready',
      method: 'GET',
      critical: true,
      timeout: 10000,
    },
    {
      path: '/',
      method: 'GET',
      critical: true,
      timeout: 10000,
    },
  ],
  maxRetries: 3,
  retryDelay: 2000,
};

async function makeRequest(
  url: string,
  method: string = 'GET',
  timeout: number = 10000
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeout}ms`));
    }, timeout);

    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method,
    };

    const req = https.request(options, (res) => {
      clearTimeout(timeoutHandle);
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode || 500,
          body,
        });
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeoutHandle);
      reject(error);
    });

    req.end();
  });
}

async function checkEndpoint(
  config: HealthCheckConfig,
  endpoint: HealthCheckConfig['endpoints'][0],
  attempt: number = 1
): Promise<boolean> {
  const url = `${config.baseUrl}${endpoint.path}`;

  try {
    console.log(
      `[${attempt}/${config.maxRetries}] Checking ${endpoint.method} ${url}...`
    );

    const { status } = await makeRequest(url, endpoint.method, endpoint.timeout);

    if (status >= 200 && status < 300) {
      console.log(`✓ ${endpoint.method} ${endpoint.path} - Status ${status}`);
      return true;
    }

    console.log(`✗ ${endpoint.method} ${endpoint.path} - Status ${status}`);
    if (attempt < (config.maxRetries || 3)) {
      console.log(`  Retrying in ${config.retryDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, config.retryDelay || 2000));
      return checkEndpoint(config, endpoint, attempt + 1);
    }

    return false;
  } catch (error) {
    console.log(`✗ ${endpoint.method} ${endpoint.path} - Error: ${error}`);

    if (attempt < (config.maxRetries || 3)) {
      console.log(`  Retrying in ${config.retryDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, config.retryDelay || 2000));
      return checkEndpoint(config, endpoint, attempt + 1);
    }

    return false;
  }
}

async function runHealthChecks(): Promise<boolean> {
  console.log(`\n🏥 Running Health Checks`);
  console.log(`URL: ${DEFAULT_CONFIG.baseUrl}`);
  console.log(`Endpoints: ${DEFAULT_CONFIG.endpoints.length}`);
  console.log('---\n');

  const results: Array<{
    path: string;
    healthy: boolean;
    critical: boolean;
  }> = [];

  for (const endpoint of DEFAULT_CONFIG.endpoints) {
    const healthy = await checkEndpoint(DEFAULT_CONFIG, endpoint);
    results.push({
      path: endpoint.path,
      healthy,
      critical: endpoint.critical,
    });
  }

  console.log('\n---\n');

  // Summary
  const criticalFailed = results.filter(
    (r) => r.critical && !r.healthy
  );
  const allHealthy = results.every((r) => r.healthy);

  if (allHealthy) {
    console.log('✅ All health checks passed!');
    return true;
  } else if (criticalFailed.length === 0) {
    console.log('⚠️  Some non-critical checks failed, but all critical endpoints are healthy');
    return true;
  } else {
    console.log(`❌ Critical health checks failed:`);
    for (const failed of criticalFailed) {
      console.log(`  - ${failed.path}`);
    }
    return false;
  }
}

// Run
runHealthChecks()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Health check error:', error);
    process.exit(1);
  });
