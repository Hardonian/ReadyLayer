# ReadyLayer — IDE Extension UX Implementation Guide

## Overview

This document provides detailed implementation guidance for enhancing the ReadyLayer IDE extensions (VS Code and JetBrains) with improved UX/UI features, real-time updates, and better visual feedback.

---

## VS Code Extension Implementation

### 1. Enhanced Status Bar

#### Implementation
```typescript
// src/statusBar.ts
import * as vscode from 'vscode';

export class ReadyLayerStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private wsConnection: WebSocket | null = null;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'readylayer.showPanel';
    this.updateStatus('idle', 0);
  }

  updateStatus(status: 'idle' | 'reviewing' | 'success' | 'warning' | 'error', issueCount: number) {
    const icons = {
      idle: '$(circle-outline)',
      reviewing: '$(sync~spin)',
      success: '$(check)',
      warning: '$(warning)',
      error: '$(error)'
    };

    const colors = {
      idle: '#6b7280',
      reviewing: '#3b82f6',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    };

    this.statusBarItem.text = `${icons[status]} ReadyLayer${issueCount > 0 ? ` (${issueCount} issues)` : ''}`;
    this.statusBarItem.color = colors[status];
    this.statusBarItem.tooltip = this.getTooltip(status, issueCount);
    this.statusBarItem.show();
  }

  private getTooltip(status: string, issueCount: number): string {
    const tooltips = {
      idle: 'ReadyLayer: Idle',
      reviewing: 'ReadyLayer: Reviewing code...',
      success: `ReadyLayer: Review completed, no issues`,
      warning: `ReadyLayer: Review completed, ${issueCount} warnings`,
      error: `ReadyLayer: Review failed, ${issueCount} issues`
    };
    return tooltips[status] || 'ReadyLayer';
  }

  dispose() {
    this.statusBarItem.dispose();
    this.wsConnection?.close();
  }
}
```

#### Features
- **Real-time updates:** WebSocket connection for live status
- **Issue count:** Shows number of issues found
- **Color coding:** Visual status indication
- **Click action:** Opens ReadyLayer panel
- **Tooltip:** Detailed status on hover

---

### 2. Rich Hover Cards

#### Implementation
```typescript
// src/hoverProvider.ts
import * as vscode from 'vscode';
import { ReadyLayerAPI } from './api';

export class ReadyLayerHoverProvider implements vscode.HoverProvider {
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | null> {
    const issues = await ReadyLayerAPI.getIssuesForFile(
      document.uri.fsPath,
      position.line + 1
    );

    if (issues.length === 0) {
      return null;
    }

    const issue = issues[0]; // Show first issue
    const markdown = new vscode.MarkdownString();
    
    markdown.appendMarkdown(`### ${this.getSeverityIcon(issue.severity)} ${issue.message}\n\n`);
    markdown.appendMarkdown(`**Rule:** \`${issue.rule_id}\`  \n`);
    markdown.appendMarkdown(`**Severity:** ${issue.severity}  \n\n`);
    markdown.appendMarkdown(`**Issue:**\n${issue.description}\n\n`);
    
    if (issue.suggestion) {
      markdown.appendMarkdown(`**Fix:**\n\`\`\`${document.languageId}\n${issue.suggestion}\n\`\`\`\n\n`);
    }
    
    markdown.appendMarkdown(`[Show Fix](${this.getFixCommand(issue)}) | [Learn More](${issue.docs_url})`);

    return new vscode.Hover(markdown, new vscode.Range(
      new vscode.Position(position.line, 0),
      new vscode.Position(position.line, 1000)
    ));
  }

  private getSeverityIcon(severity: string): string {
    const icons = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };
    return icons[severity] || '⚪';
  }

  private getFixCommand(issue: any): string {
    return `command:readylayer.applyFix?${encodeURIComponent(JSON.stringify(issue))}`;
  }
}
```

#### Features
- **Rich markdown:** Formatted hover cards with code blocks
- **Severity icons:** Visual severity indication
- **Fix suggestions:** Code snippets with syntax highlighting
- **Action links:** Quick actions (apply fix, learn more)

---

### 3. ReadyLayer Panel

#### Implementation
```typescript
// src/panel.ts
import * as vscode from 'vscode';
import * as path from 'path';

