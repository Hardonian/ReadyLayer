/**
 * HTTP Request Connector
 * Executes HTTP requests with SSRF protection
 */

import type { JobContext } from '../../../../lib/jobforge/shared/src'
import { z } from 'zod'

const HttpRequestPayloadSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']).default('GET'),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  timeout_ms: z.number().int().positive().max(300_000).default(30_000),
  allowlist: z.array(z.string()).optional(),
  redact_headers: z.array(z.string()).default(['authorization', 'cookie', 'set-cookie']),
})

export type HttpRequestPayload = z.infer<typeof HttpRequestPayloadSchema>

export interface HttpRequestResult {
  status: number
  duration_ms: number
  response_headers: Record<string, string>
  response_body_preview: string
  success: boolean
}

const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254', // AWS metadata
  'metadata.google.internal', // GCP metadata
]

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
]

/**
 * SSRF protection: validate URL against allowlist and block private IPs
 */
function validateUrl(url: string, allowlist?: string[]): void {
  const parsed = new URL(url)

  // Check blocked hosts
  if (BLOCKED_HOSTS.includes(parsed.hostname.toLowerCase())) {
    throw new Error(`Blocked host: ${parsed.hostname}`)
  }

  // Check private IP ranges
  for (const pattern of PRIVATE_IP_RANGES) {
    if (pattern.test(parsed.hostname)) {
      throw new Error(`Private IP address not allowed: ${parsed.hostname}`)
    }
  }

  // Check allowlist if provided
  if (allowlist && allowlist.length > 0) {
    const allowed = allowlist.some((pattern) => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
        return regex.test(parsed.hostname)
      }
      return parsed.hostname === pattern || parsed.hostname.endsWith(`.${pattern}`)
    })

    if (!allowed) {
      throw new Error(`Host not in allowlist: ${parsed.hostname}`)
    }
  }
}

/**
 * HTTP Request Handler
 */
export async function httpRequestHandler(
  payload: unknown,
  _context: JobContext
): Promise<HttpRequestResult> {
  const validated = HttpRequestPayloadSchema.parse(payload)

  // SSRF protection
  validateUrl(validated.url, validated.allowlist)

  const startTime = Date.now()

  try {
    const response = await fetch(validated.url, {
      method: validated.method,
      headers: validated.headers as HeadersInit,
      body:
        validated.body && validated.method !== 'GET' && validated.method !== 'HEAD'
          ? typeof validated.body === 'string'
            ? validated.body
            : JSON.stringify(validated.body)
          : undefined,
      signal: AbortSignal.timeout(validated.timeout_ms),
    })

    const duration_ms = Date.now() - startTime

    // Redact sensitive headers
    const response_headers: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      if (!validated.redact_headers.includes(key.toLowerCase())) {
        response_headers[key] = value
      }
    })

    // Read response body with size limit
    const MAX_BODY_SIZE = 1_000_000 // 1MB
    const bodyText = await response.text()
    const response_body_preview =
      bodyText.length > MAX_BODY_SIZE
        ? bodyText.substring(0, MAX_BODY_SIZE) + '... (truncated)'
        : bodyText

    return {
      status: response.status,
      duration_ms,
      response_headers,
      response_body_preview,
      success: response.ok,
    }
  } catch (error) {

    throw new Error(
      `HTTP request failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
