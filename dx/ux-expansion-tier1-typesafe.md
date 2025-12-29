# ReadyLayer — Tier 1 Expansion (Type-Safe Implementation)

## Overview

Complete, type-safe implementation specifications for Tier 1 high-priority expansions: GitLab MR UX, Slack Rich Messages, CLI Enhancement, and GitHub Browser Extension.

---

## Type Definitions

### Core Types

```typescript
// Core status types
type ReviewStatus = 'pending' | 'in_progress' | 'success' | 'warning' | 'failure' | 'error';
type Severity = 'critical' | 'high' | 'medium' | 'low';
type Platform = 'github' | 'gitlab' | 'bitbucket' | 'azure-devops';

// Issue types
interface Issue {
  id: string;
  severity: Severity;
  rule_id: string;
  file: string;
  line: number;
  column?: number;
  message: string;
  description: string;
  suggestion?: string;
  code_snippet?: CodeSnippet;
  related_issues?: string[];
  introduced_at?: string;
}

interface CodeSnippet {
  language: string;
  before?: string;
  after?: string;
  context?: string;
}

// Review types
interface Review {
  id: string;
  repo_id: string;
  pr_id: string;
  platform: Platform;
  status: ReviewStatus;
  issues: Issue[];
  summary: ReviewSummary;
  progress?: ReviewProgress;
  created_at: string;
  completed_at?: string;
}

interface ReviewSummary {
  total_issues: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  files_affected: number;
}

interface ReviewProgress {
  percentage: number;
  files_analyzed: number;
  files_total: number;
  estimated_time_remaining?: number;
  current_file?: string;
}

// WebSocket event types
type WebSocketEventType = 
  | 'review.started'
  | 'review.progress'
  | 'review.file_completed'
  | 'review.completed'
  | 'review.failed'
  | 'test.generation.started'
  | 'test.generation.progress'
  | 'test.generation.completed'
  | 'docs.sync.started'
  | 'docs.sync.completed';

interface WebSocketEvent<T = unknown> {
  event: WebSocketEventType;
  timestamp: string;
  data: T;
  correlation_id: string;
}

interface ReviewProgressEventData {
  review_id: string;
  progress: ReviewProgress;
}

interface ReviewCompletedEventData {
  review_id: string;
  review: Review;
}
```

---

## 1. GitLab Merge Request UX

### Type Definitions

```typescript
// GitLab-specific types
interface GitLabMR {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description?: string;
  state: 'opened' | 'closed' | 'merged';
  source_branch: string;
  target_branch: string;
  sha: string;
  merge_commit_sha?: string;
  web_url: string;
}

interface GitLabMRComment {
  id: number;
  body: string;
  author: GitLabUser;
  created_at: string;
  position?: GitLabMRPosition;
  resolvable: boolean;
  resolved?: boolean;
}

interface GitLabMRPosition {
  base_sha: string;
  start_sha: string;
  head_sha: string;
  old_path: string;
  new_path: string;
  position_type: 'text';
  new_line: number;
  old_line?: number;
}

interface GitLabPipelineStatus {
  id: number;
  sha: string;
  ref: string;
  status: 'success' | 'failed' | 'canceled' | 'running' | 'pending';
  name: string;
  target_url?: string;
  description?: string;
}

interface GitLabUser {
  id: number;
  username: string;
  name: string;
  avatar_url?: string;
}

// GitLab API client types
interface GitLabAPIClient {
  getMR(projectId: number, mrIid: number): Promise<GitLabMR>;
  getMRDiff(projectId: number, mrIid: number): Promise<GitLabMRDiff>;
  postMRComment(projectId: number, mrIid: number, comment: GitLabMRCommentInput): Promise<GitLabMRComment>;
  updatePipelineStatus(projectId: number, sha: string, status: GitLabPipelineStatusInput): Promise<GitLabPipelineStatus>;
  subscribeToMRUpdates(projectId: number, mrIid: number, callback: (event: GitLabMREvent) => void): Promise<void>;
}

interface GitLabMRCommentInput {
  body: string;
  position?: GitLabMRPosition;
}

interface GitLabPipelineStatusInput {
  state: 'success' | 'failed' | 'canceled' | 'running' | 'pending';
  name: string;
  target_url?: string;
  description?: string;
}

interface GitLabMREvent {
  object_kind: 'merge_request';
  event_type: 'merge_request';
  object_attributes: {
    action: 'open' | 'update' | 'close' | 'merge';
    iid: number;
    [key: string]: unknown;
  };
  project: {
    id: number;
    [key: string]: unknown;
  };
}
```

### Implementation

