/* global fetch, process, console */

import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const port = Number.parseInt(process.env.ROUTE_SMOKE_PORT || '3100', 10)
const baseUrl = process.env.ROUTE_SMOKE_BASE_URL || `http://localhost:${port}`

const publicRoutes = [
  '/',
  '/pricing',
  '/how-it-works',
  '/features',
  '/features/oss-maintainers',
  '/features/startup-ctos',
  '/docs',
  '/docs/api-reference',
  '/help',
  '/help/getting-started',
  '/help/getting-started/welcome',
  '/help/getting-started/connect-repo',
  '/help/getting-started/first-review',
  '/help/getting-started/policies',
  '/help/support',
  '/marketplace',
  '/marketplace/integrations',
  '/integrations',
  '/security',
  '/audit-example',
  '/about',
  '/changelog',
  '/privacy',
  '/terms',
  '/status',
  '/contact',
  '/faq',
  '/support',
  '/cookies',
  '/dpa',
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
    await checkRoute(route, [200])
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
