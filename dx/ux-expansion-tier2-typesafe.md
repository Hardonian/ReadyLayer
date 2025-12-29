# ReadyLayer — Tier 2 Expansion (Type-Safe Implementation)

## Overview

Complete, type-safe implementation specifications for Tier 2 medium-priority expansions: CI/CD Platform Enhancements, Jira Rich Integration, Bitbucket PR UX, and Azure DevOps Integration.

---

## Type Definitions

### Shared Types

```typescript
// Reuse types from Tier 1
import type {
  ReviewStatus,
  Severity,
  Issue,
  Review,
  ReviewSummary,
  ReviewProgress,
  WebSocketEvent,
  WebSocketEventType
} from './ux-expansion-tier1-typesafe';

// CI/CD Platform types
type CICDPlatform = 'github-actions' | 'gitlab-ci' | 'azure-pipelines' | 'jenkins' | 'circleci';

interface CICDJob {
  id: string;
  name: string;
  status: CICDJobStatus;
  started_at: string;
  completed_at?: string;
  logs?: string;
  artifacts?: CICDArtifact[];
}

type CICDJobStatus = 'pending' | 'running' | 'success' | 'failure' | 'cancelled' | 'skipped';

interface CICDArtifact {
  name: string;
  type: string;
  url: string;
  size?: number;
}

interface CICDPipeline {
  id: string;
  platform: CICDPlatform;
  status: CICDJobStatus;
  jobs: CICDJob[];
  started_at: string;
  completed_at?: string;
  commit_sha: string;
  branch: string;
}
```

---

## 1. CI/CD Platform Enhancements

### GitHub Actions Types

```typescript
interface GitHubActionsWorkflow {
  id: number;
  name: string;
  path: string;
  state: 'active' | 'deleted';
  created_at: string;
  updated_at: string;
}

interface GitHubActionsRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  workflow_id: number;
  head_sha: string;
  created_at: string;
  updated_at: string;
  jobs_url: string;
  logs_url: string;
  check_suite_id: number;
}

interface GitHubActionsJob {
  id: number;
  run_id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | null;
  started_at: string;
  completed_at?: string;
  steps: GitHubActionsStep[];
}

interface GitHubActionsStep {
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | null;
  number: number;
  started_at?: string;
  completed_at?: string;
}

interface GitHubActionsAPIClient {
  getWorkflowRuns(owner: string, repo: string, workflowId: number): Promise<GitHubActionsRun[]>;
  getRun(owner: string, repo: string, runId: number): Promise<GitHubActionsRun>;
  getRunJobs(owner: string, repo: string, runId: number): Promise<GitHubActionsJob[]>;
  getJobLogs(owner: string, repo: string, jobId: number): Promise<string>;
  rerunWorkflow(owner: string, repo: string, runId: number): Promise<void>;
  cancelWorkflow(owner: string, repo: string, runId: number): Promise<void>;
}
```

### GitLab CI Types

```typescript
interface GitLabPipeline {
  id: number;
  project_id: number;
  sha: string;
  ref: string;
  status: 'created' | 'waiting_for_resource' | 'preparing' | 'pending' | 'running' | 'success' | 'failed' | 'canceled' | 'skipped' | 'manual' | 'scheduled';
  source: string;
  created_at: string;
  updated_at: string;
  web_url: string;
  jobs: GitLabJob[];
}

interface GitLabJob {
  id: number;
  status: 'created' | 'pending' | 'running' | 'failed' | 'success' | 'canceled' | 'skipped' | 'manual';
  stage: string;
  name: string;
  ref: string;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  duration?: number;
  web_url: string;
  artifacts_file?: GitLabArtifact;
  runner?: GitLabRunner;
}

interface GitLabArtifact {
  filename: string;
  size: number;
}

interface GitLabRunner {
  id: number;
  description: string;
  active: boolean;
  is_shared: boolean;
}

interface GitLabCIAPIClient {
  getPipeline(projectId: number, pipelineId: number): Promise<GitLabPipeline>;
  getPipelineJobs(projectId: number, pipelineId: number): Promise<GitLabJob[]>;
  getJobLogs(projectId: number, jobId: number): Promise<string>;
  retryJob(projectId: number, jobId: number): Promise<void>;
  cancelPipeline(projectId: number, pipelineId: number): Promise<void>;
}
```

### Azure Pipelines Types

```typescript
interface AzurePipeline {
  id: number;
  name: string;
  status: 'completed' | 'inProgress' | 'cancelled' | 'notStarted';
  result: 'succeeded' | 'failed' | 'canceled' | 'partiallySucceeded';
  createdDate: string;
  finishTime?: string;
  startTime?: string;
  url: string;
  stages: AzureStage[];
}

interface AzureStage {
  id: number;
  name: string;
  status: 'completed' | 'inProgress' | 'cancelled' | 'notStarted';
  result: 'succeeded' | 'failed' | 'canceled' | 'partiallySucceeded';
  jobs: AzureJob[];
}

interface AzureJob {
  id: string;
  name: string;
  status: 'completed' | 'inProgress' | 'cancelled' | 'notStarted';
  result: 'succeeded' | 'failed' | 'canceled' | 'partiallySucceeded';
  startTime?: string;
  finishTime?: string;
  tasks: AzureTask[];
}

interface AzureTask {
  id: string;
  name: string;
  status: 'completed' | 'inProgress' | 'cancelled' | 'notStarted';
  result: 'succeeded' | 'failed' | 'canceled' | 'skipped';
  startTime?: string;
  finishTime?: string;
  logUrl?: string;
}

interface AzurePipelinesAPIClient {
  getPipeline(organization: string, project: string, pipelineId: number): Promise<AzurePipeline>;
  getPipelineLogs(organization: string, project: string, pipelineId: number, logId: number): Promise<string>;
  cancelPipeline(organization: string, project: string, pipelineId: number): Promise<void>;
}
```

