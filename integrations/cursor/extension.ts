/**
 * Cursor IDE Integration
 * 
 * ReadyLayer extension for Cursor IDE
 * Provides inline code review, test generation, and policy enforcement
 */

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

    const result = await response.json();
    
    if (result.data.issuesCount > 0) {
      cursor.window.showWarningMessage(
        `Found ${result.data.issuesCount} issue(s)`,
        'View Details'
      ).then((action) => {
        if (action === 'View Details') {
          showIssuesPanel(result.data.issues);
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

    const result = await response.json();
    
    if (result.data.testContent) {
      // Show test preview
      showTestPreview(result.data.testContent, result.data.placement);
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

  cursor.workspace.onDidOpenTextDocument(async (document) => {
    // Review file on open
    const issues = await getFileIssues(document.uri.fsPath, config);
    if (issues) {
      const diagnostics = issues.map((issue) => ({
        range: new cursor.Range(
          issue.line - 1,
          issue.column || 0,
          issue.line - 1,
          (issue.column || 0) + 1
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
async function getFileIssues(filePath: string, config: CursorConfig): Promise<any[] | null> {
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

    const result = await response.json();
    return result.data.issues || [];
  } catch {
    return null;
  }
}

/**
 * Show issues panel
 */
function showIssuesPanel(issues: any[]) {
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
  cursor.window.showInformationMessage(
    `Tests generated. Placement: ${placement}`,
    'Open Test File'
  ).then((action) => {
    if (action === 'Open Test File') {
      // Open test file
      cursor.workspace.openTextDocument({
        content: testContent,
        language: 'typescript',
      }).then((doc) => {
        cursor.window.showTextDocument(doc);
      });
    }
  });
}
