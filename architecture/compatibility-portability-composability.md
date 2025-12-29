# ReadyLayer — Compatibility, Portability, and Composability Architecture

## Core Principles

### 1. Compatibility
- **Platform-agnostic core:** Core logic works across all platforms
- **Version compatibility:** Support multiple API versions simultaneously
- **Backward compatibility:** Maintain compatibility with older integrations
- **Graceful degradation:** Fallback when platform features unavailable

### 2. Portability
- **Stateless services:** Services can be deployed anywhere
- **Configuration-driven:** Behavior controlled via config, not code
- **Environment-agnostic:** Works in any environment (cloud, on-prem, hybrid)
- **Docker/Kubernetes ready:** Containerized and orchestrated

### 3. Composability
- **Modular services:** Services can be combined in different ways
- **Plugin architecture:** Extensible via plugins
- **Adapter pattern:** Platform-specific logic isolated in adapters
- **Event-driven:** Loose coupling via events

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ReadyLayer Core Services                  │
│  (Platform-Agnostic, Stateless, Composable)                  │
├─────────────────────────────────────────────────────────────┤
│  Review Guard Service  │  Test Engine  │  Doc Sync Service   │
│  (Business Logic)      │  (Business)  │  (Business Logic)   │
└─────────────────────────────────────────────────────────────┘
                            ↕ Events ↕
┌─────────────────────────────────────────────────────────────┐
│                    Event Bus (Normalized)                    │
│  pr.opened │ pr.updated │ ci.completed │ merge.completed     │
└─────────────────────────────────────────────────────────────┘
                            ↕ Adapters ↕
┌─────────────────────────────────────────────────────────────┐
│              Platform Adapters (Composable)                  │
│  GitHub │ GitLab │ Bitbucket │ Azure DevOps │ Slack │ Jira  │
└─────────────────────────────────────────────────────────────┘
                            ↕ APIs ↕
┌─────────────────────────────────────────────────────────────┐
│              External Platforms                               │
│  GitHub.com │ GitLab.com │ Bitbucket.org │ etc.              │
└─────────────────────────────────────────────────────────────┘
```

---

## Adapter Pattern Architecture

### Core Adapter Interface

```typescript
/**
 * Base adapter interface for all platform integrations
 * Ensures compatibility and composability across platforms
 */
interface PlatformAdapter {
  // Platform identification
  readonly platform: Platform;
  readonly version: string;
  
  // Authentication
  authenticate(config: AdapterConfig): Promise<AdapterCredentials>;
  refreshCredentials(credentials: AdapterCredentials): Promise<AdapterCredentials>;
  
  // Event normalization
  normalizeWebhook(payload: unknown, headers: Record<string, string>): Promise<NormalizedEvent>;
  validateWebhook(payload: unknown, headers: Record<string, string>): Promise<boolean>;
  
  // PR/MR operations (normalized)
  getPR(prId: string): Promise<NormalizedPR>;
  getPRDiff(prId: string): Promise<NormalizedDiff>;
  postPRComment(prId: string, comment: NormalizedComment): Promise<NormalizedComment>;
  updatePRStatus(prId: string, status: NormalizedStatus): Promise<void>;
  
  // File operations (normalized)
  getFileContents(repoId: string, path: string, ref: string): Promise<string>;
  createFile(repoId: string, path: string, content: string, message: string): Promise<void>;
  updateFile(repoId: string, path: string, content: string, message: string): Promise<void>;
  
  // WebSocket/real-time (normalized)
  subscribeToUpdates(prId: string, callback: (event: NormalizedEvent) => void): Promise<Subscription>;
  unsubscribe(subscription: Subscription): Promise<void>;
  
  // Health and capabilities
  getCapabilities(): AdapterCapabilities;
  healthCheck(): Promise<AdapterHealth>;
}

/**
 * Normalized types that work across all platforms
 */
interface NormalizedPR {
  id: string;
  number: number;
  title: string;
  description?: string;
  state: 'open' | 'closed' | 'merged';
  source_branch: string;
  target_branch: string;
  head_sha: string;
  base_sha: string;
  author: NormalizedUser;
  created_at: string;
  updated_at: string;
  url: string;
  platform: Platform;
  platform_specific?: Record<string, unknown>; // Platform-specific data
}

interface NormalizedDiff {
  files: NormalizedDiffFile[];
  total_additions: number;
  total_deletions: number;
}

interface NormalizedDiffFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  hunks: NormalizedHunk[];
}

interface NormalizedHunk {
  old_start: number;
  new_start: number;
  old_lines: number;
  new_lines: number;
  lines: NormalizedDiffLine[];
}

interface NormalizedDiffLine {
  type: 'addition' | 'deletion' | 'context';
  content: string;
  line_number: number;
}

interface NormalizedComment {
  id: string;
  body: string;
  author: NormalizedUser;
  created_at: string;
  updated_at?: string;
  position?: NormalizedCommentPosition;
  resolved?: boolean;
}

interface NormalizedCommentPosition {
  path: string;
  line: number;
  side: 'left' | 'right';
  start_line?: number;
}