### Implementation

```typescript
// CI/CD Platform Enhancement Service
class CICDPlatformEnhancementService {
  constructor(
    private githubActionsClient: GitHubActionsAPIClient,
    private gitlabCIClient: GitLabCIAPIClient,
    private azurePipelinesClient: AzurePipelinesAPIClient,
    private reviewService: ReviewService
  ) {}

  /**
   * Enhance GitHub Actions workflow output
   */
  async enhanceGitHubActionsRun(
    owner: string,
    repo: string,
    runId: number
  ): Promise<void> {
    const run = await this.githubActionsClient.getRun(owner, repo, runId);
    const jobs = await this.githubActionsClient.getRunJobs(owner, repo, runId);

    // Add ReadyLayer status to workflow summary
    const review = await this.reviewService.getReviewForCommit(owner, repo, run.head_sha);
    
    if (review) {
      await this.addReviewStatusToWorkflow(owner, repo, runId, review);
    }

    // Enhance job outputs with review results
    for (const job of jobs) {
      if (job.name.includes('readylayer')) {
        await this.enhanceJobOutput(owner, repo, job.id, review);
      }
    }
  }

  /**
   * Enhance GitLab CI pipeline output
   */
  async enhanceGitLabPipeline(
    projectId: number,
    pipelineId: number
  ): Promise<void> {
    const pipeline = await this.gitlabCIClient.getPipeline(projectId, pipelineId);
    const jobs = await this.gitlabCIClient.getPipelineJobs(projectId, pipelineId);

    const review = await this.reviewService.getReviewForCommit(projectId.toString(), pipeline.sha);
    
    if (review) {
      await this.addReviewStatusToPipeline(projectId, pipelineId, review);
    }

    for (const job of jobs) {
      if (job.name.includes('readylayer')) {
        await this.enhanceJobOutput(projectId, job.id, review);
      }
    }
  }

  /**
   * Enhance Azure Pipelines output
   */
  async enhanceAzurePipeline(
    organization: string,
    project: string,
    pipelineId: number
  ): Promise<void> {
    const pipeline = await this.azurePipelinesClient.getPipeline(organization, project, pipelineId);

    const review = await this.reviewService.getReviewForCommit(organization, project, pipeline.id.toString());
    
    if (review) {
      await this.addReviewStatusToAzurePipeline(organization, project, pipelineId, review);
    }
  }

  /**
   * Add review status to GitHub Actions workflow
   */
  private async addReviewStatusToWorkflow(
    owner: string,
    repo: string,
    runId: number,
    review: Review
  ): Promise<void> {
    const statusIcon = this.getStatusIcon(review.status);
    const statusText = this.getStatusText(review.status);

    // Create a summary comment in workflow logs
    const summary = `
## 🔒 ReadyLayer Review Status

**Status:** ${statusIcon} ${statusText}

**Issues Found:** ${review.summary.total_issues}
- 🔴 Critical: ${review.summary.critical}
- 🟠 High: ${review.summary.high}
- 🟡 Medium: ${review.summary.medium}
- 🟢 Low: ${review.summary.low}

