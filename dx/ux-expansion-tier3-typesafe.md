# ReadyLayer — Tier 3 Expansion (Type-Safe Implementation)

## Overview

Complete, type-safe implementation specifications for Tier 3 low-priority expansions: Deployment Platform Integration and Monitoring Tool Integration.

---

## Type Definitions

### Shared Types

```typescript
// Reuse types from Tier 1 and Tier 2
import type {
  ReviewStatus,
  Severity,
  Issue,
  Review,
  ReviewSummary,
  ReviewProgress
} from './ux-expansion-tier1-typesafe';

// Deployment platform types
type DeploymentPlatform = 'vercel' | 'netlify' | 'aws' | 'gcp' | 'azure';

interface Deployment {
  id: string;
  platform: DeploymentPlatform;
  url: string;
  status: DeploymentStatus;
  commit_sha: string;
  branch: string;
  created_at: string;
  completed_at?: string;
  review_id?: string;
}

type DeploymentStatus = 'building' | 'ready' | 'error' | 'canceled';

interface DeploymentReview {
  deployment_id: string;
  review: Review;
  validated: boolean;
  validated_at?: string;
}
```

---

## 1. Deployment Platform Integration

### Vercel Types

```typescript
interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  state: 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED';
  type: 'LAMBDAS';
  created: number;
  createdAt: number;
  buildingAt?: number;
  readyAt?: number;
  target?: 'production' | 'staging';
  alias?: string[];
  meta: Record<string, unknown>;
  commit?: {
    sha: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
  };
  github?: {
    deployment: string;
    org: string;
    repo: string;
    pr?: number;
  };
}

interface VercelAPIClient {
  getDeployment(deploymentId: string): Promise<VercelDeployment>;
  getDeployments(projectId: string, options?: {
    limit?: number;
    since?: number;
    until?: number;
    target?: 'production' | 'staging';
  }): Promise<VercelDeployment[]>;
  createDeploymentComment(deploymentId: string, comment: string): Promise<void>;
  updateDeploymentMetadata(deploymentId: string, metadata: Record<string, unknown>): Promise<void>;
}

interface VercelIntegrationConfig {
  vercel_team_id?: string;
  vercel_project_id: string;
  auto_validate_deployments: boolean;
  validate_on: DeploymentStatus[];
}
```

### Netlify Types

```typescript
interface NetlifyDeployment {
  id: string;
  site_id: string;
  build_id: string;
  state: 'new' | 'pending' | 'processing' | 'prepared' | 'ready' | 'error';
  name: string;
  url: string;
  ssl_url: string;
  admin_url: string;
  deploy_url: string;
  deploy_ssl_url: string;
  screenshot_url?: string;
  review_id?: string;
  branch: string;
  commit_ref: string;
  commit_url: string;
  skipped: boolean;
  created_at: string;
  updated_at: string;
  published_at?: string;
  user_id: string;
  error_message?: string;
  required?: string[];
  required_functions?: string[];
  links: {
    permalink: string;
    alias: string;
  };
  commit: {
    id: string;
    sha: string;
    author: {
      name: string;
      email: string;
    };
    message: string;
    created_at: string;
  };
}

interface NetlifyAPIClient {
  getDeployment(deploymentId: string): Promise<NetlifyDeployment>;
  getSiteDeployments(siteId: string, options?: {
    page?: number;
    per_page?: number;
  }): Promise<NetlifyDeployment[]>;
  createDeploymentComment(deploymentId: string, comment: string): Promise<void>;
  updateDeploymentMetadata(deploymentId: string, metadata: Record<string, unknown>): Promise<void>;
}

interface NetlifyIntegrationConfig {
  netlify_site_id: string;
  auto_validate_deployments: boolean;
  validate_on: DeploymentStatus[];
}
```

### AWS/GCP/Azure Types

```typescript
interface CloudDeployment {
  id: string;
  platform: 'aws' | 'gcp' | 'azure';
  service: string; // e.g., 'lambda', 'cloud-run', 'app-service'
  region: string;
  status: DeploymentStatus;
  commit_sha: string;
  created_at: string;
  url?: string;
}

interface CloudDeploymentAPIClient {
  getDeployment(deploymentId: string): Promise<CloudDeployment>;
  listDeployments(service: string, options?: {
    limit?: number;
    since?: string;
  }): Promise<CloudDeployment[]>;
  addDeploymentAnnotation(deploymentId: string, annotation: {
    key: string;
    value: string;
  }): Promise<void>;
}
```

