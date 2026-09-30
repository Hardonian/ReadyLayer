/**
 * Minimal mock Supabase auth endpoint for E2E tests.
 *
 * Serves the small surface that @supabase/ssr needs so middleware session
 * validation (supabase.auth.getUser()) succeeds against test cookies.
 * Any bearer token is accepted - this server must NEVER be used outside tests.
 *
 * Run: node e2e/utils/mock-supabase-server.mjs  (PORT=54321 by default)
 */
import { createServer } from 'node:http'

const PORT = Number(process.env.MOCK_SUPABASE_PORT || 54321)

const MOCK_USER = {
  id: 'user-visual-test',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@example.com',
  email_confirmed_at: '2026-01-01T00:00:00Z',
  phone: '',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'Test User', avatar_url: null },
  identities: [],
  factors: [],
}

const MOCK_SESSION = {
  access_token: 'mock-token-for-visual-tests',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: MOCK_USER,
}

const server = createServer((req, res) => {
  const url = req.url || ''
  console.log(`[mock-supabase] ${req.method} ${url}`)
  res.setHeader('content-type', 'application/json')
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-headers', '*')

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end()
    return
  }

  // Health probe used by Playwright webServer readiness
  if (url.startsWith('/health')) {
    res.writeHead(200).end(JSON.stringify({ status: 'ok' }))
    return
  }

  // supabase.auth.getUser() -> GET /auth/v1/user
  if (url.startsWith('/auth/v1/user')) {
    res.writeHead(200).end(JSON.stringify(MOCK_USER))
    return
  }

  // Token exchange / refresh -> POST /auth/v1/token
  if (url.startsWith('/auth/v1/token')) {
    res.writeHead(200).end(JSON.stringify(MOCK_SESSION))
    return
  }

  // Everything else (settings, logout, rest stubs): harmless success
  res.writeHead(200).end(JSON.stringify({}))
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`mock supabase listening on http://127.0.0.1:${PORT}`)
})