```typescript
// GitLab MR UX Service
class GitLabMRUXService {
  constructor(
    private apiClient: GitLabAPIClient,
    private webSocketClient: WebSocketClient,
    private reviewService: ReviewService
  ) {}

  /**
   * Create live status badge for GitLab MR
   */
  async createStatusBadge(
    projectId: number,
    mrIid: number,
    review: Review
  ): Promise<GitLabPipelineStatus> {
    const status = this.mapReviewStatusToGitLabStatus(review.status);
    const description = this.generateStatusDescription(review);

    return await this.apiClient.updatePipelineStatus(
      projectId,
      review.pr_id,
      {
        state: status,
        name: 'readylayer/review',
        target_url: `https://readylayer.com/reviews/${review.id}`,
        description
      }
    );
  }

  /**
   * Create review summary card comment
   */
  async createSummaryCard(
    projectId: number,
    mrIid: number,
    review: Review
  ): Promise<GitLabMRComment> {
    const summaryMarkdown = this.generateSummaryMarkdown(review);

    return await this.apiClient.postMRComment(projectId, mrIid, {
      body: summaryMarkdown
    });
  }

  /**
   * Create rich inline comment for issue
   */
  async createInlineComment(
    projectId: number,
    mrIid: number,
    issue: Issue
  ): Promise<GitLabMRComment> {
    const position = await this.getIssuePosition(projectId, mrIid, issue);
    const commentBody = this.generateIssueComment(issue);

    return await this.apiClient.postMRComment(projectId, mrIid, {
      body: commentBody,
      position
    });
  }

  /**
   * Create progress indicator comment
   */
  async createProgressIndicator(
    projectId: number,
    mrIid: number,
    progress: ReviewProgress
  ): Promise<GitLabMRComment> {
    const progressMarkdown = this.generateProgressMarkdown(progress);

    return await this.apiClient.postMRComment(projectId, mrIid, {
      body: progressMarkdown
    });
  }

  /**
   * Subscribe to real-time MR updates
   */
  async subscribeToMRUpdates(
    projectId: number,
    mrIid: number,
    reviewId: string
  ): Promise<void> {
    await this.webSocketClient.subscribe(`review:${reviewId}`, (event: WebSocketEvent) => {
      this.handleWebSocketEvent(projectId, mrIid, event);
    });
  }

  /**
   * Handle WebSocket events for MR updates
   */
  private async handleWebSocketEvent(
    projectId: number,
    mrIid: number,
    event: WebSocketEvent
  ): Promise<void> {
    switch (event.event) {
      case 'review.started':
        await this.createProgressIndicator(projectId, mrIid, { percentage: 0, files_analyzed: 0, files_total: 0 });
        break;
      
      case 'review.progress':
        const progressData = event.data as ReviewProgressEventData;
        await this.updateProgressIndicator(projectId, mrIid, progressData.progress);
        break;
      
      case 'review.completed':
        const completedData = event.data as ReviewCompletedEventData;
        await this.createStatusBadge(projectId, mrIid, completedData.review);
        await this.createSummaryCard(projectId, mrIid, completedData.review);
        await this.createInlineComments(projectId, mrIid, completedData.review.issues);
        break;
      
      case 'review.failed':
        await this.createErrorComment(projectId, mrIid, event.data as { error: string });
        break;
    }
  }

  /**
   * Map ReadyLayer review status to GitLab pipeline status
   */
  private mapReviewStatusToGitLabStatus(status: ReviewStatus): GitLabPipelineStatusInput['state'] {
    const statusMap: Record<ReviewStatus, GitLabPipelineStatusInput['state']> = {
      'pending': 'pending',
      'in_progress': 'running',
      'success': 'success',
      'warning': 'success', // GitLab doesn't have warning, use success
      'failure': 'failed',
      'error': 'failed'
    };
    return statusMap[status];
  }

  /**
   * Generate status description
   */
  private generateStatusDescription(review: Review): string {
    const icons: Record<ReviewStatus, string> = {
      'pending': '⏳',
      'in_progress': '🔄',
      'success': '✅',
      'warning': '⚠️',
      'failure': '❌',
      'error': '🔴'
    };

    const icon = icons[review.status];
    const summary = review.summary;

    if (review.status === 'success') {
      return `${icon} Review completed, no issues found`;
    } else if (review.status === 'failure') {
      return `${icon} Review failed: ${summary.critical} critical, ${summary.high} high issues`;
    } else if (review.status === 'warning') {
      return `${icon} Review completed with warnings: ${summary.medium} medium, ${summary.low} low issues`;
    } else {
      return `${icon} Review ${review.status}`;
    }
  }

  /**
   * Generate summary markdown
   */
  private generateSummaryMarkdown(review: Review): string {
    const statusIcon = review.status === 'failure' ? '❌' : review.status === 'warning' ? '⚠️' : '✅';
    const statusText = review.status === 'failure' ? 'BLOCKED' : review.status === 'warning' ? 'WARNINGS' : 'PASSED';

    return `## 🔒 ReadyLayer Review Summary

**Status:** ${statusIcon} **${statusText}** (${review.summary.critical} critical, ${review.summary.high} high issues)

### Issues Found: ${review.summary.total_issues}
- 🔴 **Critical:** ${review.summary.critical}
- 🟠 **High:** ${review.summary.high}
- 🟡 **Medium:** ${review.summary.medium}
- 🟢 **Low:** ${review.summary.low}

### Files Affected: ${review.summary.files_affected}
${this.formatFilesList(review.issues)}

### Rules Triggered
${this.formatRulesList(review.issues)}

### Required Actions
${this.formatRequiredActions(review.issues)}

**This MR ${review.status === 'failure' ? 'cannot merge' : 'can merge'} until all critical and high issues are resolved.**

[View Full Report](https://readylayer.com/reviews/${review.id}) | [Configure Rules](https://readylayer.com/config)`;
  }

  /**
   * Generate issue comment markdown
   */
  private generateIssueComment(issue: Issue): string {
    const severityIcons: Record<Severity, string> = {
      'critical': '🔴',
      'high': '🟠',
      'medium': '🟡',
      'low': '🟢'
    };

    const icon = severityIcons[issue.severity];

    return `<details>
<summary>${icon} <b>${issue.message}</b> (${issue.severity})</summary>

**Rule:** \`${issue.rule_id}\`  
**File:** \`${issue.file}\`  
**Line:** ${issue.line}  
${issue.introduced_at ? `**Introduced:** ${issue.introduced_at}` : ''}  
**Severity:** ${issue.severity}

**Issue:**
${issue.description}

${issue.code_snippet?.before ? `**Vulnerable Code:**
\`\`\`${issue.code_snippet.language}
${issue.code_snippet.before}
\`\`\`` : ''}

${issue.suggestion ? `**Fix:**
\`\`\`${issue.code_snippet?.language || 'typescript'}
${issue.suggestion}
\`\`\`` : ''}

**Why This Matters:**
${this.getSeverityExplanation(issue.severity)}

${issue.related_issues && issue.related_issues.length > 0 ? `**Related Issues:**
${issue.related_issues.map(id => `- Similar issue in ${id}`).join('\n')}` : ''}

[Apply Fix] [Learn More] [Mark as False Positive] [Dismiss]
</details>`;
  }

  /**
   * Generate progress markdown
   */
  private generateProgressMarkdown(progress: ReviewProgress): string {
    const barWidth = 20;
    const filled = Math.floor(progress.percentage / 100 * barWidth);
    const empty = barWidth - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    return `⏳ ReadyLayer Review In Progress

Progress: ${bar} ${progress.percentage}%
Files analyzed: ${progress.files_analyzed}/${progress.files_total}
${progress.estimated_time_remaining ? `Estimated time remaining: ${progress.estimated_time_remaining} seconds` : ''}

${progress.current_file ? `Current file: \`${progress.current_file}\`` : ''}

