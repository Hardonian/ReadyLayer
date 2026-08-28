/**
 * Breaking Change Detector
 *
 * Analyzes code changes to detect breaking changes.
 * Essential for OSS maintainers to prevent unintended API breaks.
 *
 * Detects:
 * - Function signature changes (removed/renamed parameters)
 * - Function visibility changes (export removal)
 * - Type changes (parameter type narrowing)
 * - Return type changes
 * - Property removals
 * - Version number changes (patch vs minor vs major)
 */

// TODO: Implement TypeScript AST analysis
// import * as ts from 'typescript';

export interface BreakingChange {
  type: 'function-signature' | 'export-removal' | 'type-change' | 'property-removal' | 'version-bump' | 'interface-change';
  severity: 'critical' | 'high' | 'medium';
  file: string;
  line: number;
  item: string; // Function/class/interface name
  description: string;
  remediation: string;
  confidence: number; // 0-1
}

export interface VersionBumpSuggestion {
  current: string; // e.g., "1.0.0"
  suggested: string; // e.g., "2.0.0" for major, "1.1.0" for minor
  reason: string;
  breakingChanges: BreakingChange[];
}

/**
 * Parse semantic version
 */
export function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3]),
  };
}

/**
 * Increment semantic version based on change severity
 */
export function suggestVersionBump(
  currentVersion: string,
  hasBreakingChanges: boolean,
  hasNewFeatures: boolean = false
): string {
  const parsed = parseVersion(currentVersion);
  if (!parsed) return currentVersion;

  if (hasBreakingChanges) {
    // Major version bump
    return `${parsed.major + 1}.0.0`;
  } else if (hasNewFeatures) {
    // Minor version bump
    return `${parsed.major}.${parsed.minor + 1}.0`;
  } else {
    // Patch version bump
    return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  }
}

/**
 * Detect breaking changes by comparing two versions of a file
 */
export function detectBreakingChanges(
  beforeContent: string,
  afterContent: string,
  filePath: string
): BreakingChange[] {
  const changes: BreakingChange[] = [];

  // Basic text-based detection (works without full AST parsing)
  changes.push(...detectExportRemovals(beforeContent, afterContent, filePath));
  changes.push(...detectFunctionSignatureChanges(beforeContent, afterContent, filePath));
  changes.push(...detectPropertyRemovals(beforeContent, afterContent, filePath));
  changes.push(...detectInterfaceChanges(beforeContent, afterContent, filePath));

  return changes;
}

/**
 * Detect removed exports (breaking)
 */
function detectExportRemovals(before: string, after: string, filePath: string): BreakingChange[] {
  const changes: BreakingChange[] = [];
  const beforeExports = extractExports(before);
  const afterExports = extractExports(after);

  for (const exportName of beforeExports) {
    if (!afterExports.has(exportName)) {
      const lineNumber = getLineNumber(before, `export.*${exportName}`);
      changes.push({
        type: 'export-removal',
        severity: 'critical',
        file: filePath,
        line: lineNumber,
        item: exportName,
        description: `Exported ${exportName} was removed. This breaks existing consumers.`,
        remediation: 'Keep the export or deprecate it first with a warning.',
        confidence: 0.95,
      });
    }
  }

  return changes;
}

/**
 * Detect function signature changes (parameter removals, type changes)
 */
function detectFunctionSignatureChanges(before: string, after: string, filePath: string): BreakingChange[] {
  const changes: BreakingChange[] = [];

  // Simple regex-based detection of function parameter changes
  const beforeFunctions = extractFunctionSignatures(before);
  const afterFunctions = extractFunctionSignatures(after);

  for (const [name, beforeSig] of beforeFunctions) {
    const afterSig = afterFunctions.get(name);
    if (!afterSig) continue;

    // Check for parameter removals (critical)
    const beforeParams = extractParameters(beforeSig);
    const afterParams = extractParameters(afterSig);

    for (const param of beforeParams) {
      if (!afterParams.some(p => p.name === param.name) && !param.optional) {
        const lineNumber = getLineNumber(after, name);
        changes.push({
          type: 'function-signature',
          severity: 'critical',
          file: filePath,
          line: lineNumber,
          item: name,
          description: `Required parameter "${param.name}" was removed from function ${name}. This breaks existing calls.`,
          remediation: 'Make the parameter optional, or provide a migration guide.',
          confidence: 0.9,
        });
      }
    }

    // Check for parameter type changes (high severity)
    if (beforeSig !== afterSig && beforeParams.length === afterParams.length) {
      const lineNumber = getLineNumber(after, name);
      changes.push({
        type: 'type-change',
        severity: 'high',
        file: filePath,
        line: lineNumber,
        item: name,
        description: `Function signature of ${name} changed. Parameters or return type may have changed type.`,
        remediation: 'Ensure backward compatibility or document the type change.',
        confidence: 0.7,
      });
    }
  }

  return changes;
}

/**
 * Detect property removals from interfaces/classes
 */
