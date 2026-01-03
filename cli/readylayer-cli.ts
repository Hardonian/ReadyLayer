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

const program = new Command();

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

// Load config from file or environment
function loadConfig(): ReadyLayerConfig {
  const configPath = path.join(process.cwd(), '.readylayer.json');
  const envApiKey = process.env.READYLAYER_API_KEY;
  const envApiUrl = process.env.READYLAYER_API_URL || 'https://api.readylayer.com';

  if (fs.existsSync(configPath)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
async function reviewFile(filePath: string, options: ReviewOptions) {
  const config = loadConfig();
  
  if (!config.apiKey) {
    // eslint-disable-next-line no-console
    console.error('Error: READYLAYER_API_KEY not set. Set it in .readylayer.json or environment.');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    // eslint-disable-next-line no-console
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const repositoryId = options.repository ?? config.repositoryId;

  if (!repositoryId) {
    // eslint-disable-next-line no-console
    console.error('Error: Repository ID required. Use --repository or set in .readylayer.json');
    process.exit(1);
  }

  // eslint-disable-next-line no-console
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const error = await response.json() as { error?: { message?: string } };
      // eslint-disable-next-line no-console
      console.error(`Error: ${error.error?.message ?? response.statusText}`);
      process.exit(1);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
    // eslint-disable-next-line no-console
    console.log('\nReview Results:');
    // eslint-disable-next-line no-console
    console.log(`Status: ${result.data?.status ?? 'unknown'}`);
    // eslint-disable-next-line no-console
    console.log(`Issues Found: ${result.data?.issuesCount ?? 0}`);
    
    if (result.data?.issues && result.data.issues.length > 0) {
      // eslint-disable-next-line no-console
      console.log('\nIssues:');
      result.data.issues.forEach((issue, index) => {
        // eslint-disable-next-line no-console
        console.log(`\n${index + 1}. ${issue.severity.toUpperCase()}: ${issue.ruleId}`);
        // eslint-disable-next-line no-console
        console.log(`   File: ${issue.file}:${issue.line}`);
        // eslint-disable-next-line no-console
        console.log(`   Message: ${issue.message}`);
        if (issue.fix) {
          // eslint-disable-next-line no-console
          console.log(`   Fix: ${issue.fix}`);
        }
      });
    }

    if (result.data?.isBlocked) {
      // eslint-disable-next-line no-console
      console.log('\n⚠️  PR would be blocked due to policy violations');
      process.exit(1);
    } else {
      // eslint-disable-next-line no-console
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
async function generateTests(filePath: string, options: TestOptions) {
  const config = loadConfig();
  
  if (!config.apiKey) {
    // eslint-disable-next-line no-console
    console.error('Error: READYLAYER_API_KEY not set');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    // eslint-disable-next-line no-console
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const repositoryId = options.repository ?? config.repositoryId;

  if (!repositoryId) {
    // eslint-disable-next-line no-console
    console.error('Error: Repository ID required');
    process.exit(1);
  }

  // eslint-disable-next-line no-console
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const error = await response.json() as { error?: { message?: string } };
      // eslint-disable-next-line no-console
      console.error(`Error: ${error.error?.message ?? response.statusText}`);
      process.exit(1);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
      // eslint-disable-next-line no-console
      console.log(`\n✅ Tests generated: ${outputPath}`);
      // eslint-disable-next-line no-console
      console.log(`Framework: ${result.data.framework ?? 'unknown'}`);
      // eslint-disable-next-line no-console
      console.log(`Placement: ${result.data.placement ?? 'unknown'}`);
    } else {
      // eslint-disable-next-line no-console
      console.log('\n⚠️  No tests generated');
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Initialize config
function initConfig() {
  const configPath = path.join(process.cwd(), '.readylayer.json');
  
  if (fs.existsSync(configPath)) {
    // eslint-disable-next-line no-console
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

function finishConfig(config: ReadyLayerConfig, rl: readline.Interface) {
  const configPath = path.join(process.cwd(), '.readylayer.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  // eslint-disable-next-line no-console
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
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(config, null, 2));
  });

// Cursor integration command
program
  .command('cursor')
  .description('Cursor IDE integration commands')
  .command('install')
  .description('Install Cursor integration')
  .action(() => {
    // eslint-disable-next-line no-console
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
    // eslint-disable-next-line no-console
    console.log('✅ Cursor integration installed');
  });

// Tabnine integration command
program
  .command('tabnine')
  .description('Tabnine agent integration commands')
  .command('install')
  .description('Install Tabnine agent integration')
  .action(() => {
    // eslint-disable-next-line no-console
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
    // eslint-disable-next-line no-console
    console.log('✅ Tabnine agent integration installed');
  });

program.parse(process.argv);
