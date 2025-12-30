import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createAuthzMiddleware } from './lib/authz'
import { defaultRateLimit } from './lib/rate-limit'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Health and ready endpoints are public
  if (
    request.nextUrl.pathname === '/api/health' ||
    request.nextUrl.pathname === '/api/ready'
  ) {
    return response
  }

  // Apply rate limiting to all API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const rateLimitResponse = await defaultRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
  }

  // Protect API routes (except health/ready)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
    return NextResponse.redirect(signInUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