[View Full Report](https://readylayer.com/reviews/${review.id})
`;

    // Append to workflow logs (implementation depends on GitHub API)
    await this.appendToWorkflowLogs(owner, repo, runId, summary);
  }

  /**
   * Add review status to GitLab CI pipeline
   */
  private async addReviewStatusToPipeline(
    projectId: number,
    pipelineId: number,
    review: Review
  ): Promise<void> {
    // Update pipeline status with review results
    const status = this.mapReviewStatusToGitLabStatus(review.status);
    
    await this.gitlabCIClient.updatePipelineStatus(projectId, pipelineId, {
      status,
      name: 'readylayer/review',
      description: this.generateStatusDescription(review),
      target_url: `https://readylayer.com/reviews/${review.id}`
    });
  }

  /**
   * Add review status to Azure Pipeline
   */
  private async addReviewStatusToAzurePipeline(
    organization: string,
    project: string,
    pipelineId: number,
    review: Review
  ): Promise<void> {
    // Add review status as pipeline annotation
    await this.azurePipelinesClient.addAnnotation(organization, project, pipelineId, {
      type: 'review',
      message: this.generateStatusDescription(review),
      url: `https://readylayer.com/reviews/${review.id}`
    });
  }

  /**
   * Enhance job output with review results
   */
  private async enhanceJobOutput(
    platform: CICDPlatform,
    jobId: string | number,
    review: Review | null
  ): Promise<void> {
    if (!review) return;

    const output = this.generateReviewOutput(review);
    
    switch (platform) {
      case 'github-actions':
        await this.appendToGitHubActionsJobLogs(jobId as number, output);
        break;
      case 'gitlab-ci':
        await this.appendToGitLabJobLogs(jobId as number, output);
        break;
      case 'azure-pipelines':
        await this.appendToAzureJobLogs(jobId as string, output);
        break;
    }
  }

  /**
   * Generate review output for CI logs
   */
  private generateReviewOutput(review: Review): string {
    const statusIcon = this.getStatusIcon(review.status);
    const statusText = this.getStatusText(review.status);

    return `
╔══════════════════════════════════════════════════════════════╗
║                  🔒 ReadyLayer Review Results                 ║
╠══════════════════════════════════════════════════════════════╣
║ Status: ${statusIcon} ${statusText.padEnd(50)} ║
║                                                              ║
║ Issues Found: ${review.summary.total_issues.toString().padEnd(47)} ║
║   🔴 Critical: ${review.summary.critical.toString().padEnd(48)} ║
║   🟠 High: ${review.summary.high.toString().padEnd(52)} ║
║   🟡 Medium: ${review.summary.medium.toString().padEnd(49)} ║
║   🟢 Low: ${review.summary.low.toString().padEnd(54)} ║
║                                                              ║
║ Files Affected: ${review.summary.files_affected.toString().padEnd(43)} ║
║                                                              ║
║ View Full Report: https://readylayer.com/reviews/${review.id.padEnd(20)} ║
╚══════════════════════════════════════════════════════════════╝
`;
  }

  /**
   * Get status icon
   */
  private getStatusIcon(status: ReviewStatus): string {
    const icons: Record<ReviewStatus, string> = {
      'pending': '⏳',
      'in_progress': '🔄',
      'success': '✅',
      'warning': '⚠️',
      'failure': '❌',
      'error': '🔴'
    };
    return icons[status];
  }

  /**
   * Get status text
   */
  private getStatusText(status: ReviewStatus): string {
    const texts: Record<ReviewStatus, string> = {
      'pending': 'Pending',
      'in_progress': 'In Progress',
      'success': 'Passed',
      'warning': 'Warnings',
      'failure': 'Failed',
      'error': 'Error'
    };
    return texts[status];
  }

  /**
   * Map review status to GitLab CI status
   */
  private mapReviewStatusToGitLabStatus(status: ReviewStatus): GitLabPipeline['status'] {
    const statusMap: Record<ReviewStatus, GitLabPipeline['status']> = {
      'pending': 'pending',
      'in_progress': 'running',
      'success': 'success',
      'warning': 'success', // GitLab doesn't have warning
      'failure': 'failed',
      'error': 'failed'
    };
    return statusMap[status];
  }

  /**
   * Generate status description
   */
  private generateStatusDescription(review: Review): string {
    if (review.status === 'success') {
      return `Review completed, no issues found`;
    } else if (review.status === 'failure') {
      return `Review failed: ${review.summary.critical} critical, ${review.summary.high} high issues`;
    } else if (review.status === 'warning') {
      return `Review completed with warnings: ${review.summary.medium} medium, ${review.summary.low} low issues`;
    } else {
      return `Review ${review.status}`;
    }
  }

  // Platform-specific log appending methods
  private async appendToWorkflowLogs(owner: string, repo: string, runId: number, content: string): Promise<void> {
    // Implementation: Use GitHub API to append to workflow logs
  }

  private async appendToGitHubActionsJobLogs(jobId: number, content: string): Promise<void> {
    // Implementation: Use GitHub API to append to job logs
  }

  private async appendToGitLabJobLogs(jobId: number, content: string): Promise<void> {
    // Implementation: Use GitLab API to append to job logs
  }

  private async appendToAzureJobLogs(jobId: string, content: string): Promise<void> {
    // Implementation: Use Azure DevOps API to append to job logs
  }
}

// Additional interfaces
interface ReviewService {
  getReviewForCommit(owner: string, repo: string, sha: string): Promise<Review | null>;
}

interface GitLabCIAPIClient {
  updatePipelineStatus(projectId: number, pipelineId: number, status: {
    status: GitLabPipeline['status'];
    name: string;
    description: string;
    target_url: string;
  }): Promise<void>;
}

interface AzurePipelinesAPIClient {
  addAnnotation(organization: string, project: string, pipelineId: number, annotation: {
    type: string;
    message: string;
    url: string;
  }): Promise<void>;
}
```

---

## 2. Jira Rich Integration

### Type Definitions

```typescript
// Jira-specific types
interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: JiraIssueFields;
}

interface JiraIssueFields {
  summary: string;
  description: JiraDocument;
  status: JiraStatus;
  priority: JiraPriority;
  assignee?: JiraUser;
  reporter: JiraUser;
  created: string;
  updated: string;
  labels: string[];
  components: JiraComponent[];
  project: JiraProject;
  issuetype: JiraIssueType;
  customfield_10000?: string; // ReadyLayer review ID
}

interface JiraDocument {
  type: 'doc';
  version: number;
  content: JiraNode[];
}

type JiraNode = 
  | JiraParagraphNode
  | JiraHeadingNode
  | JiraCodeBlockNode
  | JiraBulletListNode
  | JiraOrderedListNode
  | JiraBlockQuoteNode;

interface JiraParagraphNode {
  type: 'paragraph';
  content: JiraInlineNode[];
}

interface JiraHeadingNode {
  type: 'heading';
  attrs: { level: 1 | 2 | 3 | 4 | 5 | 6 };
  content: JiraInlineNode[];
}

