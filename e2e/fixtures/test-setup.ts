/**
 * Test Setup & Teardown
 *
 * Runs before all tests to set up test database, mocks, and cleanup
 */

import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Set test environment variables
beforeAll(() => {
  // Use test database instead of production
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/readylayer_test';
  process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/1'; // Use DB 1 for testing
  if (!process.env.NODE_ENV) {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'test',
      writable: true,
      configurable: true,
    });
  }
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
});

// Cleanup after all tests
afterAll(async () => {
  // Close any open connections
  vi.clearAllMocks();
});

// Clear mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Mock Prisma for unit tests (override with real DB in integration tests)
vi.mock('../lib/prisma', () => ({
  prisma: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
}));

// Mock Redis client
vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    lpush: vi.fn(),
    brpop: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    expire: vi.fn(),
  })),
}));

// Mock logger
vi.mock('../observability/logging', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));