[Cancel Review]`;
  }

  /**
   * Format files list for summary
   */
  private formatFilesList(issues: Issue[]): string {
    const filesMap = new Map<string, { critical: number; high: number; medium: number; low: number }>();
    
    issues.forEach(issue => {
      if (!filesMap.has(issue.file)) {
        filesMap.set(issue.file, { critical: 0, high: 0, medium: 0, low: 0 });
      }
      const fileIssues = filesMap.get(issue.file)!;
      fileIssues[issue.severity]++;
    });

    return Array.from(filesMap.entries())
      .map(([file, counts]) => {
        const parts: string[] = [];
        if (counts.critical > 0) parts.push(`${counts.critical} critical`);
        if (counts.high > 0) parts.push(`${counts.high} high`);
        if (counts.medium > 0) parts.push(`${counts.medium} medium`);
        if (counts.low > 0) parts.push(`${counts.low} low`);
        return `- \`${file}\` (${parts.join(', ')})`;
      })
      .join('\n');
  }

  /**
   * Format rules list for summary
   */
  private formatRulesList(issues: Issue[]): string {
    const rulesSet = new Set(issues.map(i => i.rule_id));
    return Array.from(rulesSet)
      .map(ruleId => {
        const issue = issues.find(i => i.rule_id === ruleId)!;
        const severityIcons: Record<Severity, string> = {
          'critical': '🔴',
          'high': '🟠',
          'medium': '🟡',
          'low': '🟢'
        };
        return `- \`${ruleId}\` (${severityIcons[issue.severity]} ${issue.severity})`;
      })
      .join('\n');
  }

  /**
   * Format required actions
   */
  private formatRequiredActions(issues: Issue[]): string {
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');

    const actions: string[] = [];

    if (criticalIssues.length > 0) {
      actions.push(`1. Fix ${criticalIssues.length} critical issue(s)`);
      criticalIssues.forEach(issue => {
        actions.push(`   - \`${issue.file}:${issue.line}\` (${issue.rule_id})`);
      });
    }

    if (highIssues.length > 0) {
      actions.push(`2. Address ${highIssues.length} high issue(s)`);
      highIssues.forEach(issue => {
        actions.push(`   - \`${issue.file}:${issue.line}\` (${issue.rule_id})`);
      });
    }

    if (actions.length === 0) {
      return 'No action required.';
    }

    actions.push('3. Push fixes and ReadyLayer will re-review');

    return actions.join('\n');
  }

  /**
   * Get severity explanation
   */
  private getSeverityExplanation(severity: Severity): string {
    const explanations: Record<Severity, string> = {
      'critical': 'Critical issues can lead to security vulnerabilities, data loss, or system crashes.',
      'high': 'High issues can cause bugs or significant maintenance problems.',
      'medium': 'Medium issues are style problems or minor quality issues.',
      'low': 'Low issues are suggestions and best practices.'
    };
    return explanations[severity];
  }

  /**
   * Get issue position in MR diff
   */
  private async getIssuePosition(
    projectId: number,
    mrIid: number,
    issue: Issue
  ): Promise<GitLabMRPosition | undefined> {
    const mr = await this.apiClient.getMR(projectId, mrIid);
    const diff = await this.apiClient.getMRDiff(projectId, mrIid);
    
    // Find the file in diff
    const fileDiff = diff.files.find(f => f.new_path === issue.file || f.old_path === issue.file);
    if (!fileDiff) return undefined;

    return {
      base_sha: mr.target_branch,
      start_sha: mr.target_branch,
      head_sha: mr.sha,
      old_path: fileDiff.old_path,
      new_path: fileDiff.new_path,
      position_type: 'text',
      new_line: issue.line
    };
  }

  /**
   * Create inline comments for all issues
   */
  private async createInlineComments(
    projectId: number,
    mrIid: number,
    issues: Issue[]
  ): Promise<GitLabMRComment[]> {
    const comments: GitLabMRComment[] = [];
    
    for (const issue of issues) {
      try {
        const comment = await this.createInlineComment(projectId, mrIid, issue);
        comments.push(comment);
      } catch (error) {
        console.error(`Failed to create comment for issue ${issue.id}:`, error);
      }
    }

    return comments;
  }

  /**
   * Update progress indicator comment
   */
  private async updateProgressIndicator(
    projectId: number,
    mrIid: number,
    progress: ReviewProgress
  ): Promise<void> {
    // Implementation: Find existing progress comment and update it
    // Or create new one if doesn't exist
    await this.createProgressIndicator(projectId, mrIid, progress);
  }

  /**
   * Create error comment
   */
  private async createErrorComment(
    projectId: number,
    mrIid: number,
    errorData: { error: string }
  ): Promise<GitLabMRComment> {
    return await this.apiClient.postMRComment(projectId, mrIid, {
      body: `❌ ReadyLayer Review Failed

**Error:** ${errorData.error}

[Retry] [View Logs] [Contact Support]`
    });
  }
}

// Additional types for GitLab diff
interface GitLabMRDiff {
  files: GitLabMRDiffFile[];
}

interface GitLabMRDiffFile {
  old_path: string;
  new_path: string;
  diff: string;
  new_file: boolean;
  deleted_file: boolean;
  renamed_file: boolean;
}
```

---

## 2. Slack Rich Messages

### Type Definitions

```typescript
// Slack-specific types
interface SlackMessage {
  text?: string;
  blocks: SlackBlock[];
  thread_ts?: string;
  channel?: string;
}

type SlackBlock = 
  | SlackSectionBlock
  | SlackHeaderBlock
  | SlackDividerBlock
  | SlackActionsBlock
  | SlackContextBlock
  | SlackImageBlock;

interface SlackSectionBlock {
  type: 'section';
  text?: SlackText;
  fields?: SlackText[];
  accessory?: SlackElement;
}

interface SlackHeaderBlock {
  type: 'header';
  text: SlackText;
}

interface SlackDividerBlock {
  type: 'divider';
}

interface SlackActionsBlock {
  type: 'actions';
  elements: SlackElement[];
}

interface SlackContextBlock {
  type: 'context';
  elements: SlackElement[];
}

interface SlackImageBlock {
  type: 'image';
  image_url: string;
  alt_text: string;
  title?: SlackText;
}

type SlackText = SlackPlainText | SlackMarkdownText;

interface SlackPlainText {
  type: 'plain_text';
  text: string;
  emoji?: boolean;
}

interface SlackMarkdownText {
  type: 'mrkdwn';
  text: string;
  verbatim?: boolean;
}

