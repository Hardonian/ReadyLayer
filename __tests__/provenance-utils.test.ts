import { describe, expect, it } from 'vitest';
import { buildPromptHashes, redactText, sha256OfJson, stableStringify } from '../lib/provenance';
import { buildDeterministicZip, deterministicManifest } from '../lib/deterministic-zip';

describe('provenance hashing and redaction', () => {
  it('produces stable json hashes', () => {
    const a = { b: 1, a: { d: 2, c: 3 } };
    const b = { a: { c: 3, d: 2 }, b: 1 };
    expect(stableStringify(a)).toBe(stableStringify(b));
    expect(sha256OfJson(a)).toBe(sha256OfJson(b));
  });

  it('redacts sensitive fields', () => {
    const text = 'Contact me at user@example.com using token ghp_1234567890abcd';
    expect(redactText(text, 'safe')).toContain('[REDACTED_EMAIL]');
    expect(redactText(text, 'safe')).toContain('[REDACTED_TOKEN]');
  });

  it('hashes prompts deterministically', () => {
    const hashes = buildPromptHashes(['hello', 'world']);
    expect(hashes).toHaveLength(2);
    expect(hashes[0]).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('deterministic zip manifest', () => {
  it('keeps manifest hashes aligned with file contents', () => {
    const files = [
      { path: 'b.json', content: '{"b":2}' },
      { path: 'a.json', content: '{"a":1}' },
    ];
    const manifest = deterministicManifest(files);
    expect(manifest.files[0].path).toBe('a.json');
    const zip = buildDeterministicZip(files);
    expect(zip.length).toBeGreaterThan(30);
    expect(manifest.files.every((f) => f.sha256.length === 64)).toBe(true);
  });
});