interface NormalizedStatus {
  state: 'pending' | 'success' | 'failure' | 'error';
  description: string;
  target_url?: string;
  context: string;
}

interface NormalizedUser {
  id: string;
  username: string;
  name: string;
  email?: string;
  avatar_url?: string;
}

interface NormalizedEvent {
  id: string;
  type: NormalizedEventType;
  platform: Platform;
  timestamp: string;
  data: NormalizedEventData;
  correlation_id: string;
}

type NormalizedEventType = 
  | 'pr.opened'
  | 'pr.updated'
  | 'pr.closed'
  | 'pr.merged'
  | 'ci.completed'
  | 'merge.completed'
  | 'comment.created'
  | 'comment.updated';

type NormalizedEventData = 
  | PROpenedEventData
  | PRUpdatedEventData
  | PRClosedEventData
  | PRMergedEventData
  | CICompletedEventData
  | MergeCompletedEventData
  | CommentCreatedEventData
  | CommentUpdatedEventData;

interface PROpenedEventData {
  pr: NormalizedPR;
}

interface PRUpdatedEventData {
  pr: NormalizedPR;
  changes: string[];
}

interface PRClosedEventData {
  pr: NormalizedPR;
  merged: boolean;
}

interface PRMergedEventData {
  pr: NormalizedPR;
  merge_commit_sha: string;
}

interface CICompletedEventData {
  status: 'success' | 'failure' | 'cancelled';
  commit_sha: string;
  duration?: number;
  logs_url?: string;
}

interface MergeCompletedEventData {
  pr: NormalizedPR;
  merge_commit_sha: string;
}

interface CommentCreatedEventData {
  comment: NormalizedComment;
  pr_id: string;
}

interface CommentUpdatedEventData {
  comment: NormalizedComment;
  pr_id: string;
}

interface AdapterConfig {
  platform: Platform;
  credentials: Record<string, unknown>;
  webhook_secret?: string;
  api_version?: string;
  rate_limit?: {
    requests_per_hour: number;
    requests_per_minute: number;
  };
}

interface AdapterCredentials {
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  token_type: 'bearer' | 'basic' | 'oauth';
  scopes?: string[];
}

interface AdapterCapabilities {
  supports_inline_comments: boolean;
  supports_status_checks: boolean;
  supports_webhooks: boolean;
  supports_websockets: boolean;
  supports_file_operations: boolean;
  max_comment_length: number;
  max_file_size: number;
  supported_event_types: NormalizedEventType[];
}

interface AdapterHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  last_check: string;
  response_time_ms: number;
  rate_limit_remaining?: number;
  errors?: string[];
}

interface Subscription {
  id: string;
  platform: Platform;
  resource_id: string;
  event_types: NormalizedEventType[];
  created_at: string;
}
```

---

## Platform Adapter Implementations

### GitHub Adapter

```typescript
class GitHubAdapter implements PlatformAdapter {
  readonly platform: Platform = 'github';
  readonly version: string = 'v1';
  
  private apiClient: GitHubAPIClient;
  private webhookValidator: GitHubWebhookValidator;
  private wsClient: GitHubWebSocketClient;
  
  constructor(config: AdapterConfig) {
    this.apiClient = new GitHubAPIClient(config.credentials);
    this.webhookValidator = new GitHubWebhookValidator(config.webhook_secret);
    this.wsClient = new GitHubWebSocketClient(config.credentials);
  }
  
  async normalizeWebhook(
    payload: unknown,
    headers: Record<string, string>
  ): Promise<NormalizedEvent> {
    // Validate webhook
    if (!await this.validateWebhook(payload, headers)) {
      throw new Error('Invalid webhook signature');
    }
    
    const githubEvent = payload as GitHubWebhookPayload;
    const eventType = headers['x-github-event'];
    
    // Normalize to common event type
    const normalizedType = this.mapGitHubEventToNormalized(eventType, githubEvent.action);
    
    return {
      id: githubEvent.delivery || crypto.randomUUID(),
      type: normalizedType,
      platform: 'github',
      timestamp: new Date().toISOString(),
      data: this.normalizeEventData(normalizedType, githubEvent),
      correlation_id: githubEvent.installation?.id?.toString() || ''
    };
  }
  
  async getPR(prId: string): Promise<NormalizedPR> {
    const [owner, repo, number] = this.parsePRId(prId);
    const pr = await this.apiClient.getPullRequest(owner, repo, parseInt(number));
    
    return {
      id: `${owner}/${repo}#${pr.number}`,
      number: pr.number,
      title: pr.title,
      description: pr.body || undefined,
      state: this.mapGitHubStateToNormalized(pr.state, pr.merged),
      source_branch: pr.head.ref,
      target_branch: pr.base.ref,
      head_sha: pr.head.sha,
      base_sha: pr.base.sha,
      author: this.normalizeUser(pr.user),
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      url: pr.html_url,
      platform: 'github',
      platform_specific: {
        github_id: pr.id,
        github_node_id: pr.node_id,
        draft: pr.draft,
        mergeable: pr.mergeable
      }
    };
  }
  