### Implementation

```typescript
// Deployment Platform Integration Service
class DeploymentPlatformIntegrationService {
  constructor(
    private vercelClient: VercelAPIClient,
    private netlifyClient: NetlifyAPIClient,
    private cloudClient: CloudDeploymentAPIClient,
    private reviewService: ReviewService,
    private config: DeploymentIntegrationConfig
  ) {}

  /**
   * Validate deployment with ReadyLayer review
   */
  async validateDeployment(deployment: Deployment): Promise<DeploymentReview> {
    // Get review for deployment commit
    const review = await this.reviewService.getReviewForCommit(
      deployment.platform,
      deployment.commit_sha
    );

    if (!review) {
      throw new Error(`No review found for commit ${deployment.commit_sha}`);
    }

    // Validate deployment based on review
    const validated = this.isDeploymentValid(review);

    const deploymentReview: DeploymentReview = {
      deployment_id: deployment.id,
      review,
      validated,
      validated_at: validated ? new Date().toISOString() : undefined
    };

    // Add review status to deployment
    await this.addReviewStatusToDeployment(deployment, deploymentReview);

    return deploymentReview;
  }

  /**
   * Check if deployment is valid based on review
   */
  private isDeploymentValid(review: Review): boolean {
    // Deployment is valid if:
    // 1. Review status is success or warning (not failure/error)
    // 2. No critical issues
    // 3. No high issues (if configured)

    if (review.status === 'failure' || review.status === 'error') {
      return false;
    }

    if (review.summary.critical > 0) {
      return false;
    }

    if (this.config.fail_on_high && review.summary.high > 0) {
      return false;
    }

    return true;
  }

  /**
   * Add review status to Vercel deployment
   */
  private async addReviewStatusToVercelDeployment(
    deployment: VercelDeployment,
    review: DeploymentReview
  ): Promise<void> {
    const statusIcon = review.validated ? '✅' : '❌';
    const statusText = review.validated ? 'Validated' : 'Failed Validation';

    const comment = `
## 🔒 ReadyLayer Deployment Validation

**Status:** ${statusIcon} ${statusText}

