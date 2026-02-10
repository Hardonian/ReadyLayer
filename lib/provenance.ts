import { createHash } from 'crypto';

export type RedactionLevel = 'none' | 'safe' | 'strict';

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

export function sha256OfJson(value: unknown): string {
  return createHash('sha256').update(stableStringify(value), 'utf8').digest('hex');
}

export function sha256OfText(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function redactText(input: string, level: RedactionLevel): string {
  if (level === 'none') return input;

  const emailsRedacted = input.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]');
  const tokenRedacted = emailsRedacted.replace(/\b(?:sk|ghp|glpat|xoxb|xoxp)[-_A-Za-z0-9]{10,}\b/g, '[REDACTED_TOKEN]');

  if (level === 'strict') {
    return tokenRedacted.length > 300 ? `${tokenRedacted.slice(0, 300)}...[REDACTED_STRICT]` : tokenRedacted;
  }

  return tokenRedacted;
}

export function buildPromptHashes(prompts: string[] | undefined): string[] {
  if (!prompts || prompts.length === 0) return [];
  return prompts.map((prompt) => sha256OfText(prompt));
}

export function summarizeToolCalls(toolCalls: Array<{ tool?: string; durationMs?: number }> | undefined): { total: number; byTool: Record<string, number>; totalDurationMs: number } {
  if (!toolCalls || toolCalls.length === 0) {
    return { total: 0, byTool: {}, totalDurationMs: 0 };
  }

  return toolCalls.reduce(
    (acc, entry) => {
      const tool = entry.tool || 'unknown';
      acc.total += 1;
      acc.byTool[tool] = (acc.byTool[tool] || 0) + 1;
      if (typeof entry.durationMs === 'number' && Number.isFinite(entry.durationMs)) {
        acc.totalDurationMs += Math.max(0, Math.round(entry.durationMs));
      }
      return acc;
    },
    { total: 0, byTool: {} as Record<string, number>, totalDurationMs: 0 }
  );
}
