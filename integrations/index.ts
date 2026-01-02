/**
 * Integrations Index
 * 
 * Central export point for all integrations
 * Using explicit exports to avoid naming conflicts
 */

// GitHub exports
export { githubWebhookHandler, type GitHubWebhookEvent, type NormalizedEvent as GitHubNormalizedEvent } from './github/webhook';
export { githubAPIClient, type WorkflowRun, type WorkflowArtifact, type WorkflowDispatchInputs } from './github/api-client';
export type { CheckRunAnnotation as GitHubCheckRunAnnotation, CheckRunDetails as GitHubCheckRunDetails } from './github/api-client';

// GitLab exports  
export { gitlabWebhookHandler, type NormalizedEvent as GitLabNormalizedEvent } from './gitlab/webhook';
export { gitlabAPIClient, type Pipeline as GitLabPipeline, type PipelineVariable as GitLabPipelineVariable } from './gitlab/api-client';

// Bitbucket exports
export { bitbucketWebhookHandler, type NormalizedEvent as BitbucketNormalizedEvent } from './bitbucket/webhook';
export { bitbucketAPIClient, type Pipeline as BitbucketPipeline, type PipelineVariable as BitbucketPipelineVariable } from './bitbucket/api-client';

// Adapter exports
export * from './git-provider-adapter';
export * from './git-provider-pr-adapter';
