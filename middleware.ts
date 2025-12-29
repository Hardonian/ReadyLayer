import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Protect API routes except health check and auth
        if (req.nextUrl.pathname.startsWith('/api/')) {
          if (
            req.nextUrl.pathname === '/api/health' ||
            req.nextUrl.pathname.startsWith('/api/auth/')
          ) {
            return true
          }
          return !!token
        }
        // Protect all other routes except public ones
        if (
          req.nextUrl.pathname === '/' ||
          req.nextUrl.pathname.startsWith('/auth/') ||
          req.nextUrl.pathname.startsWith('/api/health')
        ) {
          return true
        }
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
