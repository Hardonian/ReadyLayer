/**
 * Edge-Safe Rate Limiting
 * 
 * In-memory rate limiting for Edge runtime (middleware)
 * No Redis dependency - uses simple Map-based storage
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (per-instance, resets on cold start)
// In production with multiple edge instances, this is per-instance limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupOldEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) {
    return;
  }
  lastCleanup = now;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

export interface EdgeRateLimitOptions {
  points?: number; // Number of requests
  duration?: number; // Per duration (seconds)
  keyGenerator?: (request: NextRequest) => string;
}

/**
 * Edge-safe rate limiting middleware
 * Returns null if rate limit passed, NextResponse if exceeded
 */
export function edgeRateLimit(
  request: NextRequest,
  options: EdgeRateLimitOptions = {}
): NextResponse | null {
  try {
    cleanupOldEntries();

    const points = options.points || 100;
    const duration = (options.duration || 60) * 1000; // Convert to ms

    // Generate rate limit key
    let key: string;
    if (options.keyGenerator) {
      key = options.keyGenerator(request);
    } else {
      // Default: use IP address
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown';
      key = `ip:${ip}`;
    }

    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt < now) {
      // First request or expired - create new entry
      rateLimitStore.set(key, {
        count: 1,
        resetAt: now + duration,
      });
      return null; // Allow request
    }

    if (entry.count >= points) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded',
            retryAfter,
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': points.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.resetAt).toISOString(),
          },
        }
      );
    }

    // Increment count
    entry.count++;
    return null; // Allow request
  } catch {
    // On error, fail open (allow request)
    return null;
  }
}