  async postPRComment(
    prId: string,
    comment: NormalizedComment
  ): Promise<NormalizedComment> {
    const [owner, repo, number] = this.parsePRId(prId);
    
    const githubComment = await this.apiClient.createReviewComment({
      owner,
      repo,
      pull_number: parseInt(number),
      body: comment.body,
      path: comment.position?.path,
      line: comment.position?.line,
      side: comment.position?.side === 'right' ? 'RIGHT' : 'LEFT',
      start_line: comment.position?.start_line
    });
    
    return this.normalizeComment(githubComment);
  }
  
  async updatePRStatus(
    prId: string,
    status: NormalizedStatus
  ): Promise<void> {
    const [owner, repo, number] = this.parsePRId(prId);
    const pr = await this.getPR(prId);
    
    await this.apiClient.createCommitStatus({
      owner,
      repo,
      sha: pr.head_sha,
      state: this.mapNormalizedStatusToGitHub(status.state),
      target_url: status.target_url,
      description: status.description,
      context: status.context
    });
  }
  
  async subscribeToUpdates(
    prId: string,
    callback: (event: NormalizedEvent) => void
  ): Promise<Subscription> {
    const [owner, repo, number] = this.parsePRId(prId);
    
    return await this.wsClient.subscribe(`pr:${owner}/${repo}:${number}`, (event) => {
      callback(this.normalizeWebSocketEvent(event));
    });
  }
  
  getCapabilities(): AdapterCapabilities {
    return {
      supports_inline_comments: true,
      supports_status_checks: true,
      supports_webhooks: true,
      supports_websockets: true,
      supports_file_operations: true,
      max_comment_length: 65536,
      max_file_size: 100 * 1024 * 1024, // 100MB
      supported_event_types: [
        'pr.opened',
        'pr.updated',
        'pr.closed',
        'pr.merged',
        'ci.completed',
        'merge.completed',
        'comment.created',
        'comment.updated'
      ]
    };
  }
  
  // Helper methods for normalization
  private mapGitHubEventToNormalized(
    eventType: string,
    action: string
  ): NormalizedEventType {
    const eventMap: Record<string, NormalizedEventType> = {
      'pull_request.opened': 'pr.opened',
      'pull_request.synchronize': 'pr.updated',
      'pull_request.closed': 'pr.closed',
      'pull_request.merged': 'pr.merged',
      'check_run.completed': 'ci.completed',
      'push': 'merge.completed',
      'issue_comment.created': 'comment.created',
      'issue_comment.edited': 'comment.updated'
    };
    
    const key = `${eventType}.${action}`;
    return eventMap[key] || eventMap[eventType] || 'pr.updated';
  }
  
  private mapGitHubStateToNormalized(
    state: string,
    merged: boolean
  ): NormalizedPR['state'] {
    if (merged) return 'merged';
    if (state === 'open') return 'open';
    return 'closed';
  }
  
  private mapNormalizedStatusToGitHub(
    state: NormalizedStatus['state']
  ): 'pending' | 'success' | 'failure' | 'error' {
    const statusMap: Record<NormalizedStatus['state'], 'pending' | 'success' | 'failure' | 'error'> = {
      'pending': 'pending',
      'success': 'success',
      'failure': 'failure',
      'error': 'error'
    };
    return statusMap[state];
  }
  
  private normalizeUser(user: GitHubUser): NormalizedUser {
    return {
      id: user.id.toString(),
      username: user.login,
      name: user.name || user.login,
      email: user.email,
      avatar_url: user.avatar_url
    };
  }
  
  private normalizeComment(comment: GitHubComment): NormalizedComment {
    return {
      id: comment.id.toString(),
      body: comment.body,
      author: this.normalizeUser(comment.user),
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      position: comment.position ? {
        path: comment.path,
        line: comment.line,
        side: comment.side === 'RIGHT' ? 'right' : 'left',
        start_line: comment.start_line
      } : undefined,
      resolved: comment.in_reply_to_id ? true : false
    };
  }
  
  private normalizeEventData(
    type: NormalizedEventType,
    payload: GitHubWebhookPayload
  ): NormalizedEventData {
    switch (type) {
      case 'pr.opened':
      case 'pr.updated':
      case 'pr.closed':
      case 'pr.merged':
        return {
          pr: this.normalizePRFromWebhook(payload.pull_request!)
        };
      case 'ci.completed':
        return {
          status: payload.check_run?.conclusion === 'success' ? 'success' : 'failure',
          commit_sha: payload.check_run?.head_sha || '',
          duration: payload.check_run?.completed_at ? 
            new Date(payload.check_run.completed_at).getTime() - 
            new Date(payload.check_run.started_at).getTime() : undefined,
          logs_url: payload.check_run?.html_url
        };
      default:
        return {} as NormalizedEventData;
    }
  }
  
  private normalizePRFromWebhook(pr: GitHubPullRequest): NormalizedPR {
    return {
      id: `${pr.base.repo.full_name}#${pr.number}`,
      number: pr.number,
      title: pr.title,
      description: pr.body || undefined,
      state: pr.merged ? 'merged' : pr.state === 'open' ? 'open' : 'closed',
      source_branch: pr.head.ref,
      target_branch: pr.base.ref,
      head_sha: pr.head.sha,
      base_sha: pr.base.sha,
      author: this.normalizeUser(pr.user),
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      url: pr.html_url,
      platform: 'github'
    };
  }
  
