/**
 * Job handler registry
 */

import type {
  JobHandler,
  JobHandlerOptions,
  JobHandlerRegistration,
  JobTypeRegistry,
} from '../../../../lib/jobforge/shared/src'

export class HandlerRegistry implements JobTypeRegistry {
  private handlers = new Map<string, JobHandlerRegistration>()

  register<TPayload = unknown, TResult = unknown>(
    type: string,
    handler: JobHandler<TPayload, TResult>,
    options?: JobHandlerOptions
  ): void {
    if (this.handlers.has(type)) {
      throw new Error(`Handler already registered for type: ${type}`)
    }

    this.handlers.set(type, { handler: handler as JobHandler, options })
  }

  get(type: string): JobHandlerRegistration | undefined {
    return this.handlers.get(type)
  }

  has(type: string): boolean {
    return this.handlers.has(type)
  }

  list(): string[] {
    return Array.from(this.handlers.keys())
  }
}