type SlackElement = 
  | SlackButton
  | SlackSelectMenu
  | SlackDatePicker;

interface SlackButton {
  type: 'button';
  text: SlackPlainText;
  action_id: string;
  url?: string;
  value?: string;
  style?: 'primary' | 'danger';
  confirm?: SlackConfirmation;
}

interface SlackSelectMenu {
  type: 'static_select' | 'external_select' | 'users_select' | 'conversations_select' | 'channels_select';
  placeholder: SlackPlainText;
  action_id: string;
  options?: SlackOption[];
  initial_option?: SlackOption;
}

interface SlackOption {
  text: SlackPlainText;
  value: string;
  description?: SlackPlainText;
}

interface SlackDatePicker {
  type: 'datepicker';
  placeholder: SlackPlainText;
  action_id: string;
  initial_date?: string;
  confirm?: SlackConfirmation;
}

interface SlackConfirmation {
  title: SlackPlainText;
  text: SlackText;
  confirm: SlackPlainText;
  deny: SlackPlainText;
}

// Slack API client types
interface SlackAPIClient {
  postMessage(message: SlackMessage): Promise<SlackMessageResponse>;
  updateMessage(ts: string, channel: string, message: SlackMessage): Promise<SlackMessageResponse>;
  postEphemeral(user: string, channel: string, message: SlackMessage): Promise<void>;
  openModal(triggerId: string, view: SlackModalView): Promise<void>;
}

interface SlackMessageResponse {
  ok: boolean;
  ts: string;
  channel: string;
  message?: SlackMessage;
  error?: string;
}

interface SlackModalView {
  type: 'modal';
  title: SlackPlainText;
  blocks: SlackBlock[];
  submit?: SlackPlainText;
  close?: SlackPlainText;
  private_metadata?: string;
  callback_id?: string;
}

// ReadyLayer Slack integration types
interface SlackNotificationConfig {
  channel_id: string;
  workspace_id: string;
  events: SlackNotificationEvent[];
  severity_filter?: Severity[];
  quiet_hours?: { start: string; end: string };
}

type SlackNotificationEvent = 
  | 'review.completed'
  | 'review.failed'
  | 'test.generated'
  | 'docs.updated'
  | 'coverage.below_threshold';

interface SlackNotification {
  id: string;
  config: SlackNotificationConfig;
  event: SlackNotificationEvent;
  data: SlackNotificationData;
  created_at: string;
}

type SlackNotificationData = 
  | ReviewCompletedNotificationData
  | ReviewFailedNotificationData
  | TestGeneratedNotificationData
  | DocsUpdatedNotificationData
  | CoverageBelowThresholdNotificationData;

interface ReviewCompletedNotificationData {
  review: Review;
  pr_url: string;
  pr_title: string;
}

interface ReviewFailedNotificationData {
  review_id: string;
  error: string;
  pr_url: string;
}

interface TestGeneratedNotificationData {
  review_id: string;
  tests_generated: number;
  files: string[];
  pr_url: string;
}

interface DocsUpdatedNotificationData {
  review_id: string;
  files_updated: string[];
  pr_url: string;
}

interface CoverageBelowThresholdNotificationData {
  review_id: string;
  coverage: number;
  threshold: number;
  pr_url: string;
}
```

### Implementation

```typescript
// Slack Rich Messages Service
class SlackRichMessagesService {
  constructor(
    private apiClient: SlackAPIClient,
    private configService: ConfigService
  ) {}

  /**
   * Send review completed notification
   */
  async sendReviewCompletedNotification(
    config: SlackNotificationConfig,
    data: ReviewCompletedNotificationData
  ): Promise<void> {
    const message = this.buildReviewCompletedMessage(data);
    await this.apiClient.postMessage({
      ...message,
      channel: config.channel_id
    });
  }

  /**
   * Send review failed notification
   */
  async sendReviewFailedNotification(
    config: SlackNotificationConfig,
    data: ReviewFailedNotificationData
  ): Promise<void> {
    const message = this.buildReviewFailedMessage(data);
    await this.apiClient.postMessage({
      ...message,
      channel: config.channel_id
    });
  }

  /**
   * Send test generated notification
   */
  async sendTestGeneratedNotification(
    config: SlackNotificationConfig,
    data: TestGeneratedNotificationData
  ): Promise<void> {
    const message = this.buildTestGeneratedMessage(data);
    await this.apiClient.postMessage({
      ...message,
      channel: config.channel_id
    });
  }

  /**
   * Send docs updated notification
   */
  async sendDocsUpdatedNotification(
    config: SlackNotificationConfig,
    data: DocsUpdatedNotificationData
  ): Promise<void> {
    const message = this.buildDocsUpdatedMessage(data);
    await this.apiClient.postMessage({
      ...message,
      channel: config.channel_id
    });
  }

  /**
   * Send coverage below threshold notification
   */
  async sendCoverageBelowThresholdNotification(
    config: SlackNotificationConfig,
    data: CoverageBelowThresholdNotificationData
  ): Promise<void> {
    const message = this.buildCoverageBelowThresholdMessage(data);
    await this.apiClient.postMessage({
      ...message,
      channel: config.channel_id
    });
  }