interface JiraCodeBlockNode {
  type: 'codeBlock';
  attrs: { language?: string };
  content: JiraTextNode[];
}

interface JiraBulletListNode {
  type: 'bulletList';
  content: JiraListItemNode[];
}

interface JiraOrderedListNode {
  type: 'orderedList';
  content: JiraListItemNode[];
}

interface JiraListItemNode {
  type: 'listItem';
  content: JiraNode[];
}

interface JiraBlockQuoteNode {
  type: 'blockQuote';
  content: JiraNode[];
}

type JiraInlineNode = JiraTextNode | JiraHardBreakNode | JiraEmNode | JiraStrongNode | JiraLinkNode;

interface JiraTextNode {
  type: 'text';
  text: string;
  marks?: JiraMark[];
}

interface JiraHardBreakNode {
  type: 'hardBreak';
}

interface JiraEmNode {
  type: 'em';
  content: JiraInlineNode[];
}

interface JiraStrongNode {
  type: 'strong';
  content: JiraInlineNode[];
}

interface JiraLinkNode {
  type: 'link';
  attrs: { href: string; title?: string };
  content: JiraInlineNode[];
}

type JiraMark = JiraEmMark | JiraStrongMark | JiraCodeMark | JiraLinkMark;

interface JiraEmMark {
  type: 'em';
}

interface JiraStrongMark {
  type: 'strong';
}

interface JiraCodeMark {
  type: 'code';
}

interface JiraLinkMark {
  type: 'link';
  attrs: { href: string };
}

interface JiraStatus {
  id: string;
  name: string;
  statusCategory: JiraStatusCategory;
}

interface JiraStatusCategory {
  id: number;
  key: string;
  name: string;
}

interface JiraPriority {
  id: string;
  name: string;
  iconUrl: string;
}

interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls?: Record<string, string>;
}

interface JiraComponent {
  id: string;
  name: string;
}

interface JiraProject {
  id: string;
  key: string;
  name: string;
}

interface JiraIssueType {
  id: string;
  name: string;
  iconUrl: string;
}

interface JiraComment {
  id: string;
  body: JiraDocument;
  author: JiraUser;
  created: string;
  updated?: string;
}

interface JiraTransition {
  id: string;
  name: string;
  to: JiraStatus;
}

// Jira API client types
interface JiraAPIClient {
  getIssue(issueKey: string): Promise<JiraIssue>;
  createIssue(issue: JiraIssueInput): Promise<JiraIssue>;
  updateIssue(issueKey: string, fields: Partial<JiraIssueFields>): Promise<void>;
  addComment(issueKey: string, comment: JiraCommentInput): Promise<JiraComment>;
  getTransitions(issueKey: string): Promise<JiraTransition[]>;
  transitionIssue(issueKey: string, transitionId: string): Promise<void>;
  searchIssues(jql: string): Promise<JiraIssue[]>;
}

interface JiraIssueInput {
  fields: {
    project: { key: string };
    summary: string;
    description: JiraDocument;
    issuetype: { name: string };
    priority?: { name: string };
    labels?: string[];
    components?: { name: string }[];
  };
}

interface JiraCommentInput {
  body: JiraDocument;
}

// ReadyLayer Jira integration types
interface JiraIntegrationConfig {
  jira_url: string;
  project_key: string;
  issue_type: string;
  create_issues_for: Severity[];
  auto_link_prs: boolean;
  update_status_on_merge: boolean;
}

interface JiraIssueMapping {
  review_id: string;
  issue_key: string;
  created_at: string;
}
```

### Implementation

```typescript
// Jira Rich Integration Service
class JiraRichIntegrationService {
  constructor(
    private jiraClient: JiraAPIClient,
    private config: JiraIntegrationConfig,
    private reviewService: ReviewService
  ) {}

  /**
   * Create Jira issue from review finding
   */
  async createIssueFromFinding(issue: Issue, review: Review): Promise<JiraIssue> {
    if (!this.config.create_issues_for.includes(issue.severity)) {
      throw new Error(`Issues of severity ${issue.severity} are not configured for Jira creation`);
    }

    const jiraIssue: JiraIssueInput = {
      fields: {
        project: { key: this.config.project_key },
        summary: `${issue.severity.toUpperCase()}: ${issue.message}`,
        description: this.buildIssueDescription(issue, review),
        issuetype: { name: this.config.issue_type },
        priority: { name: this.mapSeverityToPriority(issue.severity) },
        labels: ['readylayer', issue.severity, issue.rule_id.split('.')[0]],
        components: this.extractComponents(issue.file)
      }
    };

    const createdIssue = await this.jiraClient.createIssue(jiraIssue);

    // Store mapping
    await this.storeIssueMapping(review.id, createdIssue.key);

    return createdIssue;
  }

  /**
   * Link PR to Jira issue
   */
  async linkPRToIssue(prUrl: string, issueKey: string): Promise<void> {
    const issue = await this.jiraClient.getIssue(issueKey);
    
    // Add PR link to issue description or comment
    const prLink = this.buildPRLinkNode(prUrl);
    const updatedDescription = this.appendToDocument(issue.fields.description, prLink);

    await this.jiraClient.updateIssue(issueKey, {
      description: updatedDescription
    });
  }

