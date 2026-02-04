import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const port = Number.parseInt(process.env.ROUTE_SMOKE_PORT || '3100', 10)
const baseUrl = process.env.ROUTE_SMOKE_BASE_URL || `http://localhost:${port}`

const publicRoutes = [
  { path: '/', expected: [200] },
  { path: '/how-it-works', expected: [200] },
  { path: '/open-source', expected: [200] },
  { path: '/docs', expected: [200] },
  { path: '/docs/api-reference', expected: [200] },
  { path: '/integrations', expected: [200] },
  { path: '/governance', expected: [200] },
  { path: '/security', expected: [200] },
  { path: '/enterprise', expected: [200] },
  { path: '/changelog', expected: [200] },
  { path: '/about', expected: [200] },
  { path: '/audit-example', expected: [200] },
  { path: '/privacy', expected: [200] },
  { path: '/terms', expected: [200] },
  { path: '/status', expected: [200] },
  { path: '/contact', expected: [200] },
  { path: '/faq', expected: [200] },
  { path: '/support', expected: [200] },
  { path: '/cookies', expected: [200] },
  { path: '/dpa', expected: [200] },
  { path: '/pricing', expected: [307, 308] },
  { path: '/features', expected: [307, 308] },
  { path: '/features/oss-maintainers', expected: [307, 308] },
  { path: '/features/startup-ctos', expected: [307, 308] },
  { path: '/help', expected: [307, 308] },
  { path: '/help/getting-started', expected: [307, 308] },
  { path: '/help/getting-started/welcome', expected: [307, 308] },
  { path: '/help/getting-started/connect-repo', expected: [307, 308] },
  { path: '/help/getting-started/first-review', expected: [307, 308] },
  { path: '/help/getting-started/policies', expected: [307, 308] },
  { path: '/help/support', expected: [307, 308] },
  { path: '/marketplace', expected: [307, 308] },
  { path: '/marketplace/integrations', expected: [307, 308] },
  { path: '/marketplace/policies', expected: [307, 308] },
]

const authRoutes = [
  '/dashboard',
  '/dashboard/runs',
  '/dashboard/settings',
]

const publicApiRoutes = [
  { path: '/api/health', expected: [200, 503] },
  { path: '/api/ready', expected: [200, 503] },
  { path: '/api/v1/runs/sandbox', expected: [200, 405, 503] },
]

async function waitForServer() {
  const maxAttempts = 30
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const res = await fetch(`${baseUrl}/api/ready`, { redirect: 'manual' })
      if (res.status === 200 || res.status === 503) {
        return
      }
    } catch {
      // ignore
    }
    await delay(1000)
  }
  throw new Error(`Server did not become ready at ${baseUrl}`)
}

async function checkRoute(path, expected) {
  const res = await fetch(`${baseUrl}${path}`, { redirect: 'manual' })
  if (!expected.includes(res.status)) {
    throw new Error(`Expected ${path} to return ${expected.join(', ')}, got ${res.status}`)
  }
  return res.status
}

const server = spawn('pnpm', ['exec', 'next', 'start', '-p', String(port)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: String(port),
  },
})

let exitCode = 0

try {
  await waitForServer()

  for (const route of publicRoutes) {
    await checkRoute(route.path, route.expected)
  }

  for (const route of publicApiRoutes) {
    await checkRoute(route.path, route.expected)
  }

  for (const route of authRoutes) {
    await checkRoute(route, [302, 307])
  }
} catch (error) {
  console.error(error)
  exitCode = 1
} finally {
  server.kill('SIGINT')
  await delay(1000)
  process.exit(exitCode)
}