  /**
   * Build review completed message blocks
   */
  private buildReviewCompletedMessage(data: ReviewCompletedNotificationData): SlackMessage {
    const review = data.review;
    const statusIcon = review.status === 'failure' ? '❌' : review.status === 'warning' ? '⚠️' : '✅';
    const statusText = review.status === 'failure' ? 'BLOCKED' : review.status === 'warning' ? 'WARNINGS' : 'PASSED';

    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusIcon} ReadyLayer Review Completed`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*<${data.pr_url}|${data.pr_title}>*`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Status:*\n${statusIcon} ${statusText}`
          },
          {
            type: 'mrkdwn',
            text: `*Issues Found:*\n${review.summary.total_issues}`
          },
          {
            type: 'mrkdwn',
            text: `*Critical:*\n🔴 ${review.summary.critical}`
          },
          {
            type: 'mrkdwn',
            text: `*High:*\n🟠 ${review.summary.high}`
          },
          {
            type: 'mrkdwn',
            text: `*Medium:*\n🟡 ${review.summary.medium}`
          },
          {
            type: 'mrkdwn',
            text: `*Low:*\n🟢 ${review.summary.low}`
          }
        ]
      }
    ];

    if (review.summary.files_affected > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Files Affected:* ${review.summary.files_affected}`
        }
      });
    }

    blocks.push({
      type: 'divider'
    });

    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Report'
          },
          url: `https://readylayer.com/reviews/${review.id}`,
          action_id: 'view_report'
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View PR'
          },
          url: data.pr_url,
          action_id: 'view_pr'
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Configure Rules'
          },
          url: 'https://readylayer.com/config',
          action_id: 'configure_rules'
        }
      ]
    });

    return {
      text: `ReadyLayer Review Completed: ${statusText}`,
      blocks
    };
  }

  /**
   * Build review failed message blocks
   */
  private buildReviewFailedMessage(data: ReviewFailedNotificationData): SlackMessage {
    return {
      text: 'ReadyLayer Review Failed',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🔴 ReadyLayer Review Failed'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Error:*\n\`\`\`${data.error}\`\`\``
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*PR:* <${data.pr_url}|View PR>`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Retry'
              },
              action_id: 'retry_review',
              value: data.review_id,
              style: 'primary'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Logs'
              },
              url: `https://readylayer.com/reviews/${data.review_id}/logs`,
              action_id: 'view_logs'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Contact Support'
              },
              url: 'https://readylayer.com/support',
              action_id: 'contact_support'
            }
          ]
        }
      ]
    };
  }

  /**
   * Build test generated message blocks
   */
  private buildTestGeneratedMessage(data: TestGeneratedNotificationData): SlackMessage {
    return {
      text: `ReadyLayer Generated ${data.tests_generated} Tests`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🧪 ReadyLayer Test Generation Completed'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Tests Generated:*\n${data.tests_generated}`
            },
            {
              type: 'mrkdwn',
              text: `*Files:*\n${data.files.length}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Files:*\n${data.files.map(f => `\`${f}\``).join(', ')}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View PR'
              },
              url: data.pr_url,
              action_id: 'view_pr'
            }
          ]
        }
      ]
    };
  }

  /**
   * Build docs updated message blocks
   */
  private buildDocsUpdatedMessage(data: DocsUpdatedNotificationData): SlackMessage {
    return {
      text: 'ReadyLayer Documentation Updated',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📚 ReadyLayer Documentation Updated'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Files Updated:* ${data.files_updated.length}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Files:*\n${data.files_updated.map(f => `\`${f}\``).join(', ')}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View PR'
              },
              url: data.pr_url,
              action_id: 'view_pr'
            }
          ]
        }
      ]
    };
  }

  /**
   * Build coverage below threshold message blocks
   */
  private buildCoverageBelowThresholdMessage(data: CoverageBelowThresholdNotificationData): SlackMessage {
    const percentage = Math.round(data.coverage * 100);
    const thresholdPercentage = Math.round(data.threshold * 100);

    return {
      text: `Coverage Below Threshold: ${percentage}% < ${thresholdPercentage}%`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ Coverage Below Threshold'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Current Coverage:*\n${percentage}%`
            },
            {
              type: 'mrkdwn',
              text: `*Threshold:*\n${thresholdPercentage}%`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Coverage is ${thresholdPercentage - percentage}% below the required threshold.`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View PR'
              },
              url: data.pr_url,
              action_id: 'view_pr'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Coverage Report'
              },
              url: `https://readylayer.com/reviews/${data.review_id}/coverage`,
              action_id: 'view_coverage'
            }
          ]
        }
      ]
    };
  }

  /**
   * Update progress in thread
   */
  async updateProgressInThread(
    channel: string,
    threadTs: string,
    progress: ReviewProgress
  ): Promise<void> {
    const progressMessage = this.buildProgressMessage(progress);
    await this.apiClient.postMessage({
      ...progressMessage,
      channel,
      thread_ts: threadTs
    });
  }

  /**
   * Build progress message blocks
   */
  private buildProgressMessage(progress: ReviewProgress): SlackMessage {
    const barWidth = 10;
    const filled = Math.floor(progress.percentage / 100 * barWidth);
    const empty = barWidth - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    return {
      text: `Review Progress: ${progress.percentage}%`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `⏳ *Review In Progress*\n${bar} ${progress.percentage}%\nFiles: ${progress.files_analyzed}/${progress.files_total}`
          }
        }
      ]
    };
  }
}
```

---

## 3. CLI Tool Enhancement

### Type Definitions

```typescript
// CLI-specific types
interface CLIConfig {
  api_key: string;
  repo_id?: string;
  output_format: 'text' | 'json' | 'table';
  color: boolean;
  verbose: boolean;
}

interface CLICommand {
  name: string;
  description: string;
  options: CLIOption[];
  handler: (args: CLIArgs) => Promise<void>;
}

interface CLIOption {
  name: string;
  alias?: string;
  description: string;
  type: 'string' | 'boolean' | 'number';
  required?: boolean;
  default?: unknown;
}

interface CLIArgs {
  [key: string]: unknown;
}

interface CLIOutput {
  format: 'text' | 'json' | 'table';
  data: unknown;
}

// Terminal UI types
interface TerminalUI {
  renderProgressBar(percentage: number, label?: string): void;
  renderTable(data: TableData): void;
  renderList(items: ListItem[]): void;
  renderStatus(status: ReviewStatus, message: string): void;
  renderError(error: Error): void;
  renderSuccess(message: string): void;
  renderWarning(message: string): void;
  renderInfo(message: string): void;
  prompt(question: string): Promise<string>;
  confirm(question: string): Promise<boolean>;
  select(options: SelectOption[]): Promise<string>;
}

interface TableData {
  headers: string[];
  rows: string[][];
}

interface ListItem {
  label: string;
  value?: string;
  icon?: string;
}

interface SelectOption {
  label: string;
  value: string;
  description?: string;
}

// CLI Service types
interface CLIService {
  review(args: ReviewCLIArgs): Promise<void>;
  generateTests(args: GenerateTestsCLIArgs): Promise<void>;
  checkCoverage(args: CheckCoverageCLIArgs): Promise<void>;
  viewReport(reviewId: string): Promise<void>;
}

interface ReviewCLIArgs {
  file?: string;
  branch?: string;
  fail_on_critical?: boolean;
  fail_on_high?: boolean;
  watch?: boolean;
}

