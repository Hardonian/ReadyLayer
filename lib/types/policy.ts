/**
 * Policy Type Definitions
 * 
 * Shared types for policy validation, parsing, and management
 */

export interface PolicyRule {
  ruleId: string
  enabled?: boolean
  severityMapping?: Record<string, string>
  params?: Record<string, unknown>
}

export interface PolicyDocument {
  version: string
  rules: PolicyRule[]
  source?: string
}

export interface PolicyValidationError {
  ruleId: string
  error: string
}

export interface PolicyValidationResult {
  valid: boolean
  message: string
  errors?: PolicyValidationError[]
  warnings?: string[]
}

export interface PolicyTemplate {
  id: string
  name: string
  description?: string
  version: string
  rules: PolicyRule[]
}

export interface PolicyRuleConfig {
  ruleId: string
  enabled: boolean
  severityMapping: Record<string, string>
  params?: Record<string, unknown>
}
