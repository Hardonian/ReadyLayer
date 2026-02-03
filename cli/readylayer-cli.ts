#!/usr/bin/env node
/**
 * ReadyLayer CLI
 * 
 * Command-line interface for ReadyLayer with support for:
 * - Codex (OpenAI)
 * - Claude (Anthropic)
 * - OSS LLMs (Ollama, LocalAI, etc.)
 * - Cursor integration
 * - Tabnine agent integration
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { createConsoleAdapter, createLogger } from '../lib/cli/logger';
import { getJobForgeAdapter } from '../lib/jobforge/adapter';
import { redactSecrets } from '../lib/secrets/redaction';

const program = new Command();
const log = createLogger('cli');
const console = createConsoleAdapter(log);

interface LLMProvider {
  name: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

interface ReadyLayerConfig {
  apiKey: string;
  apiUrl?: string;
  repositoryId?: string;
  llmProvider?: LLMProvider;
}

interface JobForgeCommandOptions {
  tenant: string;
  project: string;
}

function parseJsonArgument(value?: string): Record<string, unknown> {
  if (!value) return {};
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSON input must be an object');
  }
  return parsed as Record<string, unknown>;
}

function safeCliError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return redactSecrets(message, { logDetections: false }).redacted;
}

// Load config from file or environment
function loadConfig(): ReadyLayerConfig {
  const configPath = path.join(process.cwd(), '.readylayer.json');
  const envApiKey = process.env.READYLAYER_API_KEY;
  const envApiUrl = process.env.READYLAYER_API_URL || 'https://api.readylayer.com';

  if (fs.existsSync(configPath)) {
     
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Partial<ReadyLayerConfig>;
    return {
      apiKey: (config.apiKey as string | undefined) || envApiKey || '',
      apiUrl: (config.apiUrl as string | undefined) || envApiUrl,
      repositoryId: config.repositoryId as string | undefined,
      llmProvider: config.llmProvider as LLMProvider | undefined,
    };
  }

  return {
    apiKey: envApiKey || '',
    apiUrl: envApiUrl,
  };
}

interface ReviewOptions {
  repository?: string;
  ref?: string;
}

// Review file
async function reviewFile(filePath: string, options: ReviewOptions): Promise<void> {
  const config = loadConfig();
  
  if (!config.apiKey) {
     
    console.error('Error: READYLAYER_API_KEY not set. Set it in .readylayer.json or environment.');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
     
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const repositoryId = options.repository ?? config.repositoryId;

  if (!repositoryId) {
     
    console.error('Error: Repository ID required. Use --repository or set in .readylayer.json');
    process.exit(1);
  }

  console.log(`Reviewing ${filePath}...`);

  try {
    const response = await fetch(`${config.apiUrl}/api/v1/reviews`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repositoryId,
        filePath,
        fileContent,
        ref: options.ref ?? 'HEAD',
      }),
    });

    if (!response.ok) {
       
      const error = await response.json() as { error?: { message?: string } };
       
      console.error(`Error: ${error.error?.message ?? response.statusText}`);
      process.exit(1);
    }

     
    const result = await response.json() as {
      data?: {
        status?: string;
        issuesCount?: number;
        issues?: Array<{
          severity: string;
          ruleId: string;
          file: string;
          line: number;
          message: string;
          fix?: string;
        }>;
        isBlocked?: boolean;
      };
    };
    console.log('\nReview Results:');
    console.log(`Status: ${result.data?.status ?? 'unknown'}`);
    console.log(`Issues Found: ${result.data?.issuesCount ?? 0}`);
    
    if (result.data?.issues && result.data.issues.length > 0) {
      console.log('\nIssues:');
      result.data.issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.severity.toUpperCase()}: ${issue.ruleId}`);
        console.log(`   File: ${issue.file}:${issue.line}`);
        console.log(`   Message: ${issue.message}`);
        if (issue.fix) {
          console.log(`   Fix: ${issue.fix}`);
        }
      });
    }

    if (result.data?.isBlocked) {
      console.log('\n⚠️  PR would be blocked due to policy violations');
      process.exit(1);
    } else {
      console.log('\n✅ Review passed');
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

interface TestOptions {
  repository?: string;
  framework?: string;
  output?: string;
}

// Generate tests
async function generateTests(filePath: string, options: TestOptions): Promise<void> {
  const config = loadConfig();
  
  if (!config.apiKey) {
     
    console.error('Error: READYLAYER_API_KEY not set');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
     
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const repositoryId = options.repository ?? config.repositoryId;

  if (!repositoryId) {
     
    console.error('Error: Repository ID required');
    process.exit(1);
  }

  console.log(`Generating tests for ${filePath}...`);

  try {
    const response = await fetch(`${config.apiUrl}/api/v1/test/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repositoryId,
        filePath,
        fileContent,
        framework: options.framework ?? 'auto',
      }),
    });

    if (!response.ok) {
       
      const error = await response.json() as { error?: { message?: string } };
       
      console.error(`Error: ${error.error?.message ?? response.statusText}`);
      process.exit(1);
    }

     
    const result = await response.json() as {
      data?: {
        testContent?: string;
        placement?: string;
        framework?: string;
      };
    };
    
    if (result.data?.testContent) {
      const outputPath = options.output ?? result.data.placement ?? `${filePath}.test.ts`;
      fs.writeFileSync(outputPath, result.data.testContent);
      console.log(`\n✅ Tests generated: ${outputPath}`);
      console.log(`Framework: ${result.data.framework ?? 'unknown'}`);
      console.log(`Placement: ${result.data.placement ?? 'unknown'}`);
    } else {
      console.log('\n⚠️  No tests generated');
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Initialize config
function initConfig(): void {
  const configPath = path.join(process.cwd(), '.readylayer.json');
  
  if (fs.existsSync(configPath)) {
    console.log('.readylayer.json already exists');
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const config: ReadyLayerConfig = {
    apiKey: '',
    apiUrl: 'https://api.readylayer.com',
  };

  rl.question('ReadyLayer API Key: ', (apiKey) => {
    config.apiKey = apiKey;
    
    rl.question('Repository ID (optional): ', (repoId) => {
      if (repoId) {
        config.repositoryId = repoId;
      }
      
      rl.question('LLM Provider (codex/claude/ollama/none): ', (provider) => {
        if (provider && provider !== 'none') {
          config.llmProvider = {
            name: provider,
          };
          
          if (provider === 'codex') {
            rl.question('OpenAI API Key: ', (key) => {
              config.llmProvider!.apiKey = key;
              finishConfig(config, rl);
            });
          } else if (provider === 'claude') {
            rl.question('Anthropic API Key: ', (key) => {
              config.llmProvider!.apiKey = key;
              finishConfig(config, rl);
            });
          } else if (provider === 'ollama') {
            rl.question('Ollama Base URL (default: http://localhost:11434): ', (url) => {
              config.llmProvider!.baseUrl = url || 'http://localhost:11434';
              rl.question('Model name (default: llama2): ', (model) => {
                config.llmProvider!.model = model || 'llama2';
                finishConfig(config, rl);
              });
            });
          } else {
            finishConfig(config, rl);
          }
        } else {
          finishConfig(config, rl);
        }
      });
    });
  });
}

function finishConfig(config: ReadyLayerConfig, rl: readline.Interface): void {
  const configPath = path.join(process.cwd(), '.readylayer.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`\n✅ Configuration saved to ${configPath}`);
  rl.close();
}

// Setup program
program
  .name('readylayer')
  .description('ReadyLayer CLI - Code review, test generation, and policy enforcement')
  .version('1.0.0');

program
  .command('review <file>')
  .description('Review a file for policy violations')
  .option('-r, --repository <id>', 'Repository ID')
  .option('--ref <ref>', 'Git ref (branch or commit SHA)', 'HEAD')
  .action(reviewFile);

program
  .command('test <file>')
  .description('Generate tests for a file')
  .option('-r, --repository <id>', 'Repository ID')
  .option('-f, --framework <framework>', 'Test framework (jest, mocha, pytest, etc.)', 'auto')
  .option('-o, --output <path>', 'Output file path')
  .action(generateTests);

program
  .command('init')
  .description('Initialize ReadyLayer configuration')
  .action(initConfig);

program
  .command('config')
  .description('Show current configuration')
  .action(() => {
    const config = loadConfig();
    console.log(JSON.stringify(config, null, 2));
  });

const jobforge = program
  .command('jobforge')
  .description('JobForge admin commands (requires JOBFORGE_INTEGRATION_ENABLED=1)');

jobforge
  .command('submit-event')
  .description('Submit a webhook event to JobForge')
  .requiredOption('--tenant <id>', 'Tenant (organization) ID')
  .requiredOption('--project <id>', 'Project (repository) ID')
  .requiredOption('--target-url <url>', 'Webhook target URL')
  .requiredOption('--event-type <type>', 'Event type')
  .option('--data <json>', 'Event data JSON', '{}')
  .option('--secret-ref <ref>', 'Secret reference for signing')
  .option('--timeout-ms <ms>', 'Timeout in milliseconds', '10000')
  .action(async (options: JobForgeCommandOptions & { targetUrl: string; eventType: string; data?: string; secretRef?: string; timeoutMs?: string }) => {
    try {
      const adapter = getJobForgeAdapter();
      const result = await adapter.submitEvent({
        tenantId: options.tenant,
        projectId: options.project,
        targetUrl: options.targetUrl,
        eventType: options.eventType,
        data: parseJsonArgument(options.data),
        secretRef: options.secretRef,
        timeoutMs: options.timeoutMs ? Number(options.timeoutMs) : undefined,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(`Error: ${safeCliError(error)}`);
      process.exit(1);
    }
  });

jobforge
  .command('module-dry-run')
  .description('Run a JobForge module dry-run')
  .requiredOption('--tenant <id>', 'Tenant (organization) ID')
  .requiredOption('--project <id>', 'Project (repository) ID')
  .requiredOption('--module <name>', 'Module name')
  .option('--input <json>', 'Module input JSON', '{}')
  .action(async (options: JobForgeCommandOptions & { module: string; input?: string }) => {
    try {
      const adapter = getJobForgeAdapter();
      const result = await adapter.runModuleDryRun({
        tenantId: options.tenant,
        projectId: options.project,
        moduleName: options.module,
        input: parseJsonArgument(options.input),
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(`Error: ${safeCliError(error)}`);
      process.exit(1);
    }
  });

jobforge
  .command('report')
  .description('Fetch a JobForge report result')
  .requiredOption('--tenant <id>', 'Tenant (organization) ID')
  .requiredOption('--project <id>', 'Project (repository) ID')
  .requiredOption('--result-id <id>', 'JobForge result ID')
  .action(async (options: JobForgeCommandOptions & { resultId: string }) => {
    try {
      const adapter = getJobForgeAdapter();
      const result = await adapter.getReport({
        tenantId: options.tenant,
        projectId: options.project,
        resultId: options.resultId,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(`Error: ${safeCliError(error)}`);
      process.exit(1);
    }
  });

jobforge
  .command('bundle-execute')
  .description('Request bundle execution (gated) via JobForge')
  .requiredOption('--tenant <id>', 'Tenant (organization) ID')
  .requiredOption('--project <id>', 'Project (repository) ID')
  .requiredOption('--bundle-id <id>', 'Bundle ID')
  .option('--bundle-type <type>', 'Bundle type')
  .option('--inputs <json>', 'Bundle inputs JSON', '{}')
  .option('--execute', 'Execute the bundle (requires JOBFORGE_BUNDLE_EXECUTION_ENABLED=1)', false)
  .action(async (options: JobForgeCommandOptions & { bundleId: string; bundleType?: string; inputs?: string; execute?: boolean }) => {
    try {
      const adapter = getJobForgeAdapter();
      const result = await adapter.requestBundleExecution({
        tenantId: options.tenant,
        projectId: options.project,
        bundleId: options.bundleId,
        bundleType: options.bundleType,
        inputs: parseJsonArgument(options.inputs),
        execute: Boolean(options.execute),
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(`Error: ${safeCliError(error)}`);
      process.exit(1);
    }
  });

// Cursor integration command
program
  .command('cursor')
  .description('Cursor IDE integration commands')
  .command('install')
  .description('Install Cursor integration')
  .action(() => {
    console.log('Installing Cursor integration...');
    // Create Cursor config file
    const cursorConfig = {
      readyLayer: {
        enabled: true,
        apiKey: loadConfig().apiKey,
      },
    };
    const cursorConfigPath = path.join(process.cwd(), '.cursor', 'readylayer.json');
    fs.mkdirSync(path.dirname(cursorConfigPath), { recursive: true });
    fs.writeFileSync(cursorConfigPath, JSON.stringify(cursorConfig, null, 2));
    console.log('✅ Cursor integration installed');
  });

// Tabnine integration command
program
  .command('tabnine')
  .description('Tabnine agent integration commands')
  .command('install')
  .description('Install Tabnine agent integration')
  .action(() => {
    console.log('Installing Tabnine agent integration...');
    // Create Tabnine config
    const tabnineConfig = {
      readyLayer: {
        enabled: true,
        apiKey: loadConfig().apiKey,
        autoReview: true,
      },
    };
    const tabnineConfigPath = path.join(process.cwd(), '.tabnine', 'readylayer.json');
    fs.mkdirSync(path.dirname(tabnineConfigPath), { recursive: true });
    fs.writeFileSync(tabnineConfigPath, JSON.stringify(tabnineConfig, null, 2));
    console.log('✅ Tabnine agent integration installed');
  });

program.parse(process.argv);