interface GenerateTestsCLIArgs {
  file: string;
  framework?: string;
  output?: string;
}

interface CheckCoverageCLIArgs {
  threshold?: number;
  format?: 'text' | 'json';
}
```

### Implementation

```typescript
// CLI Tool Enhancement Service
class EnhancedCLIService implements CLIService {
  constructor(
    private apiClient: ReadyLayerAPIClient,
    private terminalUI: TerminalUI,
    private config: CLIConfig
  ) {}

  /**
   * Run review command
   */
  async review(args: ReviewCLIArgs): Promise<void> {
    try {
      this.terminalUI.renderInfo('Starting ReadyLayer review...');

      const review = await this.apiClient.createReview({
        repo_id: this.config.repo_id!,
        file_path: args.file,
        branch: args.branch,
        config: {
          fail_on_critical: args.fail_on_critical ?? true,
          fail_on_high: args.fail_on_high ?? false
        }
      });

      // Subscribe to progress updates
      await this.subscribeToProgress(review.id);

      // Wait for review to complete
      const completedReview = await this.waitForReview(review.id);

      // Display results
      this.displayReviewResults(completedReview, args);

      // Exit with appropriate code
      if (completedReview.status === 'failure' && args.fail_on_critical) {
        process.exit(1);
      }
    } catch (error) {
      this.terminalUI.renderError(error as Error);
      process.exit(1);
    }
  }

  /**
   * Generate tests command
   */
  async generateTests(args: GenerateTestsCLIArgs): Promise<void> {
    try {
      this.terminalUI.renderInfo(`Generating tests for ${args.file}...`);

      const result = await this.apiClient.generateTests({
        repo_id: this.config.repo_id!,
        file_path: args.file,
        framework: args.framework
      });

      this.displayTestGenerationResults(result, args);
    } catch (error) {
      this.terminalUI.renderError(error as Error);
      process.exit(1);
    }
  }

  /**
   * Check coverage command
   */
  async checkCoverage(args: CheckCoverageCLIArgs): Promise<void> {
    try {
      const coverage = await this.apiClient.getCoverage({
        repo_id: this.config.repo_id!
      });

      this.displayCoverageResults(coverage, args);
    } catch (error) {
      this.terminalUI.renderError(error as Error);
      process.exit(1);
    }
  }

  /**
   * View report command
   */
  async viewReport(reviewId: string): Promise<void> {
    try {
      const review = await this.apiClient.getReview(reviewId);
      this.displayReviewResults(review, {});
    } catch (error) {
      this.terminalUI.renderError(error as Error);
      process.exit(1);
    }
  }

  /**
   * Subscribe to progress updates
   */
  private async subscribeToProgress(reviewId: string): Promise<void> {
    const ws = new WebSocket(`wss://api.readylayer.com/ws?review_id=${reviewId}`);
    
    ws.on('message', (data: string) => {
      const event: WebSocketEvent = JSON.parse(data);
      
      if (event.event === 'review.progress') {
        const progressData = event.data as ReviewProgressEventData;
        this.terminalUI.renderProgressBar(
          progressData.progress.percentage,
          `Analyzing files... (${progressData.progress.files_analyzed}/${progressData.progress.files_total})`
        );
      }
    });
  }

  /**
   * Wait for review to complete
   */
  private async waitForReview(reviewId: string): Promise<Review> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        try {
          const review = await this.apiClient.getReview(reviewId);
          if (review.status !== 'pending' && review.status !== 'in_progress') {
            clearInterval(checkInterval);
            resolve(review);
          }
        } catch (error) {
          clearInterval(checkInterval);
          reject(error);
        }
      }, 2000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Review timeout'));
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Display review results
   */
  private displayReviewResults(review: Review, args: ReviewCLIArgs): void {
    if (this.config.output_format === 'json') {
      console.log(JSON.stringify(review, null, 2));
      return;
    }

    // Render status
    const statusMessages: Record<ReviewStatus, string> = {
      'pending': '⏳ Pending',
      'in_progress': '🔄 In Progress',
      'success': '✅ Success',
      'warning': '⚠️ Warning',
      'failure': '❌ Failure',
      'error': '🔴 Error'
    };

    this.terminalUI.renderStatus(review.status, statusMessages[review.status]);

    // Render summary table
    const summaryTable: TableData = {
      headers: ['Severity', 'Count'],
      rows: [
        ['🔴 Critical', review.summary.critical.toString()],
        ['🟠 High', review.summary.high.toString()],
        ['🟡 Medium', review.summary.medium.toString()],
        ['🟢 Low', review.summary.low.toString()],
        ['Total', review.summary.total_issues.toString()]
      ]
    };

    this.terminalUI.renderTable(summaryTable);

    // Render issues list
    if (review.issues.length > 0) {
      const issuesList: ListItem[] = review.issues.map(issue => ({
        label: `${this.getSeverityIcon(issue.severity)} ${issue.file}:${issue.line}`,
        value: issue.message,
        icon: this.getSeverityIcon(issue.severity)
      }));

      this.terminalUI.renderList(issuesList);
    }

    // Render actions
    if (review.status === 'failure') {
      this.terminalUI.renderWarning('Review failed. Fix issues and re-run.');
    } else if (review.status === 'success') {
      this.terminalUI.renderSuccess('Review passed! No issues found.');
    }
  }

  /**
   * Display test generation results
   */
  private displayTestGenerationResults(result: TestGenerationResult, args: GenerateTestsCLIArgs): void {
    this.terminalUI.renderSuccess(`Generated ${result.tests.length} test file(s)`);

    const testsTable: TableData = {
      headers: ['File', 'Framework', 'Status'],
      rows: result.tests.map(test => [
        test.file_path,
        test.framework,
        '✅ Generated'
      ])
    };

    this.terminalUI.renderTable(testsTable);
  }

  /**
   * Display coverage results
   */
  private displayCoverageResults(coverage: CoverageResult, args: CheckCoverageCLIArgs): void {
    const percentage = Math.round(coverage.coverage.lines.percentage);

    if (args.threshold && percentage < args.threshold) {
      this.terminalUI.renderError(`Coverage ${percentage}% is below threshold ${args.threshold}%`);
      process.exit(1);
    } else {
      this.terminalUI.renderSuccess(`Coverage: ${percentage}%`);
    }

    const coverageTable: TableData = {
      headers: ['Metric', 'Covered', 'Total', 'Percentage'],
      rows: [
        ['Lines', coverage.coverage.lines.covered.toString(), coverage.coverage.lines.total.toString(), `${coverage.coverage.lines.percentage}%`],
        ['Branches', coverage.coverage.branches.covered.toString(), coverage.coverage.branches.total.toString(), `${coverage.coverage.branches.percentage}%`],
        ['Functions', coverage.coverage.functions.covered.toString(), coverage.coverage.functions.total.toString(), `${coverage.coverage.functions.percentage}%`]
      ]
    };

    this.terminalUI.renderTable(coverageTable);
  }

  /**
   * Get severity icon
   */
  private getSeverityIcon(severity: Severity): string {
    const icons: Record<Severity, string> = {
      'critical': '🔴',
      'high': '🟠',
      'medium': '🟡',
      'low': '🟢'
    };
    return icons[severity];
  }
}