  private parsePRId(prId: string): [string, string, string] {
    const match = prId.match(/^(.+)\/(.+)#(\d+)$/);
    if (!match) throw new Error(`Invalid PR ID format: ${prId}`);
    return [match[1], match[2], match[3]];
  }
  
  private normalizeWebSocketEvent(event: GitHubWebSocketEvent): NormalizedEvent {
    return {
      id: event.id,
      type: this.mapGitHubEventToNormalized(event.type, event.action || ''),
      platform: 'github',
      timestamp: event.timestamp,
      data: event.data as NormalizedEventData,
      correlation_id: event.correlation_id
    };
  }
  
  async validateWebhook(
    payload: unknown,
    headers: Record<string, string>
  ): Promise<boolean> {
    return this.webhookValidator.validate(payload, headers);
  }
  
  async authenticate(config: AdapterConfig): Promise<AdapterCredentials> {
    // GitHub OAuth flow
    const credentials = await this.apiClient.authenticate(config.credentials);
    return {
      access_token: credentials.token,
      token_type: 'bearer',
      scopes: credentials.scopes
    };
  }
  
  async refreshCredentials(
    credentials: AdapterCredentials
  ): Promise<AdapterCredentials> {
    // GitHub tokens don't expire, but refresh if needed
    return credentials;
  }
  
  async getPRDiff(prId: string): Promise<NormalizedDiff> {
    const [owner, repo, number] = this.parsePRId(prId);
    const diff = await this.apiClient.getPullRequestDiff(owner, repo, parseInt(number));
    return this.normalizeDiff(diff);
  }
  
  private normalizeDiff(diff: string): NormalizedDiff {
    // Parse unified diff format
    const parser = new DiffParser();
    return parser.parse(diff);
  }
  
  async getFileContents(
    repoId: string,
    path: string,
    ref: string
  ): Promise<string> {
    const [owner, repo] = repoId.split('/');
    const file = await this.apiClient.getFileContents(owner, repo, path, ref);
    return Buffer.from(file.content, 'base64').toString('utf-8');
  }
  
  async createFile(
    repoId: string,
    path: string,
    content: string,
    message: string
  ): Promise<void> {
    const [owner, repo] = repoId.split('/');
    await this.apiClient.createFile(owner, repo, path, content, message);
  }
  
  async updateFile(
    repoId: string,
    path: string,
    content: string,
    message: string
  ): Promise<void> {
    const [owner, repo] = repoId.split('/');
    await this.apiClient.updateFile(owner, repo, path, content, message);
  }
  
  async unsubscribe(subscription: Subscription): Promise<void> {
    await this.wsClient.unsubscribe(subscription.id);
  }
  
  async healthCheck(): Promise<AdapterHealth> {
    const start = Date.now();
    try {
      await this.apiClient.getRateLimit();
      const responseTime = Date.now() - start;
      const rateLimit = await this.apiClient.getRateLimit();
      
      return {
        status: 'healthy',
        last_check: new Date().toISOString(),
        response_time_ms: responseTime,
        rate_limit_remaining: rateLimit.remaining
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        last_check: new Date().toISOString(),
        response_time_ms: Date.now() - start,
        errors: [(error as Error).message]
      };
    }
  }
}
```

### GitLab Adapter (Composable Pattern)

```typescript
class GitLabAdapter implements PlatformAdapter {
  readonly platform: Platform = 'gitlab';
  readonly version: string = 'v1';
  
  // Similar structure to GitHubAdapter but with GitLab-specific implementations
  // Uses same NormalizedPR, NormalizedComment, etc. interfaces
  
  async normalizeWebhook(
    payload: unknown,
    headers: Record<string, string>
  ): Promise<NormalizedEvent> {
    const gitlabEvent = payload as GitLabWebhookPayload;
    
    return {
      id: gitlabEvent.object_attributes?.iid?.toString() || crypto.randomUUID(),
      type: this.mapGitLabEventToNormalized(gitlabEvent),
      platform: 'gitlab',
      timestamp: new Date().toISOString(),
      data: this.normalizeGitLabEventData(gitlabEvent),
      correlation_id: gitlabEvent.project?.id?.toString() || ''
    };
  }
  
  // Implementation follows same pattern as GitHubAdapter
  // but uses GitLab API and normalizes to same Normalized types
}
```

---

## Adapter Registry (Composability)

```typescript
/**
 * Adapter registry for managing multiple platform adapters
 * Enables composability and portability
 */
class AdapterRegistry {
  private adapters: Map<Platform, PlatformAdapter> = new Map();
  private factories: Map<Platform, AdapterFactory> = new Map();
  
  /**
   * Register adapter factory for a platform
   */
  registerFactory(platform: Platform, factory: AdapterFactory): void {
    this.factories.set(platform, factory);
  }
  