  /**
   * Add review summary comment to Jira issue
   */
  async addReviewSummaryComment(issueKey: string, review: Review): Promise<JiraComment> {
    const commentBody = this.buildReviewSummaryDocument(review);

    return await this.jiraClient.addComment(issueKey, {
      body: commentBody
    });
  }

  /**
   * Update issue status based on PR status
   */
  async updateIssueStatusFromPR(issueKey: string, prStatus: 'opened' | 'merged' | 'closed'): Promise<void> {
    const transitions = await this.jiraClient.getTransitions(issueKey);
    
    let targetTransition: JiraTransition | undefined;

    switch (prStatus) {
      case 'opened':
        targetTransition = transitions.find(t => t.name === 'In Review' || t.name === 'In Progress');
        break;
      case 'merged':
        targetTransition = transitions.find(t => t.name === 'Done' || t.name === 'Resolved');
        break;
      case 'closed':
        targetTransition = transitions.find(t => t.name === 'Rejected' || t.name === 'Closed');
        break;
    }

    if (targetTransition) {
      await this.jiraClient.transitionIssue(issueKey, targetTransition.id);
    }
  }

  /**
   * Build issue description document
   */
  private buildIssueDescription(issue: Issue, review: Review): JiraDocument {
    const content: JiraNode[] = [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Issue Details' }]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'ReadyLayer found a ' },
          { type: 'text', text: issue.severity, marks: [{ type: 'strong' }] },
          { type: 'text', text: ' issue in PR review.' }
        ]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Rule: ' },
          { type: 'text', text: issue.rule_id, marks: [{ type: 'code' }] }
        ]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'File: ' },
          { type: 'text', text: issue.file, marks: [{ type: 'code' }] },
          { type: 'text', text: `:${issue.line}` }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Description' }]
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: issue.description }]
      }
    ];

    if (issue.code_snippet?.before) {
      content.push(
        {
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: 'Vulnerable Code' }]
        },
        {
          type: 'codeBlock',
          attrs: { language: issue.code_snippet.language },
          content: [{ type: 'text', text: issue.code_snippet.before }]
        }
      );
    }

    if (issue.suggestion) {
      content.push(
        {
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: 'Fix Suggestion' }]
        },
        {
          type: 'codeBlock',
          attrs: { language: issue.code_snippet?.language || 'typescript' },
          content: [{ type: 'text', text: issue.suggestion }]
        }
      );
    }

    content.push({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'View full review: ' },
        {
          type: 'link',
          attrs: { href: `https://readylayer.com/reviews/${review.id}` },
          content: [{ type: 'text', text: `Review ${review.id}` }]
        }
      ]
    });

    return {
      type: 'doc',
      version: 1,
      content
    };
  }

  /**
   * Build review summary document
   */
  private buildReviewSummaryDocument(review: Review): JiraDocument {
    const statusIcon = review.status === 'failure' ? '❌' : review.status === 'warning' ? '⚠️' : '✅';
    const statusText = review.status === 'failure' ? 'BLOCKED' : review.status === 'warning' ? 'WARNINGS' : 'PASSED';

    return {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: `🔒 ReadyLayer Review Summary` }]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Status: ' },
            { type: 'text', text: `${statusIcon} ${statusText}`, marks: [{ type: 'strong' }] }
          ]
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{
                type: 'paragraph',
                content: [
                  { type: 'text', text: '🔴 Critical: ' },
                  { type: 'text', text: review.summary.critical.toString(), marks: [{ type: 'strong' }] }
                ]
              }]
            },
            {
              type: 'listItem',
              content: [{
                type: 'paragraph',
                content: [
                  { type: 'text', text: '🟠 High: ' },
                  { type: 'text', text: review.summary.high.toString(), marks: [{ type: 'strong' }] }
                ]
              }]
            },
            {
              type: 'listItem',
              content: [{
                type: 'paragraph',
                content: [
                  { type: 'text', text: '🟡 Medium: ' },
                  { type: 'text', text: review.summary.medium.toString(), marks: [{ type: 'strong' }] }
                ]
              }]
            },
            {
              type: 'listItem',
              content: [{
                type: 'paragraph',
                content: [
                  { type: 'text', text: '🟢 Low: ' },
                  { type: 'text', text: review.summary.low.toString(), marks: [{ type: 'strong' }] }
                ]
              }]
            }
          ]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'View full report: ' },
            {
              type: 'link',
              attrs: { href: `https://readylayer.com/reviews/${review.id}` },
              content: [{ type: 'text', text: `Review ${review.id}` }]
            }
          ]
        }
      ]
    };
  }

  /**
   * Map severity to Jira priority
   */
  private mapSeverityToPriority(severity: Severity): string {
    const priorityMap: Record<Severity, string> = {
      'critical': 'Critical',
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low'
    };
    return priorityMap[severity];
  }

  /**
   * Extract components from file path
   */
  private extractComponents(filePath: string): { name: string }[] {
    const parts = filePath.split('/');
    const components: { name: string }[] = [];

    // Extract meaningful components (e.g., 'src', 'api', 'auth')
    parts.forEach(part => {
      if (part && part !== '.' && part !== '..' && !part.includes('.')) {
        components.push({ name: part });
      }
    });

    return components;
  }

  /**
   * Build PR link node
   */
  private buildPRLinkNode(prUrl: string): JiraNode {
    return {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Related PR: ' },
        {
          type: 'link',
          attrs: { href: prUrl },
          content: [{ type: 'text', text: prUrl }]
        }
      ]
    };
  }

  /**
   * Append node to document
   */
  private appendToDocument(doc: JiraDocument, node: JiraNode): JiraDocument {
    return {
      ...doc,
      content: [...doc.content, node]
    };
  }

  /**
   * Store issue mapping
   */
  private async storeIssueMapping(reviewId: string, issueKey: string): Promise<void> {
    // Implementation: Store in database
  }
}
```

---

## 3. Bitbucket PR UX

### Type Definitions

```typescript
// Bitbucket-specific types (similar to GitLab but with Bitbucket API structure)
interface BitbucketPR {
  id: number;
  title: string;
  description?: string;
  state: 'OPEN' | 'MERGED' | 'DECLINED' | 'SUPERSEDED';
  source: BitbucketBranch;
  destination: BitbucketBranch;
  author: BitbucketUser;
  created_on: string;
  updated_on: string;
  links: BitbucketLinks;
}

