export const PUBLIC_ROUTES = [
  '/',
  '/auth/signin',
  '/auth/signout',
  '/auth/callback',
  '/auth/error',
  '/dashboard/runs/sandbox',
]

export const PUBLIC_ROUTE_PREFIXES = [
  '/about',
  '/audit-example',
  '/runner-import',
  '/changelog',
  '/contact',
  '/cookies',
  '/docs',
  '/dpa',
  '/enterprise',
  '/faq',
  '/features',
  '/governance',
  '/help',
  '/how-it-works',
  '/integrations',
  '/marketplace',
  '/open-source',
  '/pricing',
  '/privacy',
  '/security',
  '/status',
  '/support',
  '/terms',
]

export const PUBLIC_API_ROUTES = [
  '/api/health',
  '/api/ready',
  '/api/v1/runs/sandbox',
  '/api/demo',
]

export const AUTH_ROUTE_PREFIXES = ['/dashboard', '/app']

export const HYBRID_ROUTE_PREFIXES = ['/integrations', '/docs']

export function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true
  if (pathname.startsWith('/auth/')) return true

  return PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.includes(pathname)
}

export function isAuthRequiredRoute(pathname: string): boolean {
  return AUTH_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function isHybridRoute(pathname: string): boolean {
  return HYBRID_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
