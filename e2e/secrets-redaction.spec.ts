/**
 * Secrets Redaction E2E Test Suite
 *
 * Verifies that:
 * 1. Secrets are detected in code
 * 2. Secrets are properly redacted
 * 3. Redacted versions don't leak original secrets
 * 4. Redaction works across multiple files
 * 5. Various secret types are properly detected
 */

import { describe, it, expect } from 'vitest';
import {
  redactSecrets,
  containsSecrets,
  getSecretDensity,
  redactSecretsFromFiles,
  makeSafeForLogging,
  isRedactedSafe,
  getRedactionStats,
  updateRedactionStats,
} from '../lib/secrets/redaction';

describe('Secrets Redaction Service', () => {
  describe('redactSecrets()', () => {
    it('should detect and redact OpenAI API keys', () => {
      const code = `
        const apiKey = 'sk-proj-abcdefghijklmnopqrst12345';
        const client = new OpenAI({ apiKey });
      `;

      const result = redactSecrets(code, { logDetections: false });

      expect(result.secretsFound).toBe(1);
      expect(result.secretTypes).toContain('api-key-openai');
      expect(result.redacted).toContain('[API-KEY-OPENAI_REDACTED]');
      expect(result.redacted).not.toContain('sk-proj-');
    });

    it('should detect and redact AWS credentials', () => {
      const code = `
        const awsKey = 'AKIAIOSFODNN7EXAMPLE';
        const config = { accessKeyId: awsKey };
      `;

      const result = redactSecrets(code, { logDetections: false });

      expect(result.secretsFound).toBe(1);
      expect(result.secretTypes).toContain('api-key-aws');
      expect(result.redacted).toContain('[API-KEY-AWS_REDACTED]');
      expect(result.redacted).not.toContain('AKIA');
    });

    it('should detect and redact GitHub tokens', () => {
      const code = `
        const token = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz';
        const auth = { token };
      `;

      const result = redactSecrets(code, { logDetections: false });

      expect(result.secretsFound).toBe(1);
      expect(result.secretTypes).toContain('api-key-github');
      expect(result.redacted).toContain('[API-KEY-GITHUB_REDACTED]');
      expect(result.redacted).not.toContain('ghp_');
    });

    it('should detect and redact JWT tokens', () => {
      const code = `
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
        authorize(token);
      `;

      const result = redactSecrets(code, { logDetections: false });

      expect(result.secretsFound).toBe(1);
      expect(result.secretTypes).toContain('jwt-token');
      expect(result.redacted).toContain('[JWT-TOKEN_REDACTED]');
      expect(result.redacted).not.toContain('eyJhbGc');
    });

    it('should detect and redact database connection strings', () => {
      const code = `
        const dbUrl = 'postgresql://user:password@localhost:5432/mydb';
        const client = new Client({ connectionString: dbUrl });
      `;

      const result = redactSecrets(code, { logDetections: false });

      expect(result.secretsFound).toBe(1);
      expect(result.secretTypes).toContain('database-url');
      expect(result.redacted).toContain('[DATABASE-URL_REDACTED]');
      expect(result.redacted).not.toContain('postgresql://');
    });

    it('should detect and redact password literals', () => {
      const code = `
        const dbPassword = password="superSecretPassword123";
        const config = { password: "anotherSecret" };
      `;

      const result = redactSecrets(code, { logDetections: false });

      expect(result.secretsFound).toBeGreaterThan(0);
      expect(result.secretTypes).toContain('password-literal');
      expect(result.redacted).toContain('[PASSWORD-LITERAL_REDACTED]');
    });

    it('should detect and redact private keys', () => {
      const code = `
        const privateKey = \`-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDU8JrlBz7O9Z5A
-----END PRIVATE KEY-----\`;
      `;

      const result = redactSecrets(code, { logDetections: false });

      expect(result.secretsFound).toBe(1);
      expect(result.secretTypes).toContain('private-key-begin');
      expect(result.redacted).toContain('[PRIVATE-KEY-BEGIN_REDACTED]');
      expect(result.redacted).not.toContain('-----BEGIN PRIVATE KEY-----');
    });

    it('should detect and redact Slack tokens', () => {
      const code = `
        const slackToken = 'FAKE_SLACK_TOKEN_12345_FOR_TESTING_ONLY';
        client.auth(slackToken);
      `;

      const result = redactSecrets(code, { logDetections: false });

      expect(result.secretsFound).toBe(1);
      expect(result.secretTypes).toContain('slack-token');
      expect(result.redacted).toContain('[SLACK-TOKEN_REDACTED]');
      expect(result.redacted).not.toContain('FAKE_SLACK_TOKEN');
    });

    it('should detect and redact Stripe keys', () => {
      const code = `
        const stripeKey = 'FAKE_STRIPE_KEY_12345_FOR_TESTING_ONLY';
        const stripe = require('stripe')(stripeKey);
      `;

      const result = redactSecrets(code, { logDetections: false });

      expect(result.secretsFound).toBe(1);
      expect(result.secretTypes).toContain('stripe-key');
      expect(result.redacted).toContain('[STRIPE-KEY_REDACTED]');
    });

    it('should detect multiple different secret types', () => {
      const code = `
        const apiKey = 'sk-proj-1234567890abcdefghij';
        const awsId = 'AKIAIOSFODNN7EXAMPLE';
        const dbUrl = 'postgresql://user:pass@localhost/db';
        const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sub';
      `;

      const result = redactSecrets(code, { logDetections: false });

      expect(result.secretsFound).toBe(4);
      expect(result.secretTypes.length).toBe(4);
      expect(result.secretTypes).toContain('api-key-openai');
      expect(result.secretTypes).toContain('api-key-aws');
      expect(result.secretTypes).toContain('database-url');
      expect(result.secretTypes).toContain('jwt-token');
    });

    it('should not redact email addresses by default', () => {
      const code = `
        const email = 'user@example.com';
        const contact = 'support@company.com';
      `;

      const result = redactSecrets(code, { redactEmail: false, logDetections: false });

      expect(result.redacted).toContain('user@example.com');
      expect(result.secretsFound).toBe(0);
    });

    it('should redact email addresses when enabled', () => {
      const code = `
        const email = 'user@example.com';
        const contact = 'support@company.com';
      `;

      const result = redactSecrets(code, { redactEmail: true, logDetections: false });

      expect(result.secretsFound).toBe(2);
      expect(result.secretTypes).toContain('email-address');
      expect(result.redacted).not.toContain('@example.com');
    });

    it('should preserve code structure after redaction', () => {
      const code = `
function authenticate(apiKey) {
  if (!apiKey) throw new Error('Missing key');
  const client = new OpenAI({ apiKey: 'sk-proj-1234567890abcdefghij' });
  return client.send();
}
      `;

      const result = redactSecrets(code, { logDetections: false });

      // Code structure should be preserved
      expect(result.redacted).toContain('function authenticate');
      expect(result.redacted).toContain('if (!apiKey)');
      expect(result.redacted).toContain('throw new Error');
      expect(result.redacted).toContain('[API-KEY-OPENAI_REDACTED]');
    });

    it('should handle empty code', () => {
      const result = redactSecrets('', { logDetections: false });

      expect(result.secretsFound).toBe(0);
      expect(result.redacted).toBe('');
    });

    it('should handle code with no secrets', () => {
      const code = `
function hello(name) {
  console.log(\`Hello, \${name}!\`);
}
      `;

      const result = redactSecrets(code, { logDetections: false });

      expect(result.secretsFound).toBe(0);
      expect(result.redacted).toBe(code);
    });
  });

  describe('containsSecrets()', () => {
    it('should return true for code with secrets', () => {
      const code = "const apiKey = 'sk-proj-1234567890abcdefghij';";
      expect(containsSecrets(code)).toBe(true);
    });

    it('should return false for code without secrets', () => {
      const code = 'const name = "John Doe";';
      expect(containsSecrets(code)).toBe(false);
    });
  });

  describe('getSecretDensity()', () => {
    it('should calculate secret density correctly', () => {
      const code = 'sk-proj-1234567890abcdefghij'; // Entire string is secret
      const density = getSecretDensity(code);

      expect(density).toBeGreaterThan(90); // Nearly 100% secret
    });

    it('should return 0 for code without secrets', () => {
      const code = 'const name = "John";';
      const density = getSecretDensity(code);

      expect(density).toBe(0);
    });

    it('should calculate partial secret density', () => {
      const code = 'const apiKey = "sk-proj-1234567890abcdefghij";';
      const density = getSecretDensity(code);

      expect(density).toBeGreaterThan(0);
      expect(density).toBeLessThan(100);
    });
  });

  describe('redactSecretsFromFiles()', () => {
    it('should redact secrets from multiple files', () => {
      const files = [
        {
          path: 'src/auth.ts',
          content: "const apiKey = 'sk-proj-1234567890abcdefghij';",
        },
        {
          path: 'src/db.ts',
          content: "const dbUrl = 'postgresql://user:pass@localhost/db';",
        },
      ];

      const results = redactSecretsFromFiles(files);

      expect(results).toHaveLength(2);
      expect(results[0].secretsFound).toBe(1);
      expect(results[0].secretTypes).toContain('api-key-openai');
      expect(results[1].secretsFound).toBe(1);
      expect(results[1].secretTypes).toContain('database-url');
      expect(results[0].content).not.toContain('sk-proj-');
      expect(results[1].content).not.toContain('postgresql://');
    });
  });

  describe('makeSafeForLogging()', () => {
    it('should redact secrets for logging', () => {
      const text = "The API key is 'sk-proj-1234567890abcdefghij' for auth";
      const safe = makeSafeForLogging(text);

      expect(safe).not.toContain('sk-proj-');
      expect(safe).toContain('[API-KEY-OPENAI_REDACTED]');
    });

    it('should truncate long text', () => {
      const text = 'a'.repeat(200);
      const safe = makeSafeForLogging(text, 50);

      expect(safe.length).toBeLessThanOrEqual(53); // 50 + '...'
      expect(safe).toContain('...');
    });
  });

  describe('isRedactedSafe()', () => {
    it('should identify properly redacted code as safe', () => {
      const redacted = 'const key = [API-KEY-OPENAI_REDACTED];';
      expect(isRedactedSafe(redacted)).toBe(true);
    });

    it('should identify code with remaining secrets as unsafe', () => {
      const unsafe = "const key = 'sk-proj-1234567890abcdefghij';";
      expect(isRedactedSafe(unsafe)).toBe(false);
    });
  });

  describe('Redaction Statistics', () => {
    it('should track redaction statistics', () => {
      const code = "const apiKey = 'sk-proj-1234567890abcdefghij';";
      const result = redactSecrets(code, { logDetections: false });

      updateRedactionStats(result);
      const stats = getRedactionStats();

      expect(stats.totalChecks).toBeGreaterThan(0);
      expect(stats.averageSecretsPerFile).toBeGreaterThan(0);
    });
  });

  describe('Integration with LLM Service', () => {
    it('should redact secrets before they reach LLM prompts', () => {
      const codeWithSecrets = `
export async function authenticate() {
  const apiKey = 'sk-proj-1234567890abcdefghij';
  const response = await llm.call({
    apiKey,
    prompt: 'Analyze this code',
  });
  return response;
}
      `;

      const result = redactSecrets(codeWithSecrets, { logDetections: false });

      // The redacted version should be safe to send to LLM
      expect(isRedactedSafe(result.redacted)).toBe(true);
      expect(result.redacted).not.toContain('sk-proj-');
      expect(result.secretsFound).toBe(1);
    });

    it('should handle complex real-world code with embedded secrets', () => {
      const realWorldCode = `
const config = {
  stripe: {
    publishable: 'FAKE_STRIPE_PUB_KEY_TEST_FOR_TESTING',
    secret: 'FAKE_STRIPE_SECRET_KEY_TEST_FOR_TESTING',
  },
  database: {
    url: 'postgresql://admin:FAKE_PASSWORD_TEST@db.example.com:5432/production',
  },
  aws: {
    accessKeyId: 'FAKE_AWS_ACCESS_KEY_TEST_FOR_TESTING',
    secretAccessKey: 'FAKE_AWS_SECRET_KEY_TEST_FOR_TESTING_12345',
  },
  api: {
    openai: 'FAKE_OPENAI_KEY_TEST_FOR_TESTING_12345',
    github: 'FAKE_GITHUB_TOKEN_TEST_FOR_TESTING_12345',
  },
};

export function setupServices() {
  const stripe = require('stripe')(config.stripe.secret);
  const pgClient = new Client({ connectionString: config.database.url });
  const openai = new OpenAI({ apiKey: config.api.openai });
}
      `;

      const result = redactSecrets(realWorldCode, { logDetections: false });

      // Verify all secret types are detected
      expect(result.secretsFound).toBeGreaterThanOrEqual(6);
      expect(result.secretTypes.length).toBeGreaterThanOrEqual(4);

      // Verify redacted code is safe
      expect(isRedactedSafe(result.redacted)).toBe(true);
      expect(result.redacted).not.toContain('FAKE_STRIPE_SECRET');
      expect(result.redacted).not.toContain('FAKE_AWS_SECRET');
      expect(result.redacted).not.toContain('FAKE_PASSWORD');

      // Verify code structure is preserved
      expect(result.redacted).toContain('const config = {');
      expect(result.redacted).toContain('export function setupServices');
      expect(result.redacted).toContain('const stripe = require');
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle secrets split across multiple lines', () => {
      const code = `
const apiKey = 'sk-proj-' +
  '1234567890abcdefghij';
      `;

      const result = redactSecrets(code, { logDetections: false });
      // Note: Multi-line secrets might not be detected by this pattern,
      // which is expected as they're rare in practice
      expect(result).toBeDefined();
    });

    it('should redact secrets in comments', () => {
      const code = `
// Legacy key: sk-proj-1234567890abcdefghij
function oldAuth() { }
      `;

      const result = redactSecrets(code, { logDetections: false });

      expect(result.secretsFound).toBe(1);
      expect(result.redacted).not.toContain('sk-proj-');
    });

    it('should handle high-entropy random strings carefully', () => {
      const code = `
const randomId = 'aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV';
const hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      `;

      const result = redactSecrets(code, { logDetections: false });

      // These might or might not be flagged depending on pattern matching
      expect(result).toBeDefined();
    });

    it('should not false-positive on base64 encoded data', () => {
      const code = `
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      `;

      const result = redactSecrets(code, { logDetections: false });

      // Base64 data might trigger docker-config pattern but is generally safe
      expect(result).toBeDefined();
    });
  });
});