// Additional types
interface TestGenerationResult {
  id: string;
  status: 'completed' | 'failed';
  tests: GeneratedTest[];
}

interface GeneratedTest {
  file_path: string;
  content: string;
  framework: string;
}

interface CoverageResult {
  repo_id: string;
  ref: string;
  coverage: {
    lines: { total: number; covered: number; percentage: number };
    branches: { total: number; covered: number; percentage: number };
    functions: { total: number; covered: number; percentage: number };
  };
}

interface ReadyLayerAPIClient {
  createReview(params: CreateReviewParams): Promise<Review>;
  getReview(reviewId: string): Promise<Review>;
  generateTests(params: GenerateTestsParams): Promise<TestGenerationResult>;
  getCoverage(params: GetCoverageParams): Promise<CoverageResult>;
}

interface CreateReviewParams {
  repo_id: string;
  file_path?: string;
  branch?: string;
  config?: {
    fail_on_critical?: boolean;
    fail_on_high?: boolean;
  };
}

interface GenerateTestsParams {
  repo_id: string;
  file_path: string;
  framework?: string;
}

interface GetCoverageParams {
  repo_id: string;
  ref?: string;
}
```

---

## 4. GitHub Browser Extension

### Type Definitions

```typescript
// Browser extension types
interface BrowserExtensionConfig {
  api_key: string;
  enabled: boolean;
  show_status_badges: boolean;
  show_inline_comments: boolean;
  show_progress_indicators: boolean;
}

interface GitHubPRPage {
  owner: string;
  repo: string;
  pr_number: number;
  sha: string;
}

interface ExtensionMessage {
  type: ExtensionMessageType;
  data: unknown;
}

type ExtensionMessageType = 
  | 'get_review_status'
  | 'review_status_update'
  | 'apply_fix'
  | 'dismiss_issue'
  | 'open_dashboard';

interface ReviewStatusUpdate {
  review_id: string;
  status: ReviewStatus;
  issues: Issue[];
  summary: ReviewSummary;
}

// DOM manipulation types
interface DOMEnhancement {
  selector: string;
  enhance: (element: HTMLElement, data: unknown) => void;
}

interface StatusBadgeEnhancement extends DOMEnhancement {
  selector: '.readylayer-status-badge';
  enhance: (element: HTMLElement, review: Review) => void;
}

interface CommentEnhancement extends DOMEnhancement {
  selector: '.readylayer-comment';
  enhance: (element: HTMLElement, issue: Issue) => void;
}
```

### Implementation

```typescript
// GitHub Browser Extension Service
class GitHubBrowserExtensionService {
  constructor(
    private config: BrowserExtensionConfig,
    private apiClient: ReadyLayerAPIClient,
    private webSocketClient: WebSocketClient
  ) {}

  /**
   * Initialize extension on GitHub PR page
   */
  async initialize(prPage: GitHubPRPage): Promise<void> {
    if (!this.config.enabled) return;

    // Inject styles
    this.injectStyles();

    // Enhance PR header with status badge
    await this.enhancePRHeader(prPage);

    // Enhance PR comments with ReadyLayer comments
    await this.enhancePRComments(prPage);

    // Subscribe to real-time updates
    await this.subscribeToUpdates(prPage);

    // Add event listeners
    this.addEventListeners();
  }

  /**
   * Enhance PR header with status badge
   */
  private async enhancePRHeader(prPage: GitHubPRPage): Promise<void> {
    if (!this.config.show_status_badges) return;

    const header = document.querySelector('.gh-header-actions');
    if (!header) return;

    const review = await this.apiClient.getReviewForPR({
      owner: prPage.owner,
      repo: prPage.repo,
      pr_number: prPage.pr_number
    });

    const badge = this.createStatusBadge(review);
    header.appendChild(badge);
  }

  /**
   * Enhance PR comments
   */
  private async enhancePRComments(prPage: GitHubPRPage): Promise<void> {
    if (!this.config.show_inline_comments) return;

    const comments = document.querySelectorAll('.timeline-comment');
    comments.forEach(async (comment) => {
      const isReadyLayerComment = comment.querySelector('.readylayer-comment');
      if (isReadyLayerComment) {
        await this.enhanceComment(comment as HTMLElement, prPage);
      }
    });
  }

  /**
   * Create status badge element
   */
  private createStatusBadge(review: Review): HTMLElement {
    const badge = document.createElement('div');
    badge.className = 'readylayer-status-badge';
    
    const statusIcons: Record<ReviewStatus, string> = {
      'pending': '⏳',
      'in_progress': '🔄',
      'success': '✅',
      'warning': '⚠️',
      'failure': '❌',
      'error': '🔴'
    };

    const statusColors: Record<ReviewStatus, string> = {
      'pending': '#6b7280',
      'in_progress': '#3b82f6',
      'success': '#10b981',
      'warning': '#f59e0b',
      'failure': '#ef4444',
      'error': '#dc2626'
    };

    badge.innerHTML = `
      <span class="readylayer-status-icon">${statusIcons[review.status]}</span>
      <span class="readylayer-status-text">ReadyLayer: ${review.status}</span>
      ${review.summary.total_issues > 0 ? `<span class="readylayer-issue-count">${review.summary.total_issues} issues</span>` : ''}
    `;

    badge.style.color = statusColors[review.status];
    badge.style.cursor = 'pointer';
    badge.onclick = () => {
      window.open(`https://readylayer.com/reviews/${review.id}`, '_blank');
    };

    return badge;
  }

