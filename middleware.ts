import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createAuthzMiddleware } from './lib/authz'
import { defaultRateLimit } from './lib/rate-limit'
import { logger } from './observability/logging'

/**
 * Middleware error handler
 * Ensures middleware never throws unhandled errors
 */
function handleMiddlewareError(
  error: unknown,
  request: NextRequest,
  context: string
): NextResponse {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  const errorStack = error instanceof Error ? error.stack : undefined

  // Safely log error - don't let logger throw
  try {
    logger.error(error, {
      message: `Middleware error in ${context}`,
      path: request.nextUrl.pathname,
      method: request.method,
      errorMessage,
      errorStack,
    })
  } catch (logError) {
    // If logger fails, use console as fallback
    console.error('Middleware error:', {
      context,
      path: request.nextUrl.pathname,
      method: request.method,
      error: errorMessage,
      stack: errorStack,
      loggerError: logError,
    })
  }

  // For API routes, return JSON error response
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while processing your request',
        },
      },
      { status: 500 }
    )
  }

  // For page routes, redirect to error page or return error response
  // Don't redirect on error to avoid redirect loops
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred. Please try again later.',
      },
    },
    { status: 500 }
  )
}

/**
 * Safely get Supabase client with error handling
 */
function createSupabaseClientSafely(request: NextRequest): {
  client: ReturnType<typeof createServerClient> | null
  error: Error | null
} {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        client: null,
        error: new Error('Missing Supabase configuration'),
      }
    }

    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    const client = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          try {
            return request.cookies.getAll()
          } catch (error) {
            try {
              logger.warn('Failed to get cookies', { error })
            } catch {
              // Logger failed, continue silently
            }
            return []
          }
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            response = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          } catch (error) {
            try {
              logger.warn('Failed to set cookies', { error })
            } catch {
              // Logger failed, continue silently
            }
          }
        },
      },
    })

    return { client, error: null }
  } catch (error) {
    return {
      client: null,
      error: error instanceof Error ? error : new Error('Failed to create Supabase client'),
    }
  }
}

