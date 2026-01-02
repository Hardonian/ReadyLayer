/**
 * Tabnine Agent Integration
 * 
 * ReadyLayer integration for Tabnine agent
 * Provides real-time code review and policy enforcement
 */

// Type declarations for Tabnine global API
declare const tabnine: {
  onBeforeCompletion(callback: (context: { code: string; language?: string; position?: { line: number; character: number } }) => Promise<{ code: string; language?: string; position?: { line: number; character: number } }> | { code: string; language?: string; position?: { line: number; character: number } }): void;
  onAfterCompletion(callback: (completion: { code: string; accepted: boolean; language?: string }) => void | Promise<void>): void;
  onBeforeInsert(callback: (code: string) => Promise<string | null> | string | null): void;
  showNotification(message: string, type?: 'info' | 'warning' | 'error'): void;
  showWarning(message: string, details?: Array<{ severity: string; message: string; line: number }>): void;
  showError(message: string): void;
  blockCompletion(reason: string): void;
  getContext(): Promise<{ code: string; language?: string; position?: { line: number; character: number } }>;
  editor: {
    getSelection(): { text: string; start: { line: number; character: number }; end: { line: number; character: number } };
    activeFile?: { path: string };
  };
};

interface TabnineConfig {
  readyLayer: {
    enabled: boolean;
    apiKey: string;
    apiUrl?: string;
    autoReview: boolean;
    blockOnCritical?: boolean;
  };
}

/**
 * Initialize ReadyLayer integration in Tabnine
 */
export function initializeReadyLayer(config: TabnineConfig) {
  if (!config.readyLayer.enabled) {
    return;
  }

  // Register Tabnine hooks
  registerTabnineHooks(config);
}

/**
 * Register Tabnine agent hooks
 */
function registerTabnineHooks(config: TabnineConfig) {
  // Hook: Before code completion
  tabnine.onBeforeCompletion(async (context) => {
    if (!config.readyLayer.autoReview) {
      return context;
    }

    // Review the code being generated
    const reviewResult = await reviewCode(context.code, config);
    
    if (reviewResult.isBlocked && config.readyLayer.blockOnCritical) {
      // Block completion if critical issues found
      throw new Error(`Code blocked: ${reviewResult.issues[0]?.message}`);
    }

    return context;
  });

  // Hook: After code completion
  tabnine.onAfterCompletion(async (completion) => {
    if (!config.readyLayer.autoReview) {
      return;
    }

    // Review completed code
    const reviewResult = await reviewCode(completion.code, config);
    
    if (reviewResult.issues.length > 0) {
      // Show warnings
      tabnine.showWarning(
        `ReadyLayer found ${reviewResult.issues.length} issue(s)`,
        reviewResult.issues.map((issue) => ({
          severity: issue.severity,
          message: issue.message,
          line: issue.line,
        }))
      );
    }
  });

  // Hook: Before code insertion
  tabnine.onBeforeInsert(async (code) => {
    if (!config.readyLayer.autoReview) {
      return code;
    }

    const reviewResult = await reviewCode(code, config);
    
    if (reviewResult.isBlocked && config.readyLayer.blockOnCritical) {
      // Block insertion
      tabnine.showError('Code insertion blocked due to policy violations');
      return null;
    }

    return code;
  });
}

/**
 * Review code snippet
 */
async function reviewCode(code: string, config: TabnineConfig): Promise<{
  isBlocked: boolean;
  issues: Array<{
    severity: string;
    message: string;
    line: number;
    ruleId: string;
  }>;
}> {
  try {
    const response = await fetch(`${config.readyLayer.apiUrl || 'https://api.readylayer.com'}/api/v1/ide/review`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.readyLayer.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repositoryId: getRepositoryId(),
        filePath: getCurrentFile(),
        fileContent: code,
      }),
    });

    if (!response.ok) {
      return { isBlocked: false, issues: [] };
    }

    const result = await response.json();
    return {
      isBlocked: result.data.isBlocked || false,
      issues: result.data.issues || [],
    };
  } catch {
    return { isBlocked: false, issues: [] };
  }
}

/**
 * Get repository ID
 */
function getRepositoryId(): string {
  return process.env.READYLAYER_REPOSITORY_ID || '';
}

/**
 * Get current file path
 */
function getCurrentFile(): string {
  return tabnine.editor.activeFile?.path || 'unknown';
}