**Review:** [View Report](https://readylayer.com/reviews/${review.review.id})

**Issues Found:** ${review.review.summary.total_issues}
- 🔴 Critical: ${review.review.summary.critical}
- 🟠 High: ${review.review.summary.high}
- 🟡 Medium: ${review.review.summary.medium}
- 🟢 Low: ${review.review.summary.low}

${review.validated 
  ? '✅ Deployment validated. No blocking issues found.' 
  : '❌ Deployment validation failed. Critical or high issues found.'}
`;

    await this.vercelClient.createDeploymentComment(deployment.uid, comment);

    // Add metadata
    await this.vercelClient.updateDeploymentMetadata(deployment.uid, {
      readylayer_review_id: review.review.id,
      readylayer_validated: review.validated,
      readylayer_validated_at: review.validated_at
    });
  }

  /**
   * Add review status to Netlify deployment
   */
  private async addReviewStatusToNetlifyDeployment(
    deployment: NetlifyDeployment,
    review: DeploymentReview
  ): Promise<void> {
    const statusIcon = review.validated ? '✅' : '❌';
    const statusText = review.validated ? 'Validated' : 'Failed Validation';

    const comment = `
## 🔒 ReadyLayer Deployment Validation

**Status:** ${statusIcon} ${statusText}

**Review:** [View Report](https://readylayer.com/reviews/${review.review.id})

**Issues Found:** ${review.review.summary.total_issues}
- 🔴 Critical: ${review.review.summary.critical}
- 🟠 High: ${review.review.summary.high}
- 🟡 Medium: ${review.review.summary.medium}
- 🟢 Low: ${review.review.summary.low}

${review.validated 
  ? '✅ Deployment validated. No blocking issues found.' 
  : '❌ Deployment validation failed. Critical or high issues found.'}
`;

    await this.netlifyClient.createDeploymentComment(deployment.id, comment);

    // Add metadata
    await this.netlifyClient.updateDeploymentMetadata(deployment.id, {
      readylayer_review_id: review.review.id,
      readylayer_validated: review.validated,
      readylayer_validated_at: review.validated_at
    });
  }

  /**
   * Add review status to cloud deployment
   */
  private async addReviewStatusToCloudDeployment(
    deployment: CloudDeployment,
    review: DeploymentReview
  ): Promise<void> {
    const statusIcon = review.validated ? '✅' : '❌';
    const statusText = review.validated ? 'Validated' : 'Failed Validation';

    await this.cloudClient.addDeploymentAnnotation(deployment.id, {
      key: 'readylayer_status',
      value: `${statusIcon} ${statusText}`
    });

    await this.cloudClient.addDeploymentAnnotation(deployment.id, {
      key: 'readylayer_review_id',
      value: review.review.id
    });

    await this.cloudClient.addDeploymentAnnotation(deployment.id, {
      key: 'readylayer_validated',
      value: review.validated.toString()
    });
  }

  /**
   * Add review status to deployment (platform-agnostic)
   */
  private async addReviewStatusToDeployment(
    deployment: Deployment,
    review: DeploymentReview
  ): Promise<void> {
    switch (deployment.platform) {
      case 'vercel':
        const vercelDeployment = await this.vercelClient.getDeployment(deployment.id);
        await this.addReviewStatusToVercelDeployment(vercelDeployment, review);
        break;
      
      case 'netlify':
        const netlifyDeployment = await this.netlifyClient.getDeployment(deployment.id);
        await this.addReviewStatusToNetlifyDeployment(netlifyDeployment, review);
        break;
      
      case 'aws':
      case 'gcp':
      case 'azure':
        const cloudDeployment = await this.cloudClient.getDeployment(deployment.id);
        await this.addReviewStatusToCloudDeployment(cloudDeployment, review);
        break;
    }
  }

  /**
   * Handle deployment webhook
   */
  async handleDeploymentWebhook(
    platform: DeploymentPlatform,
    payload: unknown
  ): Promise<void> {
    let deployment: Deployment;

    switch (platform) {
      case 'vercel':
        deployment = this.parseVercelWebhook(payload);
        break;
      case 'netlify':
        deployment = this.parseNetlifyWebhook(payload);
        break;
      case 'aws':
      case 'gcp':
      case 'azure':
        deployment = this.parseCloudWebhook(payload, platform);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    // Validate deployment if configured
    if (this.config.auto_validate_deployments && 
        this.config.validate_on.includes(deployment.status)) {
      await this.validateDeployment(deployment);
    }
  }

  /**
   * Parse Vercel webhook payload
   */
  private parseVercelWebhook(payload: unknown): Deployment {
    const p = payload as VercelDeployment;
    return {
      id: p.uid,
      platform: 'vercel',
      url: p.url,
      status: this.mapVercelStatusToDeploymentStatus(p.state),
      commit_sha: p.commit?.sha || '',
      branch: p.github?.repo || '',
      created_at: new Date(p.created).toISOString(),
      completed_at: p.readyAt ? new Date(p.readyAt).toISOString() : undefined
    };
  }

  /**
   * Parse Netlify webhook payload
   */
  private parseNetlifyWebhook(payload: unknown): Deployment {
    const p = payload as NetlifyDeployment;
    return {
      id: p.id,
      platform: 'netlify',
      url: p.url,
      status: this.mapNetlifyStatusToDeploymentStatus(p.state),
      commit_sha: p.commit_ref,
      branch: p.branch,
      created_at: p.created_at,
      completed_at: p.published_at
    };
  }

  /**
   * Parse cloud webhook payload
   */
  private parseCloudWebhook(payload: unknown, platform: 'aws' | 'gcp' | 'azure'): Deployment {
    const p = payload as CloudDeployment;
    return {
      id: p.id,
      platform,
      url: p.url || '',
      status: p.status,
      commit_sha: p.commit_sha,
      branch: '',
      created_at: p.created_at
    };
  }

  /**
   * Map Vercel status to deployment status
   */
  private mapVercelStatusToDeploymentStatus(state: VercelDeployment['state']): DeploymentStatus {
    const statusMap: Record<VercelDeployment['state'], DeploymentStatus> = {
      'BUILDING': 'building',
      'READY': 'ready',
      'ERROR': 'error',
      'CANCELED': 'canceled'
    };
    return statusMap[state];
  }

  /**
   * Map Netlify status to deployment status
   */
  private mapNetlifyStatusToDeploymentStatus(state: NetlifyDeployment['state']): DeploymentStatus {
    const statusMap: Record<NetlifyDeployment['state'], DeploymentStatus> = {
      'new': 'building',
      'pending': 'building',
      'processing': 'building',
      'prepared': 'building',
      'ready': 'ready',
      'error': 'error'
    };
    return statusMap[state];
  }
}

// Configuration types
interface DeploymentIntegrationConfig {
  vercel?: VercelIntegrationConfig;
  netlify?: NetlifyIntegrationConfig;
  cloud?: {
    aws?: { enabled: boolean };
    gcp?: { enabled: boolean };
    azure?: { enabled: boolean };
  };
  auto_validate_deployments: boolean;
  validate_on: DeploymentStatus[];
  fail_on_high: boolean;
}

interface ReviewService {
  getReviewForCommit(platform: string, commitSha: string): Promise<Review | null>;
}
```

---

## 2. Monitoring Tool Integration

### Datadog Types

```typescript
interface DatadogDashboard {
  id: string;
  title: string;
  description?: string;
  widgets: DatadogWidget[];
  layout_type: 'ordered' | 'free';
  is_read_only: boolean;
  notify_list: string[];
  template_variables?: DatadogTemplateVariable[];
}

type DatadogWidget = 
  | DatadogTimeseriesWidget
  | DatadogQueryValueWidget
  | DatadogNoteWidget
  | DatadogAlertGraphWidget;

interface DatadogTimeseriesWidget {
  id?: number;
  definition: {
    type: 'timeseries';
    requests: DatadogTimeseriesRequest[];
    title?: string;
    show_legend?: boolean;
    legend_size?: string;
    yaxis?: {
      label?: string;
      min?: number;
      max?: number;
    };
  };
}

interface DatadogTimeseriesRequest {
  q: string;
  display_type?: 'line' | 'bars' | 'area';
  style?: {
    palette?: string;
    line_type?: 'solid' | 'dashed' | 'dotted';
    line_width?: 'normal' | 'thick' | 'thin';
  };
}

interface DatadogQueryValueWidget {
  id?: number;
  definition: {
    type: 'query_value';
    requests: DatadogQueryValueRequest[];
    title?: string;
    precision?: number;
    text_align?: 'center' | 'left' | 'right';
    custom_links?: DatadogCustomLink[];
  };
}

interface DatadogQueryValueRequest {
  q: string;
  aggregator?: 'avg' | 'last' | 'max' | 'min' | 'sum' | 'percentile';
  conditional_formats?: DatadogConditionalFormat[];
}

interface DatadogConditionalFormat {
  comparator: '>' | '<' | '>=' | '<=';
  value: number;
  palette: 'white_on_green' | 'white_on_red' | 'white_on_yellow';
  custom_bg_color?: string;
  custom_fg_color?: string;
}

interface DatadogNoteWidget {
  id?: number;
  definition: {
    type: 'note';
    content: string;
    background_color?: string;
    font_size?: string;
    text_align?: 'center' | 'left' | 'right';
    vertical_align?: 'center' | 'top' | 'bottom';
  };
}

interface DatadogAlertGraphWidget {
  id?: number;
  definition: {
    type: 'alert_graph';
    alert_id: string;
    viz_type: 'timeseries' | 'toplist';
    title?: string;
  };
}

interface DatadogTemplateVariable {
  name: string;
  prefix?: string;
  available_values?: string[];
  default?: string;
}

interface DatadogCustomLink {
  label: string;
  link: string;
}

interface DatadogAPIClient {
  getDashboard(dashboardId: string): Promise<DatadogDashboard>;
  createDashboard(dashboard: DatadogDashboardInput): Promise<DatadogDashboard>;
  updateDashboard(dashboardId: string, dashboard: DatadogDashboardInput): Promise<DatadogDashboard>;
  createWidget(dashboardId: string, widget: DatadogWidget): Promise<DatadogWidget>;
  updateWidget(dashboardId: string, widgetId: number, widget: DatadogWidget): Promise<DatadogWidget>;
  sendEvent(event: DatadogEvent): Promise<void>;
}

interface DatadogDashboardInput {
  title: string;
  description?: string;
  widgets: DatadogWidget[];
  layout_type: 'ordered' | 'free';
  is_read_only?: boolean;
  notify_list?: string[];
  template_variables?: DatadogTemplateVariable[];
}

interface DatadogEvent {
  title: string;
  text: string;
  alert_type: 'error' | 'warning' | 'info' | 'success';
  tags?: string[];
  source_type_name?: string;
  date_happened?: number;
  priority?: 'normal' | 'low';
}
```

### New Relic Types

```typescript
interface NewRelicDashboard {
  id: number;
  name: string;
  description?: string;
  pages: NewRelicDashboardPage[];
  permissions: 'PRIVATE' | 'PUBLIC_READ_ONLY' | 'PUBLIC_READ_WRITE';
  owner_email: string;
  created_at: string;
  updated_at: string;
}

interface NewRelicDashboardPage {
  id: number;
  name: string;
  guid: string;
  widgets: NewRelicWidget[];
}

type NewRelicWidget = 
  | NewRelicLineChartWidget
  | NewRelicBarChartWidget
  | NewRelicTableWidget
  | NewRelicMarkdownWidget;

interface NewRelicLineChartWidget {
  visualization: {
    id: string;
  };
  layout: {
    row: number;
    column: number;
    height: number;
    width: number;
  };
  rawConfiguration: {
    nrqlQueries: NewRelicNRQLQuery[];
    title?: string;
    legend?: {
      enabled: boolean;
    };
  };
}

interface NewRelicBarChartWidget {
  visualization: {
    id: string;
  };
  layout: {
    row: number;
    column: number;
    height: number;
    width: number;
  };
  rawConfiguration: {
    nrqlQueries: NewRelicNRQLQuery[];
    title?: string;
  };
}

interface NewRelicTableWidget {
  visualization: {
    id: string;
  };
  layout: {
    row: number;
    column: number;
    height: number;
    width: number;
  };
  rawConfiguration: {
    nrqlQueries: NewRelicNRQLQuery[];
    title?: string;
  };
}

interface NewRelicMarkdownWidget {
  visualization: {
    id: string;
  };
  layout: {
    row: number;
    column: number;
    height: number;
    width: number;
  };
  rawConfiguration: {
    text: string;
  };
}

interface NewRelicNRQLQuery {
  accountId: number;
  query: string;
}

interface NewRelicAPIClient {
  getDashboard(dashboardId: number): Promise<NewRelicDashboard>;
  createDashboard(dashboard: NewRelicDashboardInput): Promise<NewRelicDashboard>;
  updateDashboard(dashboardId: number, dashboard: NewRelicDashboardInput): Promise<NewRelicDashboard>;
  createWidget(dashboardId: number, pageGuid: string, widget: NewRelicWidget): Promise<NewRelicWidget>;
  sendEvent(event: NewRelicEvent): Promise<void>;
}

interface NewRelicDashboardInput {
  name: string;
  description?: string;
  permissions: 'PRIVATE' | 'PUBLIC_READ_ONLY' | 'PUBLIC_READ_WRITE';
}

interface NewRelicEvent {
  eventType: string;
  attributes: Record<string, unknown>;
}
```

### Sentry Types

```typescript
interface SentryProject {
  id: string;
  slug: string;
  name: string;
  platform?: string;
  dateCreated: string;
  isBookmarked: boolean;
  isMember: boolean;
  features: string[];
  firstEvent?: string;
  firstTransactionEvent?: boolean;
  hasAccess: boolean;
  hasMinifiedStackTrace: boolean;
  hasMonitors: boolean;
  hasProfiles: boolean;
  hasReplays: boolean;
  hasSessions: boolean;
  isInternal: boolean;
  isPublic: boolean;
  team: {
    id: string;
    name: string;
    slug: string;
  };
  teams: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  organization: {
    id: string;
    slug: string;
    name: string;
  };
}

interface SentryIssue {
  id: string;
  shortId: string;
  title: string;
  culprit: string;
  permalink: string;
  logger?: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal';
  status: 'resolved' | 'unresolved' | 'ignored';
  statusDetails: Record<string, unknown>;
  substatus?: 'archived_until_escalating' | 'archived_forever' | 'archived_until_condition_met' | 'new' | 'ongoing' | 'regression';
  isPublic: boolean;
  platform?: string;
  project: {
    id: string;
    name: string;
    slug: string;
    platform?: string;
  };
  type: string;
  metadata: {
    filename?: string;
    function?: string;
    type?: string;
    value?: string;
    title?: string;
  };
  numComments: number;
  assignedTo?: SentryUser;
  isBookmarked: boolean;
  isSubscribed: boolean;
  hasSeen: boolean;
  annotations: string[];
  issueCategory: 'error' | 'performance';
  isUnhandled: boolean;
  count: string;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
}

interface SentryUser {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl?: string;
  isActive: boolean;
  hasPasswordAuth: boolean;
  isManaged: boolean;
  dateJoined: string;
  lastLogin?: string;
  isSuperuser: boolean;
  isStaff: boolean;
  experiments: Record<string, unknown>;
  flags: {
    'newsletter_consent_prompt'?: boolean;
  };
}

interface SentryAPIClient {
  getProject(organizationSlug: string, projectSlug: string): Promise<SentryProject>;
  getIssues(organizationSlug: string, projectSlug: string, options?: {
    query?: string;
    status?: SentryIssue['status'];
    limit?: number;
  }): Promise<SentryIssue[]>;
  createIssue(organizationSlug: string, projectSlug: string, issue: SentryIssueInput): Promise<SentryIssue>;
  linkIssueToReview(issueId: string, reviewId: string): Promise<void>;
  sendEvent(event: SentryEvent): Promise<void>;
}

interface SentryIssueInput {
  title: string;
  culprit: string;
  level: SentryIssue['level'];
  metadata: SentryIssue['metadata'];
  tags?: Array<{ key: string; value: string }>;
}

interface SentryEvent {
  message: string;
  level: SentryIssue['level'];
  tags?: Array<{ key: string; value: string }>;
  extra?: Record<string, unknown>;
  fingerprint?: string[];
}
```

### Implementation

```typescript
// Monitoring Tool Integration Service
class MonitoringToolIntegrationService {
  constructor(
    private datadogClient: DatadogAPIClient,
    private newRelicClient: NewRelicAPIClient,
    private sentryClient: SentryAPIClient,
    private reviewService: ReviewService,
    private config: MonitoringIntegrationConfig
  ) {}

  /**
   * Correlate code quality issues with runtime errors (Datadog)
   */
  async correlateWithDatadogErrors(
    review: Review,
    timeRange: { start: string; end: string }
  ): Promise<DatadogCorrelation[]> {
    const correlations: DatadogCorrelation[] = [];

    // Get errors from Datadog for the time range
    const errors = await this.datadogClient.queryLogs({
      query: `status:error service:${review.repo_id}`,
      timeRange
    });

    // Match errors with review issues
    for (const issue of review.issues) {
      const matchingErrors = errors.filter(error => 
        this.isErrorRelatedToIssue(error, issue)
      );

      if (matchingErrors.length > 0) {
        correlations.push({
          issue_id: issue.id,
          error_count: matchingErrors.length,
          errors: matchingErrors,
          correlation_score: this.calculateCorrelationScore(issue, matchingErrors)
        });
      }
    }

    // Create dashboard widget showing correlations
    if (correlations.length > 0) {
      await this.createDatadogCorrelationWidget(review, correlations);
    }

    return correlations;
  }

  /**
   * Correlate code quality issues with performance (New Relic)
   */
  async correlateWithNewRelicPerformance(
    review: Review,
    timeRange: { start: string; end: string }
  ): Promise<NewRelicCorrelation[]> {
    const correlations: NewRelicCorrelation[] = [];

    // Get performance metrics from New Relic
    const metrics = await this.newRelicClient.queryNRQL(`
      SELECT average(duration), count(*) 
      FROM Transaction 
      WHERE appName = '${review.repo_id}' 
      SINCE ${timeRange.start} 
      UNTIL ${timeRange.end}
    `);

    // Match performance issues with review issues
    for (const issue of review.issues) {
      if (issue.rule_id.includes('performance')) {
        const correlation = this.correlatePerformanceIssue(issue, metrics);
        if (correlation) {
          correlations.push(correlation);
        }
      }
    }

    // Create dashboard widget showing correlations
    if (correlations.length > 0) {
      await this.createNewRelicCorrelationWidget(review, correlations);
    }

    return correlations;
  }

  /**
   * Correlate code quality issues with Sentry errors
   */
  async correlateWithSentryErrors(
    review: Review,
    organizationSlug: string,
    projectSlug: string
  ): Promise<SentryCorrelation[]> {
    const correlations: SentryCorrelation[] = [];

    // Get errors from Sentry
    const issues = await this.sentryClient.getIssues(organizationSlug, projectSlug, {
      status: 'unresolved',
      limit: 100
    });

    // Match Sentry issues with review issues
    for (const reviewIssue of review.issues) {
      const matchingSentryIssues = issues.filter(sentryIssue =>
        this.isSentryIssueRelatedToReviewIssue(sentryIssue, reviewIssue)
      );

      if (matchingSentryIssues.length > 0) {
        correlations.push({
          review_issue_id: reviewIssue.id,
          sentry_issue_ids: matchingSentryIssues.map(i => i.id),
          correlation_score: this.calculateSentryCorrelationScore(reviewIssue, matchingSentryIssues)
        });

        // Link Sentry issues to review
        for (const sentryIssue of matchingSentryIssues) {
          await this.sentryClient.linkIssueToReview(sentryIssue.id, review.id);
        }
      }
    }

    return correlations;
  }

  /**
   * Create Datadog correlation widget
   */
  private async createDatadogCorrelationWidget(
    review: Review,
    correlations: DatadogCorrelation[]
  ): Promise<void> {
    const widget: DatadogQueryValueWidget = {
      definition: {
        type: 'query_value',
        requests: [{
          q: `sum:readylayer.correlations{review_id:${review.id}}`,
          aggregator: 'sum'
        }],
        title: `ReadyLayer Correlations for Review ${review.id}`,
        precision: 0,
        text_align: 'center',
        custom_links: [{
          label: 'View Review',
          link: `https://readylayer.com/reviews/${review.id}`
        }]
      }
    };

    // Add widget to dashboard (implementation depends on dashboard ID)
    await this.datadogClient.createWidget(this.config.datadog_dashboard_id, widget);
  }

  /**
   * Create New Relic correlation widget
   */
  private async createNewRelicCorrelationWidget(
    review: Review,
    correlations: NewRelicCorrelation[]
  ): Promise<void> {
    const widget: NewRelicMarkdownWidget = {
      visualization: { id: 'viz.markdown' },
      layout: {
        row: 0,
        column: 0,
        height: 4,
        width: 6
      },
      rawConfiguration: {
        text: this.generateCorrelationMarkdown(review, correlations)
      }
    };

    // Add widget to dashboard (implementation depends on dashboard ID and page GUID)
    await this.newRelicClient.createWidget(
      this.config.newrelic_dashboard_id,
      this.config.newrelic_page_guid,
      widget
    );
  }

  /**
   * Check if error is related to issue
   */
  private isErrorRelatedToIssue(error: DatadogLog, issue: Issue): boolean {
    // Check if error message contains file path or rule keywords
    const errorMessage = error.message.toLowerCase();
    const filePath = issue.file.toLowerCase();
    const ruleKeywords = issue.rule_id.split('.');

    return (
      errorMessage.includes(filePath) ||
      ruleKeywords.some(keyword => errorMessage.includes(keyword))
    );
  }

  /**
   * Check if Sentry issue is related to review issue
   */
  private isSentryIssueRelatedToReviewIssue(
    sentryIssue: SentryIssue,
    reviewIssue: Issue
  ): boolean {
    // Check if Sentry issue metadata matches review issue
    const sentryMetadata = sentryIssue.metadata;
    const sentryFile = sentryMetadata.filename || '';
    const reviewFile = reviewIssue.file;

    return (
      sentryFile.includes(reviewFile) ||
      sentryIssue.culprit.includes(reviewFile) ||
      this.checkRuleMatch(sentryIssue, reviewIssue)
    );
  }

  /**
   * Check if rule matches between Sentry and review issue
   */
  private checkRuleMatch(sentryIssue: SentryIssue, reviewIssue: Issue): boolean {
    // Check if Sentry issue type matches review rule category
    const ruleCategory = reviewIssue.rule_id.split('.')[0];
    const sentryType = sentryIssue.type.toLowerCase();

    return (
      (ruleCategory === 'security' && sentryType.includes('security')) ||
      (ruleCategory === 'performance' && sentryType.includes('performance')) ||
      (ruleCategory === 'quality' && sentryType.includes('error'))
    );
  }

  /**
   * Calculate correlation score
   */
  private calculateCorrelationScore(
    issue: Issue,
    errors: DatadogLog[]
  ): number {
    // Simple correlation score based on:
    // 1. Number of matching errors
    // 2. Severity of issue
    // 3. Time proximity

    const severityWeight: Record<Severity, number> = {
      'critical': 1.0,
      'high': 0.7,
      'medium': 0.4,
      'low': 0.2
    };

    const baseScore = errors.length * 0.1;
    const severityMultiplier = severityWeight[issue.severity];

    return Math.min(baseScore * severityMultiplier, 1.0);
  }

  /**
   * Calculate Sentry correlation score
   */
  private calculateSentryCorrelationScore(
    reviewIssue: Issue,
    sentryIssues: SentryIssue[]
  ): number {
    // Similar to Datadog correlation score
    const severityWeight: Record<Severity, number> = {
      'critical': 1.0,
      'high': 0.7,
      'medium': 0.4,
      'low': 0.2
    };

    const baseScore = sentryIssues.length * 0.15;
    const severityMultiplier = severityWeight[reviewIssue.severity];

    return Math.min(baseScore * severityMultiplier, 1.0);
  }

  /**
   * Correlate performance issue
   */
  private correlatePerformanceIssue(
    issue: Issue,
    metrics: NewRelicMetrics
  ): NewRelicCorrelation | null {
    // Check if performance metrics indicate issue
    if (metrics.averageDuration > this.config.performance_threshold) {
      return {
        issue_id: issue.id,
        average_duration: metrics.averageDuration,
        transaction_count: metrics.count,
        correlation_score: 0.8
      };
    }

    return null;
  }

  /**
   * Generate correlation markdown
   */
  private generateCorrelationMarkdown(
    review: Review,
    correlations: NewRelicCorrelation[]
  ): string {
    return `## 🔒 ReadyLayer Performance Correlations

**Review:** [${review.id}](https://readylayer.com/reviews/${review.id})

**Correlations Found:** ${correlations.length}

${correlations.map(c => `
- Issue: ${c.issue_id}
  - Average Duration: ${c.average_duration}ms
  - Transaction Count: ${c.transaction_count}
  - Correlation Score: ${c.correlation_score}
`).join('\n')}`;
  }
}