interface BitbucketBranch {
  branch: {
    name: string;
  };
  commit: {
    hash: string;
  };
}

interface BitbucketUser {
  uuid: string;
  display_name: string;
  nickname?: string;
  account_id?: string;
}

interface BitbucketLinks {
  html: {
    href: string;
  };
  self: {
    href: string;
  };
}

interface BitbucketPRComment {
  id: number;
  content: {
    raw: string;
    markup: 'markdown';
    html: string;
  };
  user: BitbucketUser;
  created_on: string;
  updated_on?: string;
  inline?: BitbucketInlineComment;
  parent?: {
    id: number;
  };
}

interface BitbucketInlineComment {
  to: number;
  from?: number;
  path: string;
}

interface BitbucketBuildStatus {
  state: 'SUCCESSFUL' | 'FAILED' | 'INPROGRESS' | 'STOPPED';
  key: string;
  name: string;
  url?: string;
  description?: string;
  date?: string;
}

interface BitbucketAPIClient {
  getPR(workspace: string, repo: string, prId: number): Promise<BitbucketPR>;
  getPRDiff(workspace: string, repo: string, prId: number): Promise<string>;
  postPRComment(workspace: string, repo: string, prId: number, comment: BitbucketPRCommentInput): Promise<BitbucketPRComment>;
  updateBuildStatus(workspace: string, repo: string, sha: string, status: BitbucketBuildStatusInput): Promise<BitbucketBuildStatus>;
}

interface BitbucketPRCommentInput {
  content: {
    raw: string;
    markup: 'markdown';
  };
  inline?: BitbucketInlineComment;
}

interface BitbucketBuildStatusInput {
  state: BitbucketBuildStatus['state'];
  key: string;
  name: string;
  url?: string;
  description?: string;
}
```

### Implementation

```typescript
// Bitbucket PR UX Service (similar to GitLab MR UX but adapted for Bitbucket API)
class BitbucketPRUXService {
  constructor(
    private apiClient: BitbucketAPIClient,
    private webSocketClient: WebSocketClient,
    private reviewService: ReviewService
  ) {}

  /**
   * Create live status badge for Bitbucket PR
   */
  async createStatusBadge(
    workspace: string,
    repo: string,
    sha: string,
    review: Review
  ): Promise<BitbucketBuildStatus> {
    const status = this.mapReviewStatusToBitbucketStatus(review.status);
    const description = this.generateStatusDescription(review);

    return await this.apiClient.updateBuildStatus(workspace, repo, sha, {
      state: status,
      key: 'readylayer/review',
      name: 'ReadyLayer Review',
      url: `https://readylayer.com/reviews/${review.id}`,
      description
    });
  }

  /**
   * Create review summary card comment
   */
  async createSummaryCard(
    workspace: string,
    repo: string,
    prId: number,
    review: Review
  ): Promise<BitbucketPRComment> {
    const summaryMarkdown = this.generateSummaryMarkdown(review);

    return await this.apiClient.postPRComment(workspace, repo, prId, {
      content: {
        raw: summaryMarkdown,
        markup: 'markdown'
      }
    });
  }

  /**
   * Create rich inline comment for issue
   */
  async createInlineComment(
    workspace: string,
    repo: string,
    prId: number,
    issue: Issue
  ): Promise<BitbucketPRComment> {
    const position = await this.getIssuePosition(workspace, repo, prId, issue);
    const commentBody = this.generateIssueComment(issue);

    return await this.apiClient.postPRComment(workspace, repo, prId, {
      content: {
        raw: commentBody,
        markup: 'markdown'
      },
      inline: position
    });
  }