export class ReadyLayerPanel {
  private static currentPanel: ReadyLayerPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private wsConnection: WebSocket | null = null;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.webview.html = this.getHtmlForWebview();
    this._panel.onDidDispose(() => this.dispose(), null);

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'review':
            await this.startReview();
            break;
          case 'applyFix':
            await this.applyFix(message.data);
            break;
        }
      },
      null
    );

    this.connectWebSocket();
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ReadyLayerPanel.currentPanel) {
      ReadyLayerPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'readylayer',
      'ReadyLayer',
      column || vscode.ViewColumn.Two,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
      }
    );

    ReadyLayerPanel.currentPanel = new ReadyLayerPanel(panel, extensionUri);
  }

  private getHtmlForWebview(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ReadyLayer</title>
  <style>
    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 16px;
      margin: 0;
    }
    .status-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .status-indicator {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 8px;
    }
    .status-success { background: #10b981; }
    .status-warning { background: #f59e0b; }
    .status-error { background: #ef4444; }
    .status-pending { background: #6b7280; }
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin: 8px 0;
    }
    .progress-fill {
      height: 100%;
      background: #3b82f6;
      transition: width 0.3s ease;
    }
    .issue-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .issue-item {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      cursor: pointer;
    }
    .issue-item:hover {
      background: #f9fafb;
    }
    .severity-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      margin-right: 8px;
    }
    .severity-critical { background: #fee2e2; color: #991b1b; }
    .severity-high { background: #fed7aa; color: #9a3412; }
    .severity-medium { background: #fef3c7; color: #854d0e; }
    .severity-low { background: #d1fae5; color: #065f46; }
  </style>
</head>
<body>
  <div id="app">
    <div class="status-card">
      <h2>📊 Review Status</h2>
      <div id="status">
        <span class="status-indicator status-pending"></span>
        <span id="status-text">Idle</span>
      </div>
      <div id="progress" style="display: none;">
        <div class="progress-bar">
          <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
        </div>
        <div id="progress-text">0%</div>
      </div>
      <div id="issues-summary" style="display: none;">
        <div>Issues: <span id="issue-count">0</span></div>
        <div>Files: <span id="files-analyzed">0</span></div>
      </div>
      <button id="review-btn" onclick="startReview()">Start Review</button>
    </div>
    
    <div class="status-card">
      <h2>🐛 Issues</h2>
      <ul class="issue-list" id="issues-list">
        <li class="issue-item">No issues found</li>
      </ul>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let ws = null;

    function connectWebSocket() {
      ws = new WebSocket('wss://api.readylayer.com/ws');
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
    }

    function handleWebSocketMessage(data) {
      switch (data.event) {
        case 'review.started':
          updateStatus('reviewing', 'Reviewing code...');
          showProgress(0);
          break;
        case 'review.progress':
          updateStatus('reviewing', 'Reviewing code...');
          showProgress(data.data.progress);
          break;
        case 'review.completed':
          updateStatus('success', 'Review completed');
          hideProgress();
          updateIssues(data.data.issues);
          break;
        case 'review.failed':
          updateStatus('error', 'Review failed');
          hideProgress();
          break;
      }
    }

    function updateStatus(status, text) {
      const indicator = document.querySelector('.status-indicator');
      const statusText = document.getElementById('status-text');
      
      indicator.className = \`status-indicator status-\${status}\`;
      statusText.textContent = text;
    }

    function showProgress(percent) {
      document.getElementById('progress').style.display = 'block';
      document.getElementById('progress-fill').style.width = percent + '%';
      document.getElementById('progress-text').textContent = percent + '%';
    }

    function hideProgress() {
      document.getElementById('progress').style.display = 'none';
    }

    function updateIssues(issues) {
      const list = document.getElementById('issues-list');
      list.innerHTML = '';
      
      issues.forEach(issue => {
        const li = document.createElement('li');
        li.className = 'issue-item';
        li.innerHTML = \`
          <span class="severity-badge severity-\${issue.severity}">\${issue.severity}</span>
          <span>\${issue.message}</span>
          <span style="color: #6b7280; float: right;">\${issue.file}:\${issue.line}</span>
        \`;
        li.onclick = () => {
          vscode.postMessage({
            command: 'openFile',
            data: { file: issue.file, line: issue.line }
          });
        };
        list.appendChild(li);
      });
    }

    function startReview() {
      vscode.postMessage({ command: 'review' });
    }

    connectWebSocket();
  </script>
</body>
</html>`;
  }

  private connectWebSocket() {
    const apiKey = vscode.workspace.getConfiguration('readylayer').get<string>('apiKey');
    if (!apiKey) {
      return;
    }

    this.wsConnection = new WebSocket(`wss://api.readylayer.com/ws?api_key=${apiKey}`);
    
    this.wsConnection.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this._panel.webview.postMessage(data);
    };
  }

  private async startReview() {
    // Implementation for starting review
  }

  private async applyFix(issue: any) {
    // Implementation for applying fix
  }

  public dispose() {
    ReadyLayerPanel.currentPanel = undefined;
    this._panel.dispose();
    this.wsConnection?.close();
  }
}
```

#### Features
- **Webview panel:** Custom HTML/CSS/JS panel
- **WebSocket connection:** Real-time updates
- **Progress indicators:** Visual progress bars
- **Issue list:** Interactive issue list
- **Actions:** Start review, apply fixes

---

### 4. Toast Notifications

#### Implementation
```typescript
// src/notifications.ts
import * as vscode from 'vscode';

export class ReadyLayerNotifications {
  static showSuccess(message: string, actions?: string[]) {
    vscode.window.showInformationMessage(
      `✅ ReadyLayer: ${message}`,
      ...(actions || [])
    );
  }

  static showWarning(message: string, actions?: string[]) {
    vscode.window.showWarningMessage(
      `⚠️ ReadyLayer: ${message}`,
      ...(actions || [])
    );
  }

  static showError(message: string, actions?: string[]) {
    vscode.window.showErrorMessage(
      `❌ ReadyLayer: ${message}`,
      ...(actions || ['Retry', 'View Logs'])
    );
  }

  static showInfo(message: string, actions?: string[]) {
    vscode.window.showInformationMessage(
      `ℹ️ ReadyLayer: ${message}`,
      ...(actions || [])
    );
  }

  static showProgress(message: string, token: vscode.CancellationToken) {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'ReadyLayer',
        cancellable: true
      },
      async (progress, cancellationToken) => {
        progress.report({ message });
        
        return new Promise<void>((resolve) => {
          cancellationToken.onCancellationRequested(() => {
            resolve();
          });
          
          token.onCancellationRequested(() => {
            resolve();
          });
        });
      }
    );
  }
}
```

#### Features
- **Type-specific:** Success, warning, error, info
- **Actions:** Actionable buttons
- **Progress:** Progress notifications
- **Auto-dismiss:** Configurable auto-dismiss

---

### 5. Enhanced Diagnostics

#### Implementation
```typescript
// src/diagnostics.ts
import * as vscode from 'vscode';

export class ReadyLayerDiagnostics {
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('readylayer');
  }

  updateDiagnostics(issues: any[]) {
    const diagnosticsByFile = new Map<string, vscode.Diagnostic[]>();

    issues.forEach(issue => {
      if (!diagnosticsByFile.has(issue.file)) {
        diagnosticsByFile.set(issue.file, []);
      }

      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(
          issue.line - 1,
          0,
          issue.line - 1,
          1000
        ),
        issue.message,
        this.getSeverity(issue.severity)
      );

      diagnostic.source = 'ReadyLayer';
      diagnostic.code = issue.rule_id;
      diagnostic.relatedInformation = [
        new vscode.DiagnosticRelatedInformation(
          new vscode.Location(
            vscode.Uri.file(issue.file),
            new vscode.Position(issue.line - 1, 0)
          ),
          issue.suggestion || 'No suggestion available'
        )
      ];

      diagnosticsByFile.get(issue.file)!.push(diagnostic);
    });

    diagnosticsByFile.forEach((diagnostics, file) => {
      this.diagnosticCollection.set(vscode.Uri.file(file), diagnostics);
    });
  }

  private getSeverity(severity: string): vscode.DiagnosticSeverity {
    switch (severity) {
      case 'critical':
      case 'error':
        return vscode.DiagnosticSeverity.Error;
      case 'high':
      case 'warning':
        return vscode.DiagnosticSeverity.Warning;
      case 'medium':
        return vscode.DiagnosticSeverity.Information;
      case 'low':
        return vscode.DiagnosticSeverity.Hint;
      default:
        return vscode.DiagnosticSeverity.Information;
    }
  }

  clear() {
    this.diagnosticCollection.clear();
  }

  dispose() {
    this.diagnosticCollection.dispose();
  }
}
```

#### Features
- **Severity mapping:** Map ReadyLayer severities to VS Code severities
- **Related information:** Include fix suggestions
- **Code actions:** Provide quick fixes
- **Visual indicators:** Color-coded squiggles

---

## JetBrains IDE Implementation

### Similar Structure
JetBrains IDEs use a similar structure but with JetBrains-specific APIs:

- **Status bar:** `StatusBarWidget`
- **Tool windows:** `ToolWindow`
- **Inspections:** `InspectionTool`
- **Notifications:** `NotificationGroup`

### Key Differences
- **UI Framework:** Swing instead of webview
- **APIs:** JetBrains Platform APIs
- **Styling:** IntelliJ theme system

---

## WebSocket Integration

### Connection Management
```typescript
// src/websocket.ts
export class ReadyLayerWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(apiKey: string, callbacks: {
    onMessage: (data: any) => void;
    onError: (error: Error) => void;
    onClose: () => void;
  }) {
    this.ws = new WebSocket(`wss://api.readylayer.com/ws?api_key=${apiKey}`);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callbacks.onMessage(data);
    };

    this.ws.onerror = (error) => {
      callbacks.onError(error as Error);
      this.reconnect();
    };

    this.ws.onclose = () => {
      callbacks.onClose();
      this.reconnect();
    };
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => {
      // Reconnect logic
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

---

## Testing

### Unit Tests
```typescript
// src/__tests__/statusBar.test.ts
import { ReadyLayerStatusBar } from '../statusBar';
import * as vscode from 'vscode';

describe('ReadyLayerStatusBar', () => {
  it('should update status correctly', () => {
    const statusBar = new ReadyLayerStatusBar();
    statusBar.updateStatus('success', 0);
    // Assert status bar text and color
  });
});
```

### Integration Tests
- Test WebSocket connection
- Test panel updates
- Test diagnostics
- Test notifications

---

## Performance Considerations

### 1. Debouncing
- Debounce file change events (500ms)
- Debounce API calls (300ms)

### 2. Caching
- Cache review results (TTL: 5 minutes)
- Cache issue details (TTL: 1 hour)

### 3. Lazy Loading
- Load panel content on demand
- Load issue details when expanded

---

## Conclusion

This implementation guide provides detailed code examples for enhancing the ReadyLayer IDE extensions with improved UX/UI features. The implementation focuses on:

1. **Real-time updates:** WebSocket integration for live status
2. **Visual feedback:** Progress indicators, status bars, notifications
3. **Rich interactions:** Hover cards, panels, diagnostics
4. **Error handling:** Graceful error recovery

These improvements will make ReadyLayer feel more responsive and informative, similar to Vercel deployments and GitHub Actions PR reviews.
