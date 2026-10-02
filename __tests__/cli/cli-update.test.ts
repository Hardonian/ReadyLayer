import { describe, it, expect, vi } from 'vitest';
import { checkForCliUpdate } from '../../cli/readylayer-cli';

describe('CLI Self-Update Checker', () => {
  it('detects when an update is available', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: '1.2.0' }),
    });

    const info = await checkForCliUpdate('1.0.0', mockFetch as unknown as typeof fetch);
    expect(info.hasUpdate).toBe(true);
    expect(info.currentVersion).toBe('1.0.0');
    expect(info.latestVersion).toBe('1.2.0');
    expect(info.installCommand).toContain('npm install -g @readylayer/cli@latest');
  });

  it('reports up to date when current version matches latest', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: '1.0.0' }),
    });

    const info = await checkForCliUpdate('1.0.0', mockFetch as unknown as typeof fetch);
    expect(info.hasUpdate).toBe(false);
    expect(info.latestVersion).toBe('1.0.0');
  });

  it('fails gracefully when network request errors', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const info = await checkForCliUpdate('1.0.0', mockFetch as unknown as typeof fetch);
    expect(info.hasUpdate).toBe(false);
    expect(info.currentVersion).toBe('1.0.0');
  });
});
