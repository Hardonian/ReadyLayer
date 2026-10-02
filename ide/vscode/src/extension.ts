/**
 * ReadyLayer VS Code & Cursor IDE Extension
 *
 * Provides real-time policy evaluation, AI-generated code detection,
 * inline diagnostics, and provenance bundle linking directly in the editor.
 */

export interface DiagnosticRange {
  start: { line: number; character: number };
  end: { line: number; character: number };
}

export interface ReadyLayerDiagnostic {
  range: DiagnosticRange;
  message: string;
  severity: number;
  source: string;
  code?: string;
}

export interface ExtensionContext {
  subscriptions: Array<{ dispose(): void }>;
}

export interface TextDocument {
  uri: { fsPath: string; toString(): string };
  getText(): string;
  lineCount: number;
  fileName: string;
}

export interface DiagnosticCollection {
  set(uri: unknown, diagnostics: ReadyLayerDiagnostic[]): void;
  delete(uri: unknown): void;
  clear(): void;
  dispose(): void;
}

// Minimal standard VS Code API interface
export interface VSCodeAPI {
  commands: {
    registerCommand(command: string, callback: (...args: unknown[]) => Promise<void> | void): { dispose(): void };
    executeCommand(command: string, ...args: unknown[]): Promise<unknown>;
  };
  window: {
    showInformationMessage(message: string, ...items: string[]): Promise<string | undefined>;
    showWarningMessage(message: string, ...items: string[]): Promise<string | undefined>;
    showErrorMessage(message: string, ...items: string[]): Promise<string | undefined>;
    activeTextEditor?: {
      document: TextDocument;
    };
    createStatusBarItem(alignment?: number, priority?: number): {
      text: string;
      tooltip: string;
      command: string;
      show(): void;
      hide(): void;
      dispose(): void;
    };
  };
  workspace: {
    getConfiguration(section?: string): {
      get<T>(key: string, defaultValue?: T): T;
    };
    onDidSaveTextDocument(callback: (doc: TextDocument) => void): { dispose(): void };
    textDocuments: TextDocument[];
  };
  languages: {
    createDiagnosticCollection(name?: string): DiagnosticCollection;
  };
  DiagnosticSeverity: {
    Error: number;
    Warning: number;
    Information: number;
    Hint: number;
  };
  env: {
    openExternal(url: { toString(): string }): Promise<boolean>;
  };
  Uri: {
    parse(value: string): { toString(): string };
  };
}

let diagnosticCollection: DiagnosticCollection | null = null;

/**
 * Scan a single document for common governance/security policy violations.
 */
export function evaluateDocumentContent(text: string, _fileName?: string): ReadyLayerDiagnostic[] {
  const diagnostics: ReadyLayerDiagnostic[] = [];
  const lines = text.split('\n');

  lines.forEach((line, index) => {
    // 1. Secret / API Key detection
    const secretPattern = /(api[_-]?key|secret|password|private[_-]?key)\s*[:=]\s*['"][A-Za-z0-9_-]{16,}['"]/i;
    if (secretPattern.test(line)) {
      diagnostics.push({
        range: {
          start: { line: index, character: 0 },
          end: { line: index, character: line.length },
        },
        message: 'ReadyLayer Policy Violation: Potential hardcoded secret or API credential detected.',
        severity: 0, // Error
        source: 'ReadyLayer-Policy',
        code: 'SEC-001',
      });
    }

    // 2. High blast radius unsafe file operations
    if (/(rmdir|rm -rf|drop table|truncate table)/i.test(line)) {
      diagnostics.push({
        range: {
          start: { line: index, character: 0 },
          end: { line: index, character: line.length },
        },
        message: 'ReadyLayer Safety Warning: High blast-radius destructive operation detected.',
        severity: 1, // Warning
        source: 'ReadyLayer-Safety',
        code: 'SAFE-002',
      });
    }

    // 3. AI model bypass flags or markers
    if (/\b(ignore-readylayer|bypass-governance|skip-policy)\b/i.test(line)) {
      diagnostics.push({
        range: {
          start: { line: index, character: 0 },
          end: { line: index, character: line.length },
        },
        message: 'ReadyLayer Audit Notice: Governance bypass directive observed in source.',
        severity: 1, // Warning
        source: 'ReadyLayer-Audit',
        code: 'AUD-003',
      });
    }
  });

  return diagnostics;
}

/**
 * Extension activation entrypoint.
 */
export function activate(context: ExtensionContext, vscodeApi?: VSCodeAPI): void {
  // Support both VS Code and Cursor environments
  const vscode = vscodeApi || (globalThis as unknown as { vscode: VSCodeAPI }).vscode;
  if (!vscode) {
    return;
  }

  diagnosticCollection = vscode.languages.createDiagnosticCollection('readylayer');
  context.subscriptions.push(diagnosticCollection);

  // Status Bar indicator
  const statusBar = vscode.window.createStatusBarItem(2, 100);
  statusBar.text = '$(shield) ReadyLayer';
  statusBar.tooltip = 'ReadyLayer AI Governance Active';
  statusBar.command = 'readylayer.scanFile';
  statusBar.show();
  context.subscriptions.push(statusBar);

  // Command: Scan Current File
  const scanFileCmd = vscode.commands.registerCommand('readylayer.scanFile', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      await vscode.window.showInformationMessage('No active file open to scan.');
      return;
    }

    const doc = editor.document;
    const diagnostics = evaluateDocumentContent(doc.getText(), doc.fileName);
    diagnosticCollection?.set(doc.uri, diagnostics);

    if (diagnostics.length === 0) {
      await vscode.window.showInformationMessage(`ReadyLayer: ${doc.fileName} passed all policy checks.`);
    } else {
      await vscode.window.showWarningMessage(
        `ReadyLayer: Found ${diagnostics.length} policy issue(s) in ${doc.fileName}.`
      );
    }
  });
  context.subscriptions.push(scanFileCmd);

  // Command: Open Governance Dashboard
  const dashboardCmd = vscode.commands.registerCommand('readylayer.showDashboard', async () => {
    const config = vscode.workspace.getConfiguration('readylayer');
    const apiUrl = config.get<string>('apiUrl', 'https://readylayer.io');
    const targetUrl = apiUrl.replace('/api', '').replace(/\/+$/, '') + '/dashboard';
    await vscode.env.openExternal(vscode.Uri.parse(targetUrl));
  });
  context.subscriptions.push(dashboardCmd);

  // On Save text document listener
  const onSaveSub = vscode.workspace.onDidSaveTextDocument((doc: TextDocument) => {
    const config = vscode.workspace.getConfiguration('readylayer');
    const scanOnSave = config.get<boolean>('scanOnSave', true);
    if (scanOnSave) {
      const diagnostics = evaluateDocumentContent(doc.getText(), doc.fileName);
      diagnosticCollection?.set(doc.uri, diagnostics);
    }
  });
  context.subscriptions.push(onSaveSub);
}

/**
 * Extension deactivation lifecycle hook.
 */
export function deactivate(): void {
  if (diagnosticCollection) {
    diagnosticCollection.clear();
    diagnosticCollection.dispose();
  }
}