// Wrap entire middleware in a safety net to prevent any unhandled errors
export async function middleware(request: NextRequest): Promise<NextResponse> {
  // Ultimate safety: wrap everything to prevent MIDDLEWARE_INVOCATION_FAILED
  try {
    return await executeMiddleware(request)
  } catch (error) {
    // This catch should never be hit if executeMiddleware handles everything,
    // but it's here as a final safety net
    try {
      return handleMiddlewareError(error, request, 'middleware top-level')
    } catch (fallbackError) {
      // Even error handling failed - return a basic response
      return new NextResponse(
        JSON.stringify({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An error occurred',
          },
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }
}

async function executeMiddleware(request: NextRequest): Promise<NextResponse> {
  try {
    // Health and ready endpoints are public - handle early to avoid any processing
    if (
      request.nextUrl.pathname === '/api/health' ||
      request.nextUrl.pathname === '/api/ready'
    ) {
      try {
        return NextResponse.next({
          request: {
            headers: request.headers,
          },
        })
      } catch (error) {
        // If NextResponse creation fails, return a basic response
        return new NextResponse(null, { status: 200 })
      }
    }

    // Create Supabase client with error handling
    const { client: supabase, error: supabaseError } = createSupabaseClientSafely(request)

    if (!supabase) {
      // If Supabase client creation fails, allow health/ready endpoints through
      // For other endpoints, return error
      if (
        request.nextUrl.pathname === '/' ||
        request.nextUrl.pathname.startsWith('/auth/')
      ) {
        // Allow public routes even if Supabase is down
        try {
          return NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
        } catch (error) {
          return new NextResponse(null, { status: 200 })
        }
      }

      try {
        logger.error(supabaseError, {
          message: 'Failed to create Supabase client',
          path: request.nextUrl.pathname,
        })
      } catch {
        // Logger failed, continue
      }

      if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json(
          {
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'Authentication service is temporarily unavailable',
            },
          },
          { status: 503 }
        )
      }

      // For page routes, try to continue but log the error
      try {
        return NextResponse.next({
          request: {
            headers: request.headers,
          },
        })
      } catch (error) {
        return new NextResponse(null, { status: 200 })
      }
    }

    let response: NextResponse
    try {
      response = NextResponse.next({
        request: {
          headers: request.headers,
        },
      })
    } catch (error) {
      // If response creation fails, create a basic response
      response = new NextResponse(null, { status: 200 })
    }

    // Apply rate limiting to all API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
      try {
        const rateLimitResponse = await defaultRateLimit(request)
        if (rateLimitResponse) {
          return rateLimitResponse
        }
      } catch (error) {
        // Rate limiting failed - log but allow request through (fail open)
        try {
          logger.warn('Rate limit check failed, allowing request', {
            error: error instanceof Error ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            } : error,
            path: request.nextUrl.pathname,
          })
        } catch {
          // Logger failed, continue
        }
        // Continue processing
      }
    }

    // Protect API routes (except health/ready)
    if (request.nextUrl.pathname.startsWith('/api/')) {
      try {
        // Check authentication
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) {
          try {
            logger.warn('Auth check failed', {
              error: authError instanceof Error ? {
                message: authError.message,
                stack: authError.stack,
                name: authError.name,
              } : authError,
              path: request.nextUrl.pathname,
            })
          } catch {
            // Logger failed, continue
          }
          // Continue to check API key
        }

        if (!user) {
          // Check for API key
          const authHeader = request.headers.get('authorization')
          if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
              { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
              { status: 401 }
            )
          }
        }

        // Apply authorization based on route
        try {
          if (request.nextUrl.pathname.startsWith('/api/v1/repos')) {
            const authzResponse = await createAuthzMiddleware({
              requiredScopes: ['read'],
              requireOrganization: request.method !== 'GET',
            })(request)
            if (authzResponse) {
              return authzResponse
            }
          }

          if (request.nextUrl.pathname.startsWith('/api/v1/reviews')) {
            const authzResponse = await createAuthzMiddleware({
              requiredScopes: request.method === 'POST' ? ['write'] : ['read'],
            })(request)
            if (authzResponse) {
              return authzResponse
            }
          }
        } catch (authzError) {
          // Authorization check failed - return error response
          try {
            logger.error(authzError, {
              message: 'Authorization check failed',
              path: request.nextUrl.pathname,
            })
          } catch {
            // Logger failed, continue
          }
          return NextResponse.json(
            {
              error: {
                code: 'AUTHORIZATION_ERROR',
                message: 'Failed to verify authorization',
              },
            },
            { status: 500 }
          )
        }
      } catch (apiError) {
        // API route protection failed
        return handleMiddlewareError(apiError, request, 'API route protection')
      }
    }

    // Protect other routes except public ones
    if (
      request.nextUrl.pathname === '/' ||
      request.nextUrl.pathname.startsWith('/auth/') ||
      request.nextUrl.pathname.startsWith('/api/health') ||
      request.nextUrl.pathname.startsWith('/api/ready')
    ) {
      return response
    }

    // Require auth for all other routes
    try {
      const {
        data: { user },
        error: getUserError,
      } = await supabase.auth.getUser()

      if (getUserError) {
        try {
          logger.warn('Failed to get user for page route', {
            error: getUserError instanceof Error ? {
              message: getUserError.message,
              stack: getUserError.stack,
              name: getUserError.name,
            } : getUserError,
            path: request.nextUrl.pathname,
          })
        } catch {
          // Logger failed, continue
        }
        // Redirect to sign in on auth error
        const signInUrl = new URL('/auth/signin', request.url)
        signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
        return NextResponse.redirect(signInUrl)
      }

      if (!user) {
        const signInUrl = new URL('/auth/signin', request.url)
        signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
        return NextResponse.redirect(signInUrl)
      }
    } catch (authError) {
      // Auth check failed for page route - redirect to sign in
      try {
        logger.warn('Auth check failed for page route', {
          error: authError instanceof Error ? {
            message: authError.message,
            stack: authError.stack,
            name: authError.name,
          } : authError,
          path: request.nextUrl.pathname,
        })
      } catch {
        // Logger failed, continue
      }
      const signInUrl = new URL('/auth/signin', request.url)
      signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
      return NextResponse.redirect(signInUrl)
    }

    return response
  } catch (error) {
    // Catch-all error handler - this should never happen if all code paths are handled
    return handleMiddlewareError(error, request, 'middleware')
  }
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
