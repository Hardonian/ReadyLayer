import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('JetBrains IDE Plugin Packaging', () => {
  const pluginDir = path.resolve(__dirname, '../../ide/jetbrains');

  it('contains valid build.gradle.kts with IntelliJ platform setup', () => {
    const gradleFile = path.join(pluginDir, 'build.gradle.kts');
    expect(fs.existsSync(gradleFile)).toBe(true);
    const content = fs.readFileSync(gradleFile, 'utf-8');
    expect(content).toContain('org.jetbrains.intellij.platform');
    expect(content).toContain('io.readylayer.jetbrains');
  });

  it('contains valid plugin.xml manifest defining actions and annotators', () => {
    const manifestFile = path.join(pluginDir, 'src/main/resources/META-INF/plugin.xml');
    expect(fs.existsSync(manifestFile)).toBe(true);
    const content = fs.readFileSync(manifestFile, 'utf-8');
    expect(content).toContain('<id>io.readylayer.jetbrains</id>');
    expect(content).toContain('<action id="ReadyLayer.ScanFile"');
    expect(content).toContain('externalAnnotator');
  });

  it('contains Kotlin CLI bridge file', () => {
    const bridgeFile = path.join(pluginDir, 'src/main/kotlin/io/readylayer/CliBridge.kt');
    expect(fs.existsSync(bridgeFile)).toBe(true);
    const content = fs.readFileSync(bridgeFile, 'utf-8');
    expect(content).toContain('object CliBridge');
    expect(content).toContain('readylayer');
  });
});