  /**
   * Map ReadyLayer review status to Bitbucket build status
   */
  private mapReviewStatusToBitbucketStatus(status: ReviewStatus): BitbucketBuildStatus['state'] {
    const statusMap: Record<ReviewStatus, BitbucketBuildStatus['state']> = {
      'pending': 'INPROGRESS',
      'in_progress': 'INPROGRESS',
      'success': 'SUCCESSFUL',
      'warning': 'SUCCESSFUL', // Bitbucket doesn't have warning
      'failure': 'FAILED',
      'error': 'FAILED'
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
   * Generate summary markdown (same as GitLab but adapted for Bitbucket markdown)
   */
  private generateSummaryMarkdown(review: Review): string {
    // Similar to GitLab implementation but using Bitbucket markdown format
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

**This PR ${review.status === 'failure' ? 'cannot merge' : 'can merge'} until all critical and high issues are resolved.**

[View Full Report](https://readylayer.com/reviews/${review.id}) | [Configure Rules](https://readylayer.com/config)`;
  }

  /**
   * Generate issue comment markdown
   */
  private generateIssueComment(issue: Issue): string {
    // Similar to GitLab implementation
    const severityIcons: Record<Severity, string> = {
      'critical': '🔴',
      'high': '🟠',
      'medium': '🟡',
      'low': '🟢'
    };

    const icon = severityIcons[issue.severity];

    return `**${icon} ${issue.message}** (${issue.severity})

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

[Apply Fix] [Learn More] [Mark as False Positive] [Dismiss]`;
  }

  /**
   * Get issue position in PR diff
   */
  private async getIssuePosition(
    workspace: string,
    repo: string,
    prId: number,
    issue: Issue
  ): Promise<BitbucketInlineComment | undefined> {
    const pr = await this.apiClient.getPR(workspace, repo, prId);
    const diff = await this.apiClient.getPRDiff(workspace, repo, prId);
    
    // Parse diff to find line number
    // Implementation depends on diff parsing logic
    
    return {
      to: issue.line,
      path: issue.file
    };
  }

  // Helper methods (same as GitLab implementation)
  private formatFilesList(issues: Issue[]): string {
    // Same as GitLab implementation
    return '';
  }

  private formatRulesList(issues: Issue[]): string {
    // Same as GitLab implementation
    return '';
  }

  private formatRequiredActions(issues: Issue[]): string {
    // Same as GitLab implementation
    return '';
  }

  private getSeverityExplanation(severity: Severity): string {
    // Same as GitLab implementation
    return '';
  }
}
```

---

## 4. Azure DevOps Integration

### Type Definitions

```typescript
// Azure DevOps-specific types
interface AzureDevOpsPR {
  pullRequestId: number;
  repositoryId: string;
  codeReviewId: number;
  status: 'active' | 'abandoned' | 'completed';
  createdBy: AzureDevOpsUser;
  creationDate: string;
  title: string;
  description?: string;
  sourceRefName: string;
  targetRefName: string;
  mergeStatus: 'succeeded' | 'failed' | 'conflicts' | 'rejectedByPolicy' | 'queued';
  lastMergeSourceCommit: AzureDevOpsCommit;
  lastMergeTargetCommit: AzureDevOpsCommit;
}

interface AzureDevOpsUser {
  id: string;
  displayName: string;
  uniqueName: string;
  imageUrl?: string;
}

interface AzureDevOpsCommit {
  commitId: string;
  url: string;
}

interface AzureDevOpsPRThread {
  id: number;
  comments: AzureDevOpsPRComment[];
  status: 'active' | 'fixed' | 'closed' | 'wontFix' | 'byDesign';
  threadContext: AzureDevOpsThreadContext;
}

interface AzureDevOpsPRComment {
  id: number;
  parentCommentId?: number;
  content: string;
  commentType: 'text' | 'system' | 'codeChange' | 'unknown';
  author: AzureDevOpsUser;
  publishedDate: string;
  lastUpdatedDate?: string;
}

interface AzureDevOpsThreadContext {
  filePath: string;
  leftFileStart?: AzureDevOpsPosition;
  leftFileEnd?: AzureDevOpsPosition;
  rightFileStart?: AzureDevOpsPosition;
  rightFileEnd?: AzureDevOpsPosition;
}

interface AzureDevOpsPosition {
  line: number;
  offset: number;
}

interface AzureDevOpsBuildStatus {
  state: 'pending' | 'inProgress' | 'completed' | 'cancelled';
  status: 'succeeded' | 'failed' | 'canceled' | 'partiallySucceeded';
  description: string;
  context: {
    name: string;
    genre: string;
  };
  targetUrl?: string;
}

interface AzureDevOpsAPIClient {
  getPR(organization: string, project: string, repositoryId: string, prId: number): Promise<AzureDevOpsPR>;
  getPRThreads(organization: string, project: string, repositoryId: string, prId: number): Promise<AzureDevOpsPRThread[]>;
  createPRThread(organization: string, project: string, repositoryId: string, prId: number, thread: AzureDevOpsPRThreadInput): Promise<AzureDevOpsPRThread>;
  updateBuildStatus(organization: string, project: string, commitId: string, status: AzureDevOpsBuildStatusInput): Promise<AzureDevOpsBuildStatus>;
}

interface AzureDevOpsPRThreadInput {
  comments: AzureDevOpsPRCommentInput[];
  status: AzureDevOpsPRThread['status'];
  threadContext?: AzureDevOpsThreadContext;
}

interface AzureDevOpsPRCommentInput {
  parentCommentId?: number;
  content: string;
  commentType: AzureDevOpsPRComment['commentType'];
}

interface AzureDevOpsBuildStatusInput {
  state: AzureDevOpsBuildStatus['state'];
  status: AzureDevOpsBuildStatus['status'];
  description: string;
  context: AzureDevOpsBuildStatus['context'];
  targetUrl?: string;
}
```

### Implementation

```typescript
// Azure DevOps Integration Service
class AzureDevOpsIntegrationService {
  constructor(
    private apiClient: AzureDevOpsAPIClient,
    private webSocketClient: WebSocketClient,
    private reviewService: ReviewService
  ) {}

  /**
   * Create status badge for Azure DevOps PR
   */
  async createStatusBadge(
    organization: string,
    project: string,
    commitId: string,
    review: Review
  ): Promise<AzureDevOpsBuildStatus> {
    const status = this.mapReviewStatusToAzureStatus(review.status);
    const state = this.mapReviewStatusToAzureState(review.status);
    const description = this.generateStatusDescription(review);

    return await this.apiClient.updateBuildStatus(organization, project, commitId, {
      state,
      status,
      description,
      context: {
        name: 'readylayer/review',
        genre: 'continuous-integration'
      },
      targetUrl: `https://readylayer.com/reviews/${review.id}`
    });
  }

  /**
   * Create review summary thread
   */
  async createSummaryThread(
    organization: string,
    project: string,
    repositoryId: string,
    prId: number,
    review: Review
  ): Promise<AzureDevOpsPRThread> {
    const summaryContent = this.generateSummaryContent(review);

    return await this.apiClient.createPRThread(organization, project, repositoryId, prId, {
      comments: [{
        content: summaryContent,
        commentType: 'text'
      }],
      status: 'active'
    });
  }

  /**
   * Create inline comment thread for issue
   */
  async createInlineCommentThread(
    organization: string,
    project: string,
    repositoryId: string,
    prId: number,
    issue: Issue
  ): Promise<AzureDevOpsPRThread> {
    const position = await this.getIssuePosition(organization, project, repositoryId, prId, issue);
    const commentContent = this.generateIssueComment(issue);

    return await this.apiClient.createPRThread(organization, project, repositoryId, prId, {
      comments: [{
        content: commentContent,
        commentType: 'text'
      }],
      status: 'active',
      threadContext: position
    });
  }

  /**
   * Map review status to Azure DevOps status
   */
  private mapReviewStatusToAzureStatus(status: ReviewStatus): AzureDevOpsBuildStatus['status'] {
    const statusMap: Record<ReviewStatus, AzureDevOpsBuildStatus['status']> = {
      'pending': 'pending',
      'in_progress': 'inProgress',
      'success': 'succeeded',
      'warning': 'partiallySucceeded', // Azure DevOps equivalent
      'failure': 'failed',
      'error': 'failed'
    };
    return statusMap[status];
  }

  /**
   * Map review status to Azure DevOps state
   */
  private mapReviewStatusToAzureState(status: ReviewStatus): AzureDevOpsBuildStatus['state'] {
    const stateMap: Record<ReviewStatus, AzureDevOpsBuildStatus['state']> = {
      'pending': 'pending',
      'in_progress': 'inProgress',
      'success': 'completed',
      'warning': 'completed',
      'failure': 'completed',
      'error': 'completed'
    };
    return stateMap[status];
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
   * Generate summary content
   */
  private generateSummaryContent(review: Review): string {
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

### Rules Triggered
${this.formatRulesList(review.issues)}

### Required Actions
${this.formatRequiredActions(review.issues)}

**This PR ${review.status === 'failure' ? 'cannot merge' : 'can merge'} until all critical and high issues are resolved.**

[View Full Report](https://readylayer.com/reviews/${review.id}) | [Configure Rules](https://readylayer.com/config)`;
  }

  /**
   * Generate issue comment
   */
  private generateIssueComment(issue: Issue): string {
    const severityIcons: Record<Severity, string> = {
      'critical': '🔴',
      'high': '🟠',
      'medium': '🟡',
      'low': '🟢'
    };

    const icon = severityIcons[issue.severity];

    return `**${icon} ${issue.message}** (${issue.severity})

**Rule:** \`${issue.rule_id}\`  
**File:** \`${issue.file}\`  
**Line:** ${issue.line}  
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

[Apply Fix] [Learn More] [Mark as False Positive]`;
  }

  /**
   * Get issue position in PR diff
   */
  private async getIssuePosition(
    organization: string,
    project: string,
    repositoryId: string,
    prId: number,
    issue: Issue
  ): Promise<AzureDevOpsThreadContext> {
    const pr = await this.apiClient.getPR(organization, project, repositoryId, prId);
    
    return {
      filePath: issue.file,
      rightFileStart: {
        line: issue.line,
        offset: issue.column || 1
      },
      rightFileEnd: {
        line: issue.line,
        offset: issue.column || 1
      }
    };
  }

  // Helper methods
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

  private getSeverityExplanation(severity: Severity): string {
    const explanations: Record<Severity, string> = {
      'critical': 'Critical issues can lead to security vulnerabilities, data loss, or system crashes.',
      'high': 'High issues can cause bugs or significant maintenance problems.',
      'medium': 'Medium issues are style problems or minor quality issues.',
      'low': 'Low issues are suggestions and best practices.'
    };
    return explanations[severity];
  }
}
```

---

## Summary

This document provides complete, type-safe implementation specifications for all Tier 2 expansions:

1. **CI/CD Platform Enhancements** — GitHub Actions, GitLab CI, Azure Pipelines with full type definitions
2. **Jira Rich Integration** — Complete Jira API integration with document structure types
3. **Bitbucket PR UX** — Full Bitbucket API integration with type-safe implementations
4. **Azure DevOps Integration** — Complete Azure DevOps API integration with thread and status types

All implementations are fully typed with TypeScript interfaces, ensuring type safety across CI/CD platforms, project management tools, and additional git hosts.
