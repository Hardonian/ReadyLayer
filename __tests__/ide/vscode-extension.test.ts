import { describe, it, expect, vi } from 'vitest';
import {
  evaluateDocumentContent,
  activate,
  deactivate,
  VSCodeAPI,
  ExtensionContext,
} from '../../ide/vscode/src/extension';

describe('ReadyLayer VS Code / Cursor Extension', () => {
  it('detects hardcoded secrets in source file text', () => {
    const code = `
      const config = {
        apiKey: "sk-proj-1234567890abcdef123456",
        port: 8080
      };
    `;

    const diags = evaluateDocumentContent(code, 'config.ts');
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0].code).toBe('SEC-001');
    expect(diags[0].message).toContain('hardcoded secret');
  });

  it('detects high blast radius destructive commands', () => {
    const script = `
      #!/bin/bash
      rm -rf /var/data
    `;

    const diags = evaluateDocumentContent(script, 'cleanup.sh');
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0].code).toBe('SAFE-002');
  });

  it('passes clean source code with 0 diagnostics', () => {
    const cleanCode = `
      export function sum(a: number, b: number): number {
        return a + b;
      }
    `;

    const diags = evaluateDocumentContent(cleanCode, 'math.ts');
    expect(diags).toEqual([]);
  });

  it('registers commands and lifecycle hooks on activation', () => {
    const subscriptions: Array<{ dispose(): void }> = [];
    const context: ExtensionContext = { subscriptions };

    const mockCommands: Record<string, Function> = {};
    const mockDiagnostics = {
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      dispose: vi.fn(),
    };

    const mockVscode: VSCodeAPI = {
      commands: {
        registerCommand: vi.fn((name: string, cb: Function) => {
          mockCommands[name] = cb;
          return { dispose: vi.fn() };
        }),
        executeCommand: vi.fn(),
      },
      window: {
        showInformationMessage: vi.fn(),
        showWarningMessage: vi.fn(),
        showErrorMessage: vi.fn(),
        createStatusBarItem: vi.fn().mockReturnValue({
          text: '',
          tooltip: '',
          command: '',
          show: vi.fn(),
          hide: vi.fn(),
          dispose: vi.fn(),
        }),
      },
      workspace: {
        getConfiguration: vi.fn().mockReturnValue({
          get: vi.fn((_key: string, def: unknown) => def),
        }),
        onDidSaveTextDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        textDocuments: [],
      },
      languages: {
        createDiagnosticCollection: vi.fn().mockReturnValue(mockDiagnostics),
      },
      DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3,
      },
      env: {
        openExternal: vi.fn(),
      },
      Uri: {
        parse: vi.fn((u: string) => ({ toString: () => u })),
      },
    };

    activate(context, mockVscode);

    expect(mockVscode.commands.registerCommand).toHaveBeenCalledWith(
      'readylayer.scanFile',
      expect.any(Function)
    );
    expect(mockVscode.commands.registerCommand).toHaveBeenCalledWith(
      'readylayer.showDashboard',
      expect.any(Function)
    );
    expect(subscriptions.length).toBeGreaterThan(0);

    deactivate();
    expect(mockDiagnostics.dispose).toHaveBeenCalled();
  });
});
