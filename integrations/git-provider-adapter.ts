/**
 * Git Provider Adapter
 * 
 * Provider-agnostic abstraction for Git host operations
 */

import { githubAPIClient } from './github/api-client';
import { gitlabAPIClient } from './gitlab/api-client';
import { bitbucketAPIClient } from './bitbucket/api-client';

export type GitProvider = 'github' | 'gitlab' | 'bitbucket';

export interface PipelineVariable {
  key: string;
  value: string;
}

export interface PipelineRun {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped';
  url?: string;
  sha: string;
}

export interface GitProviderAdapter {
  /**
   * Trigger a CI/CD pipeline/workflow
   */
  triggerPipeline(
    repo: string,
    ref: string,
    token: string,
    variables?: PipelineVariable[]
  ): Promise<PipelineRun>;

  /**
   * Get pipeline/workflow run details
   */
  getPipelineRun(repo: string, runId: string, token: string): Promise<PipelineRun>;

  /**
   * List pipeline/workflow runs
   */
  listPipelineRuns(repo: string, token: string, ref?: string): Promise<PipelineRun[]>;

  /**
   * Get pipeline artifacts
   */
  getPipelineArtifacts(repo: string, runId: string, token: string): Promise<Blob | null>;
}

/**
 * GitHub Adapter Implementation
 */
class GitHubAdapter implements GitProviderAdapter {
  async triggerPipeline(
    repo: string,
    ref: string,
    token: string,
    variables: PipelineVariable[] = []
  ): Promise<PipelineRun> {
    // GitHub uses workflow_dispatch
    // For MVP, we'll use a default workflow ID
    const workflowId = '.github/workflows/readylayer-tests.yml';
    
    await githubAPIClient.dispatchWorkflow(
      repo,
      workflowId,
      ref,
      Object.fromEntries(variables.map(v => [v.key, v.value])),
      token
    );

    // Get the workflow run that was just created
    const runs = await githubAPIClient.listWorkflowRuns(repo, workflowId, ref, token);
    const run = runs.workflow_runs?.[0];

    if (!run) {
      throw new Error('Failed to get workflow run after dispatch');
    }

    return {
      id: String(run.id),
      status: run.status === 'completed' ? 'completed' : run.status === 'in_progress' ? 'in_progress' : 'pending',
      conclusion: run.conclusion || undefined,
      url: run.html_url,
      sha: run.head_sha,
    };
  }

  async getPipelineRun(repo: string, runId: string, token: string): Promise<PipelineRun> {
    const run = await githubAPIClient.getWorkflowRun(repo, parseInt(runId, 10), token);
    return {
      id: String(run.id),
      status: run.status === 'completed' ? 'completed' : run.status === 'in_progress' ? 'in_progress' : 'pending',
      conclusion: run.conclusion || undefined,
      url: run.html_url,
      sha: run.head_sha,
    };
  }

  async listPipelineRuns(repo: string, token: string, ref?: string): Promise<PipelineRun[]> {
    const workflowId = '.github/workflows/readylayer-tests.yml';
    const runs = await githubAPIClient.listWorkflowRuns(repo, workflowId, ref, token);
    return (runs.workflow_runs || []).map(run => ({
      id: String(run.id),
      status: run.status === 'completed' ? 'completed' : run.status === 'in_progress' ? 'in_progress' : 'pending',
      conclusion: run.conclusion || undefined,
      url: run.html_url,
      sha: run.head_sha,
    }));
  }

  async getPipelineArtifacts(repo: string, runId: string, token: string): Promise<Blob | null> {
    try {
      const artifacts = await githubAPIClient.listWorkflowRunArtifacts(repo, parseInt(runId, 10), token);
      if (artifacts.artifacts && artifacts.artifacts.length > 0) {
        const artifact = artifacts.artifacts[0];
        const arrayBuffer = await githubAPIClient.downloadArtifact(repo, artifact.id, token);
        return new Blob([arrayBuffer]);
      }
    } catch (error) {
      // Return null if artifacts not found
    }
    return null;
  }
}

/**
 * GitLab Adapter Implementation
 */
class GitLabAdapter implements GitProviderAdapter {
  async triggerPipeline(
    repo: string,
    ref: string,
    token: string,
    variables: PipelineVariable[] = []
  ): Promise<PipelineRun> {
    const pipeline = await gitlabAPIClient.triggerPipeline(repo, ref, token, variables);
    return {
      id: String(pipeline.id),
      status: pipeline.status === 'success' ? 'completed' : pipeline.status === 'failed' ? 'failed' : pipeline.status === 'running' ? 'in_progress' : 'pending',
      conclusion: pipeline.status === 'success' ? 'success' : pipeline.status === 'failed' ? 'failure' : undefined,
      url: pipeline.web_url,
      sha: pipeline.sha,
    };
  }