// Correlation types
interface DatadogCorrelation {
  issue_id: string;
  error_count: number;
  errors: DatadogLog[];
  correlation_score: number;
}

interface NewRelicCorrelation {
  issue_id: string;
  average_duration: number;
  transaction_count: number;
  correlation_score: number;
}

interface SentryCorrelation {
  review_issue_id: string;
  sentry_issue_ids: string[];
  correlation_score: number;
}

interface DatadogLog {
  message: string;
  timestamp: string;
  service: string;
  status: string;
  [key: string]: unknown;
}

interface NewRelicMetrics {
  averageDuration: number;
  count: number;
}

// Configuration types
interface MonitoringIntegrationConfig {
  datadog?: {
    enabled: boolean;
    dashboard_id: string;
    api_key: string;
    app_key: string;
  };
  newrelic?: {
    enabled: boolean;
    dashboard_id: number;
    page_guid: string;
    api_key: string;
  };
  sentry?: {
    enabled: boolean;
    organization_slug: string;
    api_key: string;
  };
  performance_threshold: number; // milliseconds
}

// Additional API client methods
interface DatadogAPIClient {
  queryLogs(query: {
    query: string;
    timeRange: { start: string; end: string };
  }): Promise<DatadogLog[]>;
}

interface NewRelicAPIClient {
  queryNRQL(query: string): Promise<NewRelicMetrics>;
}
```

---

## Summary

This document provides complete, type-safe implementation specifications for all Tier 3 expansions:

1. **Deployment Platform Integration** — Vercel, Netlify, AWS/GCP/Azure with full type definitions
2. **Monitoring Tool Integration** — Datadog, New Relic, Sentry with correlation logic and dashboard widgets

All implementations are fully typed with TypeScript interfaces, ensuring type safety across deployment platforms and monitoring tools. These integrations enable:

- **Post-deployment validation:** Validate code quality after deployment
- **Runtime correlation:** Correlate code quality issues with runtime errors and performance
- **Dashboard widgets:** Visual representation of code quality in monitoring dashboards

These Tier 3 expansions provide advanced features for enterprise customers who need deeper integration with their deployment and monitoring infrastructure.
