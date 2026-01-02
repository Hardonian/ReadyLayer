import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { edgeLogger } from './lib/middleware/edge-logging'
import { getEdgeAuthUser, extractApiKeyFromHeader } from './lib/middleware/edge-auth'
import { edgeRateLimit } from './lib/middleware/edge-rate-limit'

/**
 * Public routes that should always be accessible
 * These routes bypass authentication checks
 */
const PUBLIC_ROUTES = [
  '/',
  '/auth/signin',
  '/auth/signout',
  '/auth/callback',
  '/auth/error',
  '/api/health',
  '/api/ready',
]

/**
 * Static asset patterns that should never be processed by middleware
 */
const STATIC_ASSET_PATTERNS = [
  /\.(ico|png|jpg|jpeg|gif|svg|webp|css|js|map|woff|woff2|ttf|eot)$/i,
  /^\/_next\//,
  /^\/favicon\.ico$/,
  /^\/robots\.txt$/,
  /^\/sitemap\.xml$/,
]

/**
 * Check if a path is a public route
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => {
    if (route === pathname) return true
    if (pathname.startsWith('/auth/')) return true
    return false
  })
}

/**
 * Check if a path is a static asset
 */
function isStaticAsset(pathname: string): boolean {
  return STATIC_ASSET_PATTERNS.some((pattern) => pattern.test(pathname))
}

/**
 * Get Supabase client for Edge runtime
 * Returns null if env vars are missing (fail-open for public routes)
 */
function createEdgeSupabaseClient(request: NextRequest): {
  client: ReturnType<typeof createServerClient> | null
  error: string | null
} {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        client: null,
        error: 'Missing Supabase configuration',
      }
    }

    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    const client = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          try {
            return request.cookies.getAll()
          } catch {
            return []
          }
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value)
            })
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          } catch {
            // Silently fail cookie setting
          }
        },
      },
    })

    return { client, error: null }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      client: null,
      error: errorMessage,
    }
  }
}

/**
 * Handle middleware errors gracefully
 * Never throws - always returns a response
 */
function handleMiddlewareError(
  error: unknown,
  request: NextRequest,
  context: string
): NextResponse {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'

  // Safe logging - never throw
  try {
    edgeLogger.error(error, `Middleware error in ${context}`, {
      path: request.nextUrl.pathname,
      method: request.method,
    })
  } catch {
    // Even logging failed - use console as last resort
    console.error('Middleware error:', {
      context,
      path: request.nextUrl.pathname,
      error: errorMessage,
    })
  }

  // For API routes, return JSON error
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

  // For page routes, redirect to signin (fail-open for public routes)
  if (isPublicRoute(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  const signInUrl = new URL('/auth/signin', request.url)
  signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
  return NextResponse.redirect(signInUrl)
}

/**
 * Main middleware function
 * Edge runtime compatible - no Node.js dependencies
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  // Ultimate safety net - catch any unhandled errors
  try {
    return await executeMiddleware(request)
  } catch (error) {
    return handleMiddlewareError(error, request, 'middleware top-level')
  }
}

async function executeMiddleware(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname

  // Skip static assets immediately
  if (isStaticAsset(pathname)) {
    return NextResponse.next()
  }

  // Public routes - always allow through
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Health and ready endpoints - always public
  if (pathname === '/api/health' || pathname === '/api/ready') {
    return NextResponse.next()
  }

  // Create Supabase client (may fail if env vars missing)
  const { client: supabase, error: supabaseError } = createEdgeSupabaseClient(request)

  // For public routes, allow through even if Supabase fails
  // (This shouldn't happen due to early return above, but defensive)
  if (!supabase && isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    const rateLimitResponse = edgeRateLimit(request, {
      points: 100,
      duration: 60,
    })
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Protect API routes (except health/ready which are already handled)
    if (!supabase) {
      // Supabase unavailable - return service unavailable for API routes
      try {
        edgeLogger.warn('Supabase unavailable for API route', {
          path: pathname,
          error: supabaseError,
        })
      } catch {
        // Logging failed, continue
      }
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

    // Check authentication for API routes
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.json(
          {
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'Authentication service is temporarily unavailable',
            },
          },
          { status: 503 }
        );
      }
      const user = await getEdgeAuthUser(request, supabaseUrl, supabaseAnonKey);

      // If no user, check for API key in header
      // Note: Full API key validation requires Prisma (Node runtime)
      // For middleware, we only check presence - actual validation happens in route handler
      if (!user) {
        const apiKey = extractApiKeyFromHeader(request)
        if (!apiKey) {
          return NextResponse.json(
            {
              error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required',
              },
            },
            { status: 401 }
          )
        }
        // API key present - let route handler validate it (has access to Prisma)
      }
    } catch (authError) {
      // Auth check failed - return error
      try {
        edgeLogger.warn('Auth check failed for API route', {
          path: pathname,
          error: authError instanceof Error ? authError.message : String(authError),
        })
      } catch {
        // Logging failed, continue
      }
      return NextResponse.json(
        {
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: 'Failed to verify authentication',
          },
        },
        { status: 500 }
      )
    }

    // API route authorized - continue
    return NextResponse.next()
  }

  // Protect page routes (dashboard, etc.)
  if (!supabase) {
    // Supabase unavailable - redirect to signin
    try {
      edgeLogger.warn('Supabase unavailable for page route', {
        path: pathname,
        error: supabaseError,
      })
    } catch {
      // Logging failed, continue
    }
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Check authentication for page routes
  try {
    const user = await getEdgeAuthUser(
      request,
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    if (!user) {
      const signInUrl = new URL('/auth/signin', request.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }
  } catch (authError) {
    // Auth check failed - redirect to signin
    try {
      edgeLogger.warn('Auth check failed for page route', {
        path: pathname,
        error: authError instanceof Error ? authError.message : String(authError),
      })
    } catch {
      // Logging failed, continue
    }
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Authorized - continue
  return NextResponse.next()
}

/**
 * Middleware matcher configuration
 * Only match routes that need processing - exclude static assets
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml
     * - Static files with extensions (png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf|eot)$).*)',
  ],
}
