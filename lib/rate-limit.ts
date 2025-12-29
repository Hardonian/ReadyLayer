import { RateLimiterMemory } from 'rate-limiter-flexible'
import { NextRequest, NextResponse } from 'next/server'

// Rate limiters for different endpoints
const apiLimiter = new RateLimiterMemory({
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
})

const authLimiter = new RateLimiterMemory({
  points: 5, // Number of requests
  duration: 60, // Per 60 seconds
})

const reviewLimiter = new RateLimiterMemory({
  points: 20, // Number of requests
  duration: 60, // Per 60 seconds
})

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: NextRequest): string {
  // Try to get user ID from session first
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    // Extract user ID from token if available
    // For now, use IP as fallback
  }

  // Fallback to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
  return ip
}

/**
 * Rate limit middleware for API routes
 */
export async function rateLimit(
  request: NextRequest,
  limiter: RateLimiterMemory = apiLimiter
): Promise<NextResponse | null> {
  const clientId = getClientId(request)

  try {
    await limiter.consume(clientId)
    return null // No rate limit exceeded
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1
    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          retryAfter: secs,
        },
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(secs),
          'X-RateLimit-Limit': String(limiter.points),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }
}

/**
 * Rate limiters for specific endpoints
 */
export const rateLimiters = {
  api: apiLimiter,
  auth: authLimiter,
  review: reviewLimiter,
}
