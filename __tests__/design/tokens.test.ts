import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Design Tokens & Dark Mode Consistency', () => {
  const cssPath = path.resolve(__dirname, '../../app/globals.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  it('defines all required core CSS surface and text variables in :root', () => {
    const requiredVars = [
      '--surface',
      '--surface-muted',
      '--surface-raised',
      '--surface-overlay',
      '--text',
      '--text-muted',
      '--border',
      '--accent',
      '--accent-foreground',
      '--primary',
      '--success',
      '--warning',
      '--danger',
    ];

    for (const v of requiredVars) {
      expect(css).toContain(`${v}:`);
    }
  });

  it('provides dark mode overrides for core tokens under .dark', () => {
    const darkSection = css.slice(css.indexOf('.dark {'));
    expect(darkSection).toContain('--surface:');
    expect(darkSection).toContain('--surface-raised:');
    expect(darkSection).toContain('--text:');
    expect(darkSection).toContain('--border:');
    // Ensure WCAG AA compliant accent-foreground in dark mode
    expect(darkSection).toContain('--accent-foreground: 0 0% 100%;');
  });
});
