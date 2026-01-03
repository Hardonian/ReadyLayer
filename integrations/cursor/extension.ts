/**
 * Cursor IDE Integration
 * 
 * ReadyLayer extension for Cursor IDE
 * Provides inline code review, test generation, and policy enforcement
 */

// Type declarations for Cursor IDE global API
declare const cursor: {
  commands: {
    registerCommand(command: string, callback: (...args: unknown[]) => Promise<void> | void): void;
  };
  activeEditor?: {
    document: {
      uri: {
        fsPath: string;
      };
    };
  };
  window: {
    showInformationMessage(message: string, ...actions: string[]): Promise<string | undefined> | void;
    showWarningMessage(message: string, ...actions: string[]): Promise<string | undefined>;
    showErrorMessage(message: string): void;
    createOutputChannel(name: string): {
      clear(): void;
      appendLine(text: string): void;
      show(): void;
    };
    showTextDocument(document: { uri: { fsPath: string } }): Promise<void> | void;
  };
  workspace: {
    fs: {
      readFile(path: string): Promise<Uint8Array>;
    };
    onDidSaveTextDocument(callback: (document: { uri: { fsPath: string } }) => void | Promise<void>): void;
    onDidOpenTextDocument(callback: (document: { uri: { fsPath: string } }) => void | Promise<void>): void;
    openTextDocument(pathOrOptions: string | { content: string; language?: string }): Promise<{ uri: { fsPath: string } }>;
  };
  languages: {
    createDiagnosticCollection(name: string): {
      set(uri: { fsPath: string }, diagnostics: Array<{
        range: { start: { line: number; character: number }; end: { line: number; character: number } };
        message: string;
        severity: number;
        source?: string;
      }>): void;
    };
  };
  Range: new (startLine: number, startChar: number, endLine: number, endChar: number) => {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  DiagnosticSeverity: {
    Error: number;
    Warning: number;
    Information: number;
    Hint: number;
  };
  env: {
    openExternal(url: string): void;
  };
};

interface CursorConfig {
  readyLayer: {
    enabled: boolean;
    apiKey: string;
    apiUrl?: string;
    autoReview?: boolean;
    showInlineDiagnostics?: boolean;
  };
}

/**
 * Initialize ReadyLayer integration in Cursor
 */
export function initializeReadyLayer(config: CursorConfig) {
  if (!config.readyLayer.enabled) {
    return;
  }

  // Register Cursor commands
  registerCommands(config);
  
  // Setup file watchers for auto-review
  if (config.readyLayer.autoReview) {
    setupFileWatchers(config);
  }

  // Setup inline diagnostics
  if (config.readyLayer.showInlineDiagnostics !== false) {
    setupInlineDiagnostics(config);
  }
}

/**
 * Register Cursor commands
 */
function registerCommands(config: CursorConfig) {
  // Command: Review Current File
  cursor.commands.registerCommand('readylayer.reviewFile', async () => {
    const activeFile = cursor.activeEditor?.document;
    if (!activeFile) {
      cursor.window.showErrorMessage('No active file');
      return;
    }

    await reviewFile(activeFile.uri.fsPath, config);
  });

  // Command: Generate Tests
  cursor.commands.registerCommand('readylayer.generateTests', async () => {
    const activeFile = cursor.activeEditor?.document;
    if (!activeFile) {
      cursor.window.showErrorMessage('No active file');
      return;
    }

    await generateTests(activeFile.uri.fsPath, config);
  });

  // Command: Open Dashboard
  cursor.commands.registerCommand('readylayer.openDashboard', () => {
    cursor.env.openExternal('https://readylayer.com/dashboard');
  });
}

/**
 * Review a file
 */
async function reviewFile(filePath: string, config: CursorConfig) {
  const fileContent = await cursor.workspace.fs.readFile(filePath);
  const content = new TextDecoder().decode(fileContent);

  cursor.window.showInformationMessage('Reviewing file...');

  try {
    const response = await fetch(`${config.readyLayer.apiUrl || 'https://api.readylayer.com'}/api/v1/ide/review`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.readyLayer.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repositoryId: getRepositoryId(),
        filePath,
        fileContent: content,
      }),
    });

    if (!response.ok) {
      throw new Error(`Review failed: ${response.statusText}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await response.json() as {
      data?: {
        issuesCount?: number;
        issues?: unknown[];
      };
    };
    
    if ((result.data?.issuesCount ?? 0) > 0) {
      cursor.window.showWarningMessage(
        `Found ${result.data?.issuesCount ?? 0} issue(s)`,
        'View Details'
      ).then((action: string | undefined) => {
        if (action === 'View Details' && result.data?.issues) {
          showIssuesPanel(result.data.issues as Issue[]);
        }
      });
    } else {
      cursor.window.showInformationMessage('✅ Review passed - no issues found');
    }
  } catch (error) {
    cursor.window.showErrorMessage(`Review failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate tests for a file
 */
async function generateTests(filePath: string, config: CursorConfig) {
  const fileContent = await cursor.workspace.fs.readFile(filePath);
  const content = new TextDecoder().decode(fileContent);

  cursor.window.showInformationMessage('Generating tests...');

  try {
    const response = await fetch(`${config.readyLayer.apiUrl || 'https://api.readylayer.com'}/api/v1/ide/test`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.readyLayer.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repositoryId: getRepositoryId(),
        filePath,
        fileContent: content,
      }),
    });

    if (!response.ok) {
      throw new Error(`Test generation failed: ${response.statusText}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await response.json() as {
      data?: {
        testContent?: string;
        placement?: string;
      };
    };
    
    if (result.data?.testContent) {
      // Show test preview
      showTestPreview(result.data.testContent, result.data.placement ?? '');
    } else {
      cursor.window.showWarningMessage('No tests generated');
    }
  } catch (error) {
    cursor.window.showErrorMessage(`Test generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Setup file watchers for auto-review
 */
function setupFileWatchers(config: CursorConfig) {
  cursor.workspace.onDidSaveTextDocument(async (document) => {
    // Debounce auto-review
    setTimeout(async () => {
      await reviewFile(document.uri.fsPath, config);
    }, 1000);
  });
}

/**
 * Setup inline diagnostics
 */
function setupInlineDiagnostics(config: CursorConfig) {
  // Register diagnostic collection
  const diagnosticCollection = cursor.languages.createDiagnosticCollection('readylayer');

  cursor.workspace.onDidOpenTextDocument(async (document: { uri: { fsPath: string } }) => {
    // Review file on open
    const issues = await getFileIssues(document.uri.fsPath, config);
    if (issues) {
      const diagnostics = issues.map((issue) => ({
        range: new cursor.Range(
          issue.line - 1,
          issue.column ?? 0,
          issue.line - 1,
          (issue.column ?? 0) + 1
        ),
        message: issue.message,
        severity: issue.severity === 'critical' || issue.severity === 'high' 
          ? cursor.DiagnosticSeverity.Error
          : issue.severity === 'medium'
          ? cursor.DiagnosticSeverity.Warning
          : cursor.DiagnosticSeverity.Information,
        source: 'ReadyLayer',
      }));
      diagnosticCollection.set(document.uri, diagnostics);
    }
  });
}

/**
 * Get repository ID from workspace
 */
function getRepositoryId(): string {
  // Try to read from .readylayer.json or git config
  // In production, would parse git config or workspace settings
  return process.env.READYLAYER_REPOSITORY_ID || '';
}

/**
 * Get file issues for diagnostics
 */
interface Issue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  file: string;
  line: number;
  column?: number;
  fix?: string;
}

async function getFileIssues(filePath: string, config: CursorConfig): Promise<Issue[] | null> {
  try {
    const fileContent = await cursor.workspace.fs.readFile(filePath);
    const content = new TextDecoder().decode(fileContent);

    const response = await fetch(`${config.readyLayer.apiUrl || 'https://api.readylayer.com'}/api/v1/ide/review`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.readyLayer.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repositoryId: getRepositoryId(),
        filePath,
        fileContent: content,
      }),
    });

    if (!response.ok) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await response.json() as {
      data?: {
        issues?: Issue[];
      };
    };
    return result.data?.issues ?? null;
  } catch {
    return null;
  }
}

