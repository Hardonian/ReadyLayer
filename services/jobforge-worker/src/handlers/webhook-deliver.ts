/**
 * Webhook Delivery Connector
 * Delivers webhooks with HMAC signing and retry tracking
 */

import type { JobContext } from '../../../../lib/jobforge/shared/src'
import { z } from 'zod'
import { createHmac } from 'crypto'

const WebhookDeliverPayloadSchema = z.object({
  target_url: z.string().url(),
  event_type: z.string().min(1),
  event_id: z.string().uuid(),
  data: z.record(z.string(), z.unknown()),
  secret_ref: z.string().optional(),
  signature_algo: z.enum(['sha256', 'sha512']).default('sha256'),
  timeout_ms: z.number().int().positive().max(60_000).default(10_000),
})

export type WebhookDeliverPayload = z.infer<typeof WebhookDeliverPayloadSchema>

export interface WebhookDeliverResult {
  delivered: boolean
  status: number
  duration_ms: number
  response_preview: string
  signature: string | null
  timestamp: string
}

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(payload: string, secret: string, algo: 'sha256' | 'sha512'): string {
  const hmac = createHmac(algo, secret)
  hmac.update(payload)
  return hmac.digest('hex')
}

/**
 * Webhook Delivery Handler
 */
export async function webhookDeliverHandler(
  payload: unknown,
  context: JobContext
): Promise<WebhookDeliverResult> {
  const validated = WebhookDeliverPayloadSchema.parse(payload)

  const timestamp = new Date().toISOString()

  // Prepare webhook payload
  const webhookPayload = {
    event_type: validated.event_type,
    event_id: validated.event_id,
    timestamp,
    data: validated.data,
  }

  const payloadString = JSON.stringify(webhookPayload)

  // Generate signature if secret provided
  let signature: string | null = null
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'JobForge-Webhook/1.0',
    'X-JobForge-Event': validated.event_type,
    'X-JobForge-Event-ID': validated.event_id,
    'X-JobForge-Timestamp': timestamp,
    'X-JobForge-Delivery-Attempt': String(context.attempt_no),
  }

  if (validated.secret_ref) {
    // In production, fetch secret from secure store using secret_ref
    // For now, read from env var with secret_ref as key
    const secret = process.env[validated.secret_ref]
    if (!secret) {
      throw new Error(`Secret not found: ${validated.secret_ref}`)
    }

    signature = generateSignature(payloadString, secret, validated.signature_algo)
    headers['X-JobForge-Signature'] = `${validated.signature_algo}=${signature}`
  }

  const startTime = Date.now()

  try {
    const response = await fetch(validated.target_url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: AbortSignal.timeout(validated.timeout_ms),
    })

    const duration_ms = Date.now() - startTime

    const responseText = await response.text()
    const response_preview =
      responseText.length > 500 ? responseText.substring(0, 500) + '... (truncated)' : responseText

    return {
      delivered: response.ok,
      status: response.status,
      duration_ms,
      response_preview,
      signature,
      timestamp,
    }
  } catch (error) {
    const duration_ms = Date.now() - startTime

    // Return partial result for retryable errors
    return {
      delivered: false,
      status: 0,
      duration_ms,
      response_preview: error instanceof Error ? error.message : String(error),
      signature,
      timestamp,
    }
  }
}