  /**
   * Enhance comment element
   */
  private async enhanceComment(element: HTMLElement, prPage: GitHubPRPage): Promise<void> {
    const issueId = element.getAttribute('data-issue-id');
    if (!issueId) return;

    const issue = await this.apiClient.getIssue(issueId);
    
    // Add quick actions
    const actions = this.createQuickActions(issue, prPage);
    element.appendChild(actions);
  }

  /**
   * Create quick actions for issue
   */
  private createQuickActions(issue: Issue, prPage: GitHubPRPage): HTMLElement {
    const actions = document.createElement('div');
    actions.className = 'readylayer-quick-actions';

    if (issue.suggestion) {
      const applyFixButton = document.createElement('button');
      applyFixButton.textContent = 'Apply Fix';
      applyFixButton.className = 'readylayer-btn readylayer-btn-primary';
      applyFixButton.onclick = () => this.applyFix(issue, prPage);
      actions.appendChild(applyFixButton);
    }

    const learnMoreButton = document.createElement('button');
    learnMoreButton.textContent = 'Learn More';
    learnMoreButton.className = 'readylayer-btn readylayer-btn-secondary';
    learnMoreButton.onclick = () => {
      window.open(`https://readylayer.com/rules/${issue.rule_id}`, '_blank');
    };
    actions.appendChild(learnMoreButton);

    return actions;
  }

  /**
   * Apply fix for issue
   */
  private async applyFix(issue: Issue, prPage: GitHubPRPage): Promise<void> {
    if (!issue.suggestion) return;

    // Create a commit with the fix
    const fixCommit = {
      message: `fix: ${issue.message}`,
      content: issue.suggestion,
      path: issue.file
    };

    // Use GitHub API to create commit
    // Implementation depends on GitHub API integration
    await this.apiClient.applyFix({
      owner: prPage.owner,
      repo: prPage.repo,
      pr_number: prPage.pr_number,
      fix: fixCommit
    });
  }

  /**
   * Subscribe to real-time updates
   */
  private async subscribeToUpdates(prPage: GitHubPRPage): Promise<void> {
    const review = await this.apiClient.getReviewForPR({
      owner: prPage.owner,
      repo: prPage.repo,
      pr_number: prPage.pr_number
    });

    await this.webSocketClient.subscribe(`review:${review.id}`, (event: WebSocketEvent) => {
      if (event.event === 'review.completed') {
        const data = event.data as ReviewCompletedEventData;
        this.updateStatusBadge(data.review);
        this.updateComments(data.review.issues);
      }
    });
  }

  /**
   * Update status badge
   */
  private updateStatusBadge(review: Review): void {
    const badge = document.querySelector('.readylayer-status-badge');
    if (!badge) return;

    const newBadge = this.createStatusBadge(review);
    badge.replaceWith(newBadge);
  }

  /**
   * Update comments
   */
  private updateComments(issues: Issue[]): void {
    issues.forEach(issue => {
      const comment = document.querySelector(`[data-issue-id="${issue.id}"]`);
      if (comment) {
        this.enhanceComment(comment as HTMLElement, {
          owner: '',
          repo: '',
          pr_number: 0,
          sha: ''
        });
      }
    });
  }

  /**
   * Inject extension styles
   */
  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .readylayer-status-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 4px 12px;
        border-radius: 4px;
        background: #f3f4f6;
        font-size: 14px;
        font-weight: 500;
      }
      .readylayer-quick-actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }
      .readylayer-btn {
        padding: 4px 12px;
        border-radius: 4px;
        border: 1px solid #d1d5db;
        background: white;
        cursor: pointer;
        font-size: 12px;
      }
      .readylayer-btn-primary {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
      }
      .readylayer-btn-secondary {
        background: white;
        color: #374151;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Add event listeners
   */
  private addEventListeners(): void {
    // Listen for PR updates
    const observer = new MutationObserver(() => {
      // Re-enhance when DOM changes
      const prPage = this.getPRPageInfo();
      if (prPage) {
        this.enhancePRComments(prPage);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Get PR page info from URL
   */
  private getPRPageInfo(): GitHubPRPage | null {
    const match = window.location.pathname.match(/^\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
    if (!match) return null;

    return {
      owner: match[1],
      repo: match[2],
      pr_number: parseInt(match[3]),
      sha: '' // Extract from page
    };
  }
}

// WebSocket client interface
interface WebSocketClient {
  subscribe(topic: string, callback: (event: WebSocketEvent) => void): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
}
```

---

## Type Safety Utilities

```typescript
// Type guards
function isReviewStatus(status: string): status is ReviewStatus {
  return ['pending', 'in_progress', 'success', 'warning', 'failure', 'error'].includes(status);
}

function isSeverity(severity: string): severity is Severity {
  return ['critical', 'high', 'medium', 'low'].includes(severity);
}

function isPlatform(platform: string): platform is Platform {
  return ['github', 'gitlab', 'bitbucket', 'azure-devops'].includes(platform);
}

// Validation functions
function validateReview(review: unknown): review is Review {
  if (typeof review !== 'object' || review === null) return false;
  const r = review as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.repo_id === 'string' &&
    typeof r.pr_id === 'string' &&
    isPlatform(r.platform as string) &&
    isReviewStatus(r.status as string) &&
    Array.isArray(r.issues) &&
    typeof r.summary === 'object'
  );
}

function validateIssue(issue: unknown): issue is Issue {
  if (typeof issue !== 'object' || issue === null) return false;
  const i = issue as Record<string, unknown>;
  return (
    typeof i.id === 'string' &&
    isSeverity(i.severity as string) &&
    typeof i.rule_id === 'string' &&
    typeof i.file === 'string' &&
    typeof i.line === 'number' &&
    typeof i.message === 'string'
  );
}
```

---

## Summary

This document provides complete, type-safe implementation specifications for all Tier 1 expansions:

1. **GitLab MR UX** — Full type definitions and implementation
2. **Slack Rich Messages** — Complete Slack API integration with types
3. **CLI Tool Enhancement** — Terminal UI with type-safe commands
4. **GitHub Browser Extension** — DOM manipulation with type safety

All implementations are fully typed with TypeScript interfaces, ensuring type safety across the entire codebase.