  async getPipelineRun(repo: string, runId: string, token: string): Promise<PipelineRun> {
    const pipeline = await gitlabAPIClient.getPipeline(repo, parseInt(runId, 10), token);
    return {
      id: String(pipeline.id),
      status: pipeline.status === 'success' ? 'completed' : pipeline.status === 'failed' ? 'failed' : pipeline.status === 'running' ? 'in_progress' : 'pending',
      conclusion: pipeline.status === 'success' ? 'success' : pipeline.status === 'failed' ? 'failure' : undefined,
      url: pipeline.web_url,
      sha: pipeline.sha,
    };
  }

  async listPipelineRuns(repo: string, token: string, ref?: string): Promise<PipelineRun[]> {
    const pipelines = await gitlabAPIClient.listPipelines(repo, token, ref);
    return pipelines.map(pipeline => ({
      id: String(pipeline.id),
      status: pipeline.status === 'success' ? 'completed' : pipeline.status === 'failed' ? 'failed' : pipeline.status === 'running' ? 'in_progress' : 'pending',
      conclusion: pipeline.status === 'success' ? 'success' : pipeline.status === 'failed' ? 'failure' : undefined,
      url: pipeline.web_url,
      sha: pipeline.sha,
    }));
  }

  async getPipelineArtifacts(repo: string, runId: string, token: string): Promise<Blob | null> {
    try {
      // GitLab requires a job name - we'll try common ones
      const jobNames = ['test', 'tests', 'coverage', 'build'];
      for (const jobName of jobNames) {
        try {
          return await gitlabAPIClient.getPipelineArtifacts(repo, parseInt(runId, 10), jobName, token);
        } catch {
          // Try next job name
        }
      }
    } catch (error) {
      // Return null if artifacts not found
    }
    return null;
  }
}

/**
 * Bitbucket Adapter Implementation
 */
class BitbucketAdapter implements GitProviderAdapter {
  private parseRepo(repo: string): { workspace: string; repoSlug: string } {
    const [workspace, repoSlug] = repo.split('/');
    return { workspace, repoSlug };
  }

  async triggerPipeline(
    repo: string,
    ref: string,
    token: string,
    variables: PipelineVariable[] = []
  ): Promise<PipelineRun> {
    const { workspace, repoSlug } = this.parseRepo(repo);
    const pipeline = await bitbucketAPIClient.triggerPipeline(workspace, repoSlug, ref, token, variables);
    return {
      id: pipeline.uuid,
      status: pipeline.state.name === 'SUCCESSFUL' ? 'completed' : pipeline.state.name === 'FAILED' ? 'failed' : pipeline.state.name === 'INPROGRESS' ? 'in_progress' : 'pending',
      conclusion: pipeline.state.name === 'SUCCESSFUL' ? 'success' : pipeline.state.name === 'FAILED' ? 'failure' : undefined,
      sha: pipeline.commit.hash,
    };
  }

  async getPipelineRun(repo: string, runId: string, token: string): Promise<PipelineRun> {
    const { workspace, repoSlug } = this.parseRepo(repo);
    const pipeline = await bitbucketAPIClient.getPipeline(workspace, repoSlug, runId, token);
    return {
      id: pipeline.uuid,
      status: pipeline.state.name === 'SUCCESSFUL' ? 'completed' : pipeline.state.name === 'FAILED' ? 'failed' : pipeline.state.name === 'INPROGRESS' ? 'in_progress' : 'pending',
      conclusion: pipeline.state.name === 'SUCCESSFUL' ? 'success' : pipeline.state.name === 'FAILED' ? 'failure' : undefined,
      sha: pipeline.commit.hash,
    };
  }

  async listPipelineRuns(repo: string, token: string, ref?: string): Promise<PipelineRun[]> {
    const { workspace, repoSlug } = this.parseRepo(repo);
    const response = await bitbucketAPIClient.listPipelines(workspace, repoSlug, token, ref);
    return (response.values || []).map(pipeline => ({
      id: pipeline.uuid,
      status: pipeline.state.name === 'SUCCESSFUL' ? 'completed' : pipeline.state.name === 'FAILED' ? 'failed' : pipeline.state.name === 'INPROGRESS' ? 'in_progress' : 'pending',
      conclusion: pipeline.state.name === 'SUCCESSFUL' ? 'success' : pipeline.state.name === 'FAILED' ? 'failure' : undefined,
      sha: pipeline.commit.hash,
    }));
  }

  async getPipelineArtifacts(repo: string, runId: string, token: string): Promise<Blob | null> {
    try {
      const { workspace, repoSlug } = this.parseRepo(repo);
      return await bitbucketAPIClient.getPipelineArtifacts(workspace, repoSlug, runId, token);
    } catch (error) {
      // Return null if artifacts not found
    }
    return null;
  }
}

/**
 * Get adapter for provider
 */
export function getGitProviderAdapter(provider: GitProvider): GitProviderAdapter {
  switch (provider) {
    case 'github':
      return new GitHubAdapter();
    case 'gitlab':
      return new GitLabAdapter();
    case 'bitbucket':
      return new BitbucketAdapter();
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