/**
 * Show issues panel
 */
function showIssuesPanel(issues: Issue[]) {
  // Create output panel with issues
  const outputChannel = cursor.window.createOutputChannel('ReadyLayer Issues');
  outputChannel.clear();
  outputChannel.appendLine(`Found ${issues.length} issue(s):\n`);
  
  issues.forEach((issue, index) => {
    outputChannel.appendLine(`${index + 1}. ${issue.severity.toUpperCase()}: ${issue.ruleId}`);
    outputChannel.appendLine(`   ${issue.file}:${issue.line}`);
    outputChannel.appendLine(`   ${issue.message}`);
    if (issue.fix) {
      outputChannel.appendLine(`   Fix: ${issue.fix}`);
    }
    outputChannel.appendLine('');
  });
  
  outputChannel.show();
}

/**
 * Show test preview
 */
function showTestPreview(testContent: string, placement: string) {
  // Open test file in editor or show preview
  const messageResult = cursor.window.showInformationMessage(
    `Tests generated. Placement: ${placement}`,
    'Open Test File'
  );
  if (messageResult && typeof messageResult.then === 'function') {
    messageResult.then((action: string | undefined) => {
      if (action === 'Open Test File') {
        // Open test file
        const docPromise = cursor.workspace.openTextDocument({
          content: testContent,
          language: 'typescript',
        });
        if (docPromise && typeof docPromise.then === 'function') {
          docPromise.then((doc: { uri: { fsPath: string } }) => {
            cursor.window.showTextDocument(doc);
          });
        }
      }
    });
  }
}
