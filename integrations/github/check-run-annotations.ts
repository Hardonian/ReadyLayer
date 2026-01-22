/**
 * GitHub Check-Run Annotations Helper
 *
 * Converts violations/findings to GitHub check-run annotations
 * for inline code comments in PRs
 */

import type { CheckRunAnnotation } from './api-client';
import type { Issue } from '../../services/static-analysis';

export interface ViolationForAnnotation {
  file: string;
  line: number;
  endLine?: number;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  ruleId: string;
  fix?: string;
}

/**
 * Convert violation severity to GitHub annotation level
 */
function severityToAnnotationLevel(
  severity: ViolationForAnnotation['severity']
): CheckRunAnnotation['annotation_level'] {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'failure';
    case 'medium':
      return 'warning';
    case 'low':
    case 'info':
      return 'notice';
    default:
      return 'notice';
  }
}

/**
 * Convert violations to GitHub check-run annotations
 *
 * GitHub limits annotations to 50 per check-run, so we:
 * 1. Prioritize by severity (critical > high > medium > low > info)
 * 2. Take the top 50 most important issues
 * 3. Include a summary if there are more than 50
 */
export function violationsToAnnotations(
  violations: ViolationForAnnotation[]
): {
  annotations: CheckRunAnnotation[];
  truncated: boolean;
  totalCount: number;
} {
  const MAX_ANNOTATIONS = 50;

  // Sort by severity (critical first)
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  const sorted = [...violations].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  // Take top 50
  const top50 = sorted.slice(0, MAX_ANNOTATIONS);
  const truncated = violations.length > MAX_ANNOTATIONS;

  const annotations: CheckRunAnnotation[] = top50.map((violation) => ({
    path: violation.file,
    start_line: violation.line,
    end_line: violation.endLine || violation.line,
    annotation_level: severityToAnnotationLevel(violation.severity),
    title: `${violation.ruleId}`,
    message: violation.message,
    raw_details: violation.fix
      ? `**Suggested Fix:**\n\`\`\`\n${violation.fix}\n\`\`\``
      : undefined,
  }));

  return {
    annotations,
    truncated,
    totalCount: violations.length,
  };
}

/**
 * Convert Issue[] (from static analysis) to ViolationForAnnotation[]
 */
export function issuesToViolations(issues: Issue[]): ViolationForAnnotation[] {
  return issues.map((issue) => ({
    file: issue.file,
    line: issue.line,
    endLine: (issue as { endLine?: number }).endLine, // endLine is optional on Issue type
    severity: issue.severity,
    message: issue.message,
    ruleId: issue.ruleId,
    fix: issue.fix,
  }));
}

/**
 * Create check-run summary text with annotation info
 */
export function createCheckRunSummary(params: {
  totalIssues: number;
  annotationCount: number;
  truncated: boolean;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  dashboardUrl?: string;
}): string {
  const { totalIssues, annotationCount, truncated, dashboardUrl } = params;

  let summary = `ReadyLayer found **${totalIssues}** issue${totalIssues === 1 ? '' : 's'}.\n\n`;

  // Severity breakdown
  summary += '### Issues by Severity\n\n';
  if (params.criticalCount > 0) {
    summary += `- 🔴 **Critical:** ${params.criticalCount}\n`;
  }
  if (params.highCount > 0) {
    summary += `- 🟠 **High:** ${params.highCount}\n`;
  }
  if (params.mediumCount > 0) {
    summary += `- 🟡 **Medium:** ${params.mediumCount}\n`;
  }
  if (params.lowCount > 0) {
    summary += `- 🔵 **Low:** ${params.lowCount}\n`;
  }

  summary += '\n';

  if (truncated) {
    summary += `⚠️ **Note:** Showing top ${annotationCount} of ${totalIssues} issues inline. `;
    if (dashboardUrl) {
      summary += `[View all issues in the dashboard](${dashboardUrl}).\n\n`;
    } else {
      summary += 'Critical and high severity issues are prioritized.\n\n';
    }
  }

  if (dashboardUrl) {
    summary += `📊 [View detailed report in ReadyLayer Dashboard →](${dashboardUrl})\n`;
  }

  return summary;
}

/**
 * Count issues by severity
 */
export function countBySeverity(violations: ViolationForAnnotation[]): {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
} {
  return violations.reduce(
    (counts, v) => {
      counts[v.severity]++;
      return counts;
    },
    { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
  );
}

/**
 * Helper to create complete check-run details with annotations
 */
export function createCheckRunWithAnnotations(params: {
  name: string;
  headSha: string;
  violations: ViolationForAnnotation[];
  conclusion: 'success' | 'failure' | 'neutral';
  dashboardUrl?: string;
}): {
  name: string;
  head_sha: string;
  status: 'completed';
  conclusion: 'success' | 'failure' | 'neutral';
  output: {
    title: string;
    summary: string;
    annotations: CheckRunAnnotation[];
  };
} {
  const { annotations, truncated, totalCount } = violationsToAnnotations(
    params.violations
  );

  const severityCounts = countBySeverity(params.violations);

  const title =
    totalCount === 0
      ? '✅ No issues found'
      : params.conclusion === 'failure'
      ? `❌ ${totalCount} issue${totalCount === 1 ? '' : 's'} found (blocked)`
      : `⚠️ ${totalCount} issue${totalCount === 1 ? '' : 's'} found`;

  const summary = createCheckRunSummary({
    totalIssues: totalCount,
    annotationCount: annotations.length,
    truncated,
    criticalCount: severityCounts.critical,
    highCount: severityCounts.high,
    mediumCount: severityCounts.medium,
    lowCount: severityCounts.low,
    dashboardUrl: params.dashboardUrl,
  });

  return {
    name: params.name,
    head_sha: params.headSha,
    status: 'completed',
    conclusion: params.conclusion,
    output: {
      title,
      summary,
      annotations,
    },
  };
}
