/**
 * Git Provider Comment Formatter
 * 
 * Formats policy evaluation results as provider-specific PR/MR comments
 */

import { formatProviderComment, detectGitProvider, type GitProvider } from './index'

export interface PolicyEvaluationInput {
  blocked: boolean
  score: number
  rulesFired: string[]
  nonWaivedFindings: Array<{
    ruleId: string
    severity: string
    message: string
    file?: string | null
    line?: number | null
  }>
}

export interface CommentFormatOptions {
  provider?: GitProvider
  repository?: {
    provider?: string
    url?: string
  }
  includeScore?: boolean
  includeIssues?: boolean
  maxIssues?: number
}

/**
 * Format policy evaluation result as a Git provider comment
 * 
 * Note: For non-blocking issues, rely on check run UI instead of posting comments.
 * This function is primarily used when blocked OR when user explicitly requests a comment.
 */
export function formatPolicyComment(
  evaluationResult: PolicyEvaluationInput,
  options: CommentFormatOptions = {}
): string {
  const provider = options.provider || (options.repository ? detectGitProvider(options.repository) : 'generic')
  
  const title = evaluationResult.blocked
    ? '🚫 Policy Check Failed - PR Blocked'
    : '✅ Policy Check Passed'

  const body = evaluationResult.blocked
    ? `This PR/MR has been **blocked** due to policy violations. Please review the issues below and address them before merging.\n\nView detailed report in the ReadyLayer check run above.`
    : `This PR/MR has passed all policy checks. See the ReadyLayer check run for details.`

  const issues = evaluationResult.nonWaivedFindings.map((finding) => ({
    severity: finding.severity,
    message: `${finding.ruleId}: ${finding.message}`,
    file: finding.file || 'unknown',
    line: finding.line || 0,
  }))

  // Only include issues in comment when blocked (for non-blocking, check run UI shows them)
  return formatProviderComment(provider, {
    title,
    body,
    issues: evaluationResult.blocked && options.includeIssues !== false ? issues : undefined,
    score: options.includeScore !== false ? evaluationResult.score : undefined,
  })
}

/**
 * Generate status check description
 */
export function generateStatusCheckDescription(
  evaluationResult: PolicyEvaluationInput,
  _provider?: GitProvider
): string {
  const issuesCount = evaluationResult.nonWaivedFindings.length
  
  if (evaluationResult.blocked) {
    return `Policy check failed: ${issuesCount} issue(s) found. Score: ${evaluationResult.score.toFixed(1)}/100`
  }

  return `Policy check passed. Score: ${evaluationResult.score.toFixed(1)}/100`
}