  /**
   * Get or create adapter for platform
   */
  async getAdapter(
    platform: Platform,
    config: AdapterConfig
  ): Promise<PlatformAdapter> {
    if (!this.adapters.has(platform)) {
      const factory = this.factories.get(platform);
      if (!factory) {
        throw new Error(`No adapter factory registered for platform: ${platform}`);
      }
      const adapter = await factory.create(config);
      this.adapters.set(platform, adapter);
    }
    return this.adapters.get(platform)!;
  }
  
  /**
   * Get all registered adapters
   */
  getAllAdapters(): PlatformAdapter[] {
    return Array.from(this.adapters.values());
  }
  
  /**
   * Health check all adapters
   */
  async healthCheckAll(): Promise<Map<Platform, AdapterHealth>> {
    const results = new Map<Platform, AdapterHealth>();
    
    for (const [platform, adapter] of this.adapters.entries()) {
      try {
        const health = await adapter.healthCheck();
        results.set(platform, health);
      } catch (error) {
        results.set(platform, {
          status: 'unhealthy',
          last_check: new Date().toISOString(),
          response_time_ms: 0,
          errors: [(error as Error).message]
        });
      }
    }
    
    return results;
  }
  
  /**
   * Remove adapter
   */
  removeAdapter(platform: Platform): void {
    this.adapters.delete(platform);
  }
}

interface AdapterFactory {
  create(config: AdapterConfig): Promise<PlatformAdapter>;
}

// Factory implementations
class GitHubAdapterFactory implements AdapterFactory {
  async create(config: AdapterConfig): Promise<PlatformAdapter> {
    return new GitHubAdapter(config);
  }
}

class GitLabAdapterFactory implements AdapterFactory {
  async create(config: AdapterConfig): Promise<PlatformAdapter> {
    return new GitLabAdapter(config);
  }
}

// Initialize registry
const adapterRegistry = new AdapterRegistry();
adapterRegistry.registerFactory('github', new GitHubAdapterFactory());
adapterRegistry.registerFactory('gitlab', new GitLabAdapterFactory());
adapterRegistry.registerFactory('bitbucket', new BitbucketAdapterFactory());
adapterRegistry.registerFactory('azure-devops', new AzureDevOpsAdapterFactory());
```

---

## Normalized API Routes

```typescript
/**
 * Normalized API routes that work across all platforms
 * Ensures compatibility and portability
 */

// Base route handler interface
interface RouteHandler<TRequest = unknown, TResponse = unknown> {
  handle(request: TRequest, context: RouteContext): Promise<TResponse>;
}

interface RouteContext {
  adapter: PlatformAdapter;
  platform: Platform;
  user: User;
  correlation_id: string;
}

// Normalized PR routes
class PRRoutes {
  constructor(private adapterRegistry: AdapterRegistry) {}
  
  /**
   * Get PR (works for GitHub PR, GitLab MR, Bitbucket PR, Azure DevOps PR)
   */
  async getPR(
    platform: Platform,
    prId: string,
    context: RouteContext
  ): Promise<NormalizedPR> {
    const adapter = await this.adapterRegistry.getAdapter(platform, {
      platform,
      credentials: context.user.credentials[platform]
    });
    
    return adapter.getPR(prId);
  }
  
  /**
   * Post comment (works across all platforms)
   */
  async postComment(
    platform: Platform,
    prId: string,
    comment: NormalizedComment,
    context: RouteContext
  ): Promise<NormalizedComment> {
    const adapter = await this.adapterRegistry.getAdapter(platform, {
      platform,
      credentials: context.user.credentials[platform]
    });
    
    return adapter.postPRComment(prId, comment);
  }
  
  /**
   * Update status (works across all platforms)
   */
  async updateStatus(
    platform: Platform,
    prId: string,
    status: NormalizedStatus,
    context: RouteContext
  ): Promise<void> {
    const adapter = await this.adapterRegistry.getAdapter(platform, {
      platform,
      credentials: context.user.credentials[platform]
    });
    
    return adapter.updatePRStatus(prId, status);
  }
}

// Express/Fastify route definitions
app.get('/api/v1/:platform/prs/:prId', async (req, res) => {
  const platform = req.params.platform as Platform;
  const prId = req.params.prId;
  
  const context: RouteContext = {
    adapter: await adapterRegistry.getAdapter(platform, { platform, credentials: req.user.credentials[platform] }),
    platform,
    user: req.user,
    correlation_id: req.headers['x-correlation-id'] || crypto.randomUUID()
  };
  
  const pr = await prRoutes.getPR(platform, prId, context);
  res.json(pr);
});

app.post('/api/v1/:platform/prs/:prId/comments', async (req, res) => {
  const platform = req.params.platform as Platform;
  const prId = req.params.prId;
  const comment: NormalizedComment = req.body;
  
  const context: RouteContext = {
    adapter: await adapterRegistry.getAdapter(platform, { platform, credentials: req.user.credentials[platform] }),
    platform,
    user: req.user,
    correlation_id: req.headers['x-correlation-id'] || crypto.randomUUID()
  };
  
  const createdComment = await prRoutes.postComment(platform, prId, comment, context);
  res.json(createdComment);
});

app.post('/api/v1/:platform/prs/:prId/status', async (req, res) => {
  const platform = req.params.platform as Platform;
  const prId = req.params.prId;
  const status: NormalizedStatus = req.body;
  
  const context: RouteContext = {
    adapter: await adapterRegistry.getAdapter(platform, { platform, credentials: req.user.credentials[platform] }),
    platform,
    user: req.user,
    correlation_id: req.headers['x-correlation-id'] || crypto.randomUUID()
  };
  
  await prRoutes.updateStatus(platform, prId, status, context);
  res.status(204).send();
});
```

---

## Normalized Webhook Handler

```typescript
/**
 * Unified webhook handler that normalizes all platform webhooks
 * Ensures compatibility and composability
 */
class NormalizedWebhookHandler {
  constructor(private adapterRegistry: AdapterRegistry, private eventBus: EventBus) {}
  