function detectPropertyRemovals(before: string, after: string, filePath: string): BreakingChange[] {
  const changes: BreakingChange[] = [];

  const beforeProps = extractInterfaceProperties(before);
  const afterProps = extractInterfaceProperties(after);

  for (const [interfaceName, props] of beforeProps) {
    const afterInterfaceProps = afterProps.get(interfaceName);
    if (!afterInterfaceProps) continue;

    for (const prop of props) {
      if (!afterInterfaceProps.some(p => p.name === prop.name) && !prop.optional) {
        const lineNumber = getLineNumber(before, prop.name);
        changes.push({
          type: 'property-removal',
          severity: 'critical',
          file: filePath,
          line: lineNumber,
          item: `${interfaceName}.${prop.name}`,
          description: `Required property "${prop.name}" was removed from interface ${interfaceName}.`,
          remediation: 'Keep the property or make it optional.',
          confidence: 0.95,
        });
      }
    }
  }

  return changes;
}

/**
 * Detect interface changes
 */
function detectInterfaceChanges(before: string, after: string, filePath: string): BreakingChange[] {
  const changes: BreakingChange[] = [];

  const beforeInterfaces = extractInterfaces(before);
  const afterInterfaces = extractInterfaces(after);

  for (const interfaceName of beforeInterfaces) {
    if (!afterInterfaces.has(interfaceName)) {
      const lineNumber = getLineNumber(before, `interface ${interfaceName}`);
      changes.push({
        type: 'interface-change',
        severity: 'critical',
        file: filePath,
        line: lineNumber,
        item: interfaceName,
        description: `Interface ${interfaceName} was removed or renamed.`,
        remediation: 'Keep the interface or provide a migration path.',
        confidence: 0.95,
      });
    }
  }

  return changes;
}

// Helper functions

function extractExports(content: string): Set<string> {
  const exports = new Set<string>();
  const exportRegex = /export\s+(?:const|function|class|interface|type|enum)\s+(\w+)/g;
  let match;
  while ((match = exportRegex.exec(content))) {
    exports.add(match[1]);
  }
  return exports;
}

function extractFunctionSignatures(content: string): Map<string, string> {
  const functions = new Map<string, string>();
  const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\((.*?)\)\s*(?::\s*\w+)?/g;
  let match;
  while ((match = funcRegex.exec(content))) {
    functions.set(match[1], match[0]);
  }
  return functions;
}

function extractParameters(signature: string): Array<{ name: string; optional: boolean }> {
  const params: Array<{ name: string; optional: boolean }> = [];
  const paramRegex = /(\w+)\s*(\?)?(?:\s*:|:)?\s*\w+/g;
  let match;
  while ((match = paramRegex.exec(signature))) {
    params.push({
      name: match[1],
      optional: !!match[2],
    });
  }
  return params;
}

function extractInterfaceProperties(content: string): Map<string, Array<{ name: string; optional: boolean }>> {
  const properties = new Map<string, Array<{ name: string; optional: boolean }>>();
  const interfaceRegex = /interface\s+(\w+)\s*\{([^}]+)\}/g;
  let match;
  while ((match = interfaceRegex.exec(content))) {
    const interfaceName = match[1];
    const body = match[2];
    const props: Array<{ name: string; optional: boolean }> = [];
    const propRegex = /(\w+)\s*(\?)?:/g;
    let propMatch;
    while ((propMatch = propRegex.exec(body))) {
      props.push({
        name: propMatch[1],
        optional: !!propMatch[2],
      });
    }
    properties.set(interfaceName, props);
  }
  return properties;
}

function extractInterfaces(content: string): Set<string> {
  const interfaces = new Set<string>();
  const interfaceRegex = /interface\s+(\w+)/g;
  let match;
  while ((match = interfaceRegex.exec(content))) {
    interfaces.add(match[1]);
  }
  return interfaces;
}

function getLineNumber(content: string, searchTerm: string): number {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (new RegExp(searchTerm, 'i').test(lines[i])) {
      return i + 1;
    }
  }
  return 1;
}

/**
 * Suggest version bump based on detected changes
 */
export function suggestVersionBumpFromChanges(
  currentVersion: string,
  changes: BreakingChange[]
): VersionBumpSuggestion {
  const hasCritical = changes.some(c => c.severity === 'critical');
  const hasHigh = changes.some(c => c.severity === 'high');

  return {
    current: currentVersion,
    suggested: suggestVersionBump(currentVersion, hasCritical, hasHigh && !hasCritical),
    reason: hasCritical
      ? 'Critical breaking changes detected - major version bump required'
      : hasHigh
        ? 'High severity changes detected - minor version bump recommended'
        : 'No breaking changes - patch version bump',
    breakingChanges: changes,
  };
}

/**
 * Generate human-readable breaking change report
 */
export function generateBreakingChangeReport(changes: BreakingChange[]): string {
  if (changes.length === 0) {
    return 'No breaking changes detected ✓';
  }

  const lines = ['Breaking Changes Report:', ''];
  const grouped = changes.reduce(
    (acc, change) => {
      const key = change.severity;
      if (!acc[key]) acc[key] = [];
      acc[key].push(change);
      return acc;
    },
    {} as Record<string, BreakingChange[]>
  );

  const severityOrder = ['critical', 'high', 'medium'] as const;
  for (const severity of severityOrder) {
    if (grouped[severity]?.length) {
      lines.push(`${severity.toUpperCase()} (${grouped[severity].length})`);
      for (const change of grouped[severity]) {
        lines.push(`  - [${change.file}:${change.line}] ${change.item}: ${change.description}`);
        lines.push(`    Remediation: ${change.remediation}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
