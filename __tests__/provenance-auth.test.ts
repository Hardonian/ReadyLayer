import { describe, expect, it } from 'vitest';
import { canIngestExternal } from '../lib/provenance-auth';

describe('provenance authorization checks', () => {
  it('allows owner/admin roles', () => {
    expect(canIngestExternal('owner', [])).toBe(true);
    expect(canIngestExternal('admin', [])).toBe(true);
  });

  it('allows provenance scoped api keys', () => {
    expect(canIngestExternal('member', ['provenance:write'])).toBe(true);
    expect(canIngestExternal('member', ['admin'])).toBe(true);
  });

  it('denies plain member without scope', () => {
    expect(canIngestExternal('member', [])).toBe(false);
  });
});