  /**
   * Handle webhook from any platform
   */
  async handleWebhook(
    platform: Platform,
    payload: unknown,
    headers: Record<string, string>
  ): Promise<void> {
    // Get adapter for platform
    const adapter = await this.adapterRegistry.getAdapter(platform, {
      platform,
      credentials: {} // Webhooks don't need credentials
    });
    
    // Validate webhook
    const isValid = await adapter.validateWebhook(payload, headers);
    if (!isValid) {
      throw new Error(`Invalid webhook signature for platform: ${platform}`);
    }
    
    // Normalize webhook to common event format
    const normalizedEvent = await adapter.normalizeWebhook(payload, headers);
    
    // Publish to event bus (platform-agnostic)
    await this.eventBus.publish(normalizedEvent.type, normalizedEvent);
    
    // Log webhook
    this.logWebhook(platform, normalizedEvent);
  }
  
  private logWebhook(platform: Platform, event: NormalizedEvent): void {
    logger.info('Webhook received', {
      platform,
      event_type: event.type,
      correlation_id: event.correlation_id,
      timestamp: event.timestamp
    });
  }
}

// Webhook route (works for all platforms)
app.post('/webhooks/:platform', async (req, res) => {
  const platform = req.params.platform as Platform;
  const payload = req.body;
  const headers = req.headers as Record<string, string>;
  
  try {
    await webhookHandler.handleWebhook(platform, payload, headers);
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Webhook handling failed', {
      platform,
      error: (error as Error).message
    });
    res.status(400).json({ error: (error as Error).message });
  }
});
```

---

## Normalized WebSocket Service

```typescript
/**
 * Unified WebSocket service that abstracts platform-specific WebSocket implementations
 * Ensures compatibility and composability
 */
class NormalizedWebSocketService {
  private connections: Map<string, WebSocketConnection> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // resource_id -> connection_ids
  
  constructor(private adapterRegistry: AdapterRegistry) {}
  
  /**
   * Subscribe to updates for a resource (PR, pipeline, etc.)
   */
  async subscribe(
    platform: Platform,
    resourceId: string,
    connectionId: string,
    ws: WebSocket
  ): Promise<void> {
    // Get adapter for platform
    const adapter = await this.adapterRegistry.getAdapter(platform, {
      platform,
      credentials: {} // WebSocket connections handle auth separately
    });
    
    // Check if platform supports WebSockets
    const capabilities = adapter.getCapabilities();
    if (!capabilities.supports_websockets) {
      throw new Error(`Platform ${platform} does not support WebSockets`);
    }
    
    // Store connection
    this.connections.set(connectionId, {
      id: connectionId,
      platform,
      resource_id: resourceId,
      ws,
      created_at: new Date()
    });
    
    // Track subscription
    if (!this.subscriptions.has(resourceId)) {
      this.subscriptions.set(resourceId, new Set());
    }
    this.subscriptions.get(resourceId)!.add(connectionId);
    
    // Subscribe via adapter
    const subscription = await adapter.subscribeToUpdates(resourceId, (event) => {
      this.broadcastToSubscribers(resourceId, event);
    });
    
    // Store subscription for cleanup
    this.connections.get(connectionId)!.subscription = subscription;
  }
  
  /**
   * Unsubscribe from updates
   */
  async unsubscribe(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    
    // Unsubscribe via adapter
    if (connection.subscription) {
      const adapter = await this.adapterRegistry.getAdapter(connection.platform, {
        platform: connection.platform,
        credentials: {}
      });
      await adapter.unsubscribe(connection.subscription);
    }
    
    // Remove from subscriptions
    const subscribers = this.subscriptions.get(connection.resource_id);
    if (subscribers) {
      subscribers.delete(connectionId);
      if (subscribers.size === 0) {
        this.subscriptions.delete(connection.resource_id);
      }
    }
    
    // Remove connection
    this.connections.delete(connectionId);
  }
  
  /**
   * Broadcast event to all subscribers of a resource
   */
  private broadcastToSubscribers(
    resourceId: string,
    event: NormalizedEvent
  ): void {
    const subscribers = this.subscriptions.get(resourceId);
    if (!subscribers) return;
    
    const message = JSON.stringify({
      type: 'event',
      event: event.type,
      data: event.data,
      timestamp: event.timestamp,
      correlation_id: event.correlation_id
    });
    
    for (const connectionId of subscribers) {
      const connection = this.connections.get(connectionId);
      if (connection && connection.ws.readyState === WebSocket.OPEN) {
        try {
          connection.ws.send(message);
        } catch (error) {
          logger.error('Failed to send WebSocket message', {
            connection_id: connectionId,
            error: (error as Error).message
          });
        }
      }
    }
  }
  
  /**
   * Send message to specific connection
   */
  send(connectionId: string, message: unknown): void {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      throw new Error(`Connection ${connectionId} not found or not open`);
    }
    
    connection.ws.send(JSON.stringify(message));
  }
}

interface WebSocketConnection {
  id: string;
  platform: Platform;
  resource_id: string;
  ws: WebSocket;
  subscription?: Subscription;
  created_at: Date;
}

// WebSocket route (works for all platforms)
const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const platform = url.searchParams.get('platform') as Platform;
  const resourceId = url.searchParams.get('resource_id')!;
  const connectionId = crypto.randomUUID();
  
  try {
    await wsService.subscribe(platform, resourceId, connectionId, ws);
    
    ws.on('close', async () => {
      await wsService.unsubscribe(connectionId);
    });
    
    ws.on('error', (error) => {
      logger.error('WebSocket error', {
        connection_id: connectionId,
        error: error.message
      });
    });
  } catch (error) {
    ws.close(1011, (error as Error).message);
  }
});
```

---

## Event Bus (Composable)

```typescript
/**
 * Normalized event bus that works across all platforms
 * Ensures composability and loose coupling
 */
interface EventBus {
  publish(eventType: NormalizedEventType, event: NormalizedEvent): Promise<void>;
  subscribe(
    eventType: NormalizedEventType,
    handler: EventHandler
  ): Promise<EventSubscription>;
  unsubscribe(subscription: EventSubscription): Promise<void>;
}

type EventHandler = (event: NormalizedEvent) => Promise<void> | void;

interface EventSubscription {
  id: string;
  event_type: NormalizedEventType;
  handler: EventHandler;
  created_at: string;
}

class RedisEventBus implements EventBus {
  constructor(private redis: RedisClient) {}
  
  async publish(
    eventType: NormalizedEventType,
    event: NormalizedEvent
  ): Promise<void> {
    const channel = `events:${eventType}`;
    await this.redis.publish(channel, JSON.stringify(event));
  }
  
  async subscribe(
    eventType: NormalizedEventType,
    handler: EventHandler
  ): Promise<EventSubscription> {
    const subscription: EventSubscription = {
      id: crypto.randomUUID(),
      event_type: eventType,
      handler,
      created_at: new Date().toISOString()
    };
    
    const channel = `events:${eventType}`;
    const subscriber = this.redis.duplicate();
    
    await subscriber.subscribe(channel);
    subscriber.on('message', async (ch, message) => {
      if (ch === channel) {
        const event: NormalizedEvent = JSON.parse(message);
        await handler(event);
      }
    });
    
    return subscription;
  }
  
  async unsubscribe(subscription: EventSubscription): Promise<void> {
    // Implementation depends on Redis pub/sub
  }
}

// Service consumers (composable)
class ReviewGuardService {
  constructor(private eventBus: EventBus) {
    this.setupEventHandlers();
  }
  
  private async setupEventHandlers(): Promise<void> {
    // Subscribe to PR events (works for all platforms)
    await this.eventBus.subscribe('pr.opened', async (event) => {
      await this.handlePROpened(event);
    });
    
    await this.eventBus.subscribe('pr.updated', async (event) => {
      await this.handlePRUpdated(event);
    });
  }
  
  private async handlePROpened(event: NormalizedEvent): Promise<void> {
    const data = event.data as PROpenedEventData;
    const pr = data.pr;
    
    // Business logic is platform-agnostic
    const review = await this.analyzePR(pr);
    
    // Use adapter to post results (works for any platform)
    const adapter = await adapterRegistry.getAdapter(pr.platform, {
      platform: pr.platform,
      credentials: {}
    });
    
    await adapter.postPRComment(pr.id, {
      id: '',
      body: this.formatReviewSummary(review),
      author: { id: '', username: 'readylayer', name: 'ReadyLayer' },
      created_at: new Date().toISOString()
    });
  }
  
  private async analyzePR(pr: NormalizedPR): Promise<Review> {
    // Platform-agnostic analysis logic
    // ...
    return {} as Review;
  }
  
  private formatReviewSummary(review: Review): string {
    // Format review summary (works for all platforms)
    return `## ReadyLayer Review Summary\n\n...`;
  }
}
```

---

## Configuration Management (Portability)

```typescript
/**
 * Configuration management that supports multiple environments
 * Ensures portability across deployments
 */
interface AppConfig {
  adapters: Map<Platform, AdapterConfig>;
  event_bus: {
    type: 'redis' | 'rabbitmq' | 'kafka' | 'memory';
    config: Record<string, unknown>;
  };
  database: {
    type: 'postgresql' | 'mysql' | 'sqlite';
    connection_string: string;
  };
  websocket: {
    enabled: boolean;
    port: number;
    path: string;
  };
  api: {
    port: number;
    host: string;
    cors: {
      origins: string[];
      credentials: boolean;
    };
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    destination: 'stdout' | 'file' | 'syslog';
  };
}

class ConfigManager {
  /**
   * Load configuration from environment or config file
   * Supports multiple formats for portability
   */
  static loadConfig(): AppConfig {
    // Load from environment variables (12-factor app)
    const config: AppConfig = {
      adapters: this.loadAdapterConfigs(),
      event_bus: {
        type: (process.env.EVENT_BUS_TYPE || 'redis') as 'redis' | 'rabbitmq' | 'kafka' | 'memory',
        config: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD
        }
      },
      database: {
        type: (process.env.DB_TYPE || 'postgresql') as 'postgresql' | 'mysql' | 'sqlite',
        connection_string: process.env.DATABASE_URL || ''
      },
      websocket: {
        enabled: process.env.WEBSOCKET_ENABLED !== 'false',
        port: parseInt(process.env.WEBSOCKET_PORT || '8080'),
        path: process.env.WEBSOCKET_PATH || '/ws'
      },
      api: {
        port: parseInt(process.env.PORT || '3000'),
        host: process.env.HOST || '0.0.0.0',
        cors: {
          origins: (process.env.CORS_ORIGINS || '*').split(','),
          credentials: process.env.CORS_CREDENTIALS === 'true'
        }
      },
      logging: {
        level: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
        format: (process.env.LOG_FORMAT || 'json') as 'json' | 'text',
        destination: (process.env.LOG_DESTINATION || 'stdout') as 'stdout' | 'file' | 'syslog'
      }
    };
    
    return config;
  }
  
  private static loadAdapterConfigs(): Map<Platform, AdapterConfig> {
    const adapters = new Map<Platform, AdapterConfig>();
    
    // Load GitHub config
    if (process.env.GITHUB_APP_ID) {
      adapters.set('github', {
        platform: 'github',
        credentials: {
          app_id: process.env.GITHUB_APP_ID,
          private_key: process.env.GITHUB_PRIVATE_KEY,
          installation_id: process.env.GITHUB_INSTALLATION_ID
        },
        webhook_secret: process.env.GITHUB_WEBHOOK_SECRET
      });
    }
    
    // Load GitLab config
    if (process.env.GITLAB_TOKEN) {
      adapters.set('gitlab', {
        platform: 'gitlab',
        credentials: {
          token: process.env.GITLAB_TOKEN
        },
        webhook_secret: process.env.GITLAB_WEBHOOK_SECRET
      });
    }
    
    // Similar for other platforms...
    
    return adapters;
  }
}
```

---

## Docker/Kubernetes Deployment (Portability)

```yaml
# docker-compose.yml (Portable deployment)
version: '3.8'

services:
  api:
    image: readylayer/api:latest
    ports:
      - "${PORT:-3000}:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_HOST=${REDIS_HOST:-redis}
      - REDIS_PORT=${REDIS_PORT:-6379}
      - GITHUB_APP_ID=${GITHUB_APP_ID}
      - GITHUB_PRIVATE_KEY=${GITHUB_PRIVATE_KEY}
      - GITLAB_TOKEN=${GITLAB_TOKEN}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  websocket:
    image: readylayer/websocket:latest
    ports:
      - "${WEBSOCKET_PORT:-8080}:8080"
    environment:
      - REDIS_HOST=${REDIS_HOST:-redis}
      - REDIS_PORT=${REDIS_PORT:-6379}
    depends_on:
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=${POSTGRES_DB:-readylayer}
      - POSTGRES_USER=${POSTGRES_USER:-readylayer}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7
    restart: unless-stopped

volumes:
  postgres_data:
```

```yaml
# kubernetes/deployment.yaml (Portable orchestration)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: readylayer-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: readylayer-api
  template:
    metadata:
      labels:
        app: readylayer-api
    spec:
      containers:
      - name: api
        image: readylayer/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: readylayer-secrets
              key: database-url
        - name: REDIS_HOST
          value: "redis-service"
        - name: GITHUB_APP_ID
          valueFrom:
            secretKeyRef:
              name: readylayer-secrets
              key: github-app-id
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

---

## Summary

This architecture ensures:

### Compatibility
- ✅ Platform-agnostic core services
- ✅ Normalized interfaces across all platforms
- ✅ Version compatibility support
- ✅ Graceful degradation

### Portability
- ✅ Stateless services (deploy anywhere)
- ✅ Configuration-driven (12-factor app)
- ✅ Docker/Kubernetes ready
- ✅ Environment-agnostic

### Composability
- ✅ Adapter pattern (isolate platform-specific code)
- ✅ Event-driven architecture (loose coupling)
- ✅ Modular services (compose as needed)
- ✅ Plugin architecture (extensible)

All platform integrations use the same normalized interfaces, making the system:
- **Compatible** across GitHub, GitLab, Bitbucket, Azure DevOps
- **Portable** across cloud, on-prem, hybrid deployments
- **Composable** with services that can be combined in different ways
