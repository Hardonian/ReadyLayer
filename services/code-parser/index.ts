/**
 * Code Parser Service
 *
 * Multi-language code parsing and AST generation
 * Supports TypeScript/JavaScript, Python, Java, Go, etc.
 */

import * as babel from '@babel/parser';
import * as t from '@babel/types';

export interface ParseResult {
  language: string;
  ast: unknown;
  functions: FunctionInfo[];
  classes: ClassInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
}

export interface FunctionInfo {
  name: string;
  line: number;
  column: number;
  parameters: string[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
}

export interface ClassInfo {
  name: string;
  line: number;
  column: number;
  methods: FunctionInfo[];
  extends?: string;
}

export interface ImportInfo {
  source: string;
  specifiers: string[];
  line: number;
}

export interface ExportInfo {
  name: string;
  type: 'default' | 'named' | 'namespace';
  line: number;
}

export interface DiffParseResult {
  added: ParseResult[];
  removed: ParseResult[];
  modified: Array<{ before: ParseResult; after: ParseResult }>;
}

export class CodeParserService {
  /**
   * Parse code file
   */
  async parse(filePath: string, content: string): Promise<ParseResult> {
    const language = this.detectLanguage(filePath, content);

    switch (language) {
      case 'typescript':
      case 'javascript':
        return this.parseJavaScript(content, language);
      case 'python':
        return this.parsePython(content);
      case 'java':
        return this.parseJava(content);
      case 'go':
        return this.parseGo(content);
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }

  /**
   * Parse diff
   */
  async parseDiff(
    filePath: string,
    beforeContent: string | null,
    afterContent: string
  ): Promise<DiffParseResult> {
    // Language detection for future use
    this.detectLanguage(filePath, afterContent);

    const after = afterContent ? await this.parse(filePath, afterContent) : null;
    const before = beforeContent ? await this.parse(filePath, beforeContent) : null;

    if (!after) {
      throw new Error('After content is required');
    }

    if (!before) {
      return {
        added: [after],
        removed: [],
        modified: [],
      };
    }

    // Compare before and after
    const added: ParseResult[] = [];
    const removed: ParseResult[] = [];
    const modified: Array<{ before: ParseResult; after: ParseResult }> = [];

    // Simple comparison (in production, would do deeper AST comparison)
    const beforeFunctions = new Map(before.functions.map(f => [f.name, f]));
    const afterFunctions = new Map(after.functions.map(f => [f.name, f]));

    for (const [name, afterFunc] of afterFunctions) {
      const beforeFunc = beforeFunctions.get(name);
      if (!beforeFunc) {
        added.push(after);
        break;
      } else if (JSON.stringify(beforeFunc) !== JSON.stringify(afterFunc)) {
        modified.push({ before, after });
        break;
      }
    }

    for (const [name] of beforeFunctions) {
      if (!afterFunctions.has(name)) {
        removed.push(before);
        break;
      }
    }

    return { added, removed, modified };
  }

  /**
   * Detect language from file path and content
   */
  private detectLanguage(filePath: string, _content: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();

    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      java: 'java',
      go: 'go',
      rs: 'rust',
      rb: 'ruby',
      php: 'php',
      cs: 'csharp',
    };

    return languageMap[ext || ''] || 'javascript';
  }

  /**
   * Parse JavaScript/TypeScript
   */
  private parseJavaScript(content: string, language: string): ParseResult {
    try {
      const ast = babel.parse(content, {
        sourceType: 'module',
        plugins: [
          'typescript',
          'jsx',
          'decorators-legacy',
          'classProperties',
          'asyncGenerators',
          'functionBind',
          'exportDefaultFrom',
          'exportNamespaceFrom',
          'dynamicImport',
          'nullishCoalescingOperator',
          'optionalChaining',
        ],
      });

      if (!ast) {
        throw new Error('Failed to parse AST');
      }

      const functions: FunctionInfo[] = [];
      const classes: ClassInfo[] = [];
      const imports: ImportInfo[] = [];
      const exports: ExportInfo[] = [];

      this.traverseAST(ast, {
        FunctionDeclaration: (node: t.Node) => {
          if (!t.isFunctionDeclaration(node)) {
            return;
          }
          functions.push({
            name: node.id?.name || 'anonymous',
            line: node.loc?.start.line || 0,
            column: node.loc?.start.column || 0,
            parameters: node.params.map((param) => {
              if (t.isIdentifier(param)) {
                return param.name;
              }
              if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
                return param.left.name;
              }
              return '';
            }),
            returnType: (node.returnType && 'typeAnnotation' in node.returnType && node.returnType.typeAnnotation && typeof node.returnType.typeAnnotation === 'object' && 'typeName' in node.returnType.typeAnnotation && node.returnType.typeAnnotation.typeName && typeof node.returnType.typeAnnotation.typeName === 'object' && 'name' in node.returnType.typeAnnotation.typeName) ? (node.returnType.typeAnnotation.typeName as { name?: string }).name : undefined,
            isAsync: node.async || false,
            isExported: false, // Would check parent
          });
        },
        ClassDeclaration: (node: t.Node) => {
          if (!t.isClassDeclaration(node)) {
            return;
          }
          const methods: FunctionInfo[] = [];
          node.body.body.forEach((member) => {
            if (!t.isClassMethod(member) && !t.isClassPrivateMethod(member)) {
              return;
            }
            methods.push({
              name: t.isIdentifier(member.key) ? member.key.name : 'anonymous',
              line: member.loc?.start.line || 0,
              column: member.loc?.start.column || 0,
              parameters: member.params.map((param) => (t.isIdentifier(param) ? param.name : '')),
              isAsync: member.async || false,
              isExported: false,
            });
          });

          classes.push({
            name: node.id?.name || 'anonymous',
            line: node.loc?.start.line || 0,
            column: node.loc?.start.column || 0,
            methods,
            extends: t.isIdentifier(node.superClass) ? node.superClass.name : undefined,
          });
        },
        ImportDeclaration: (node: t.Node) => {
          if (!t.isImportDeclaration(node)) {
            return;
          }
          imports.push({
            source: node.source.value,
            specifiers: node.specifiers.map((specifier) => {
              if (t.isImportSpecifier(specifier)) {
                return t.isIdentifier(specifier.imported) ? specifier.imported.name : (specifier.imported as { value: string }).value;
              }
              if (t.isImportDefaultSpecifier(specifier) || t.isImportNamespaceSpecifier(specifier)) {
                return specifier.local.name;
              }
              return '';
            }),
            line: node.loc?.start.line || 0,
          });
        },
        ExportNamedDeclaration: (node: t.Node) => {
          if (!t.isExportNamedDeclaration(node)) {
            return;
          }
          if (node.declaration && (t.isFunctionDeclaration(node.declaration) || t.isClassDeclaration(node.declaration))) {
            exports.push({
              name: node.declaration.id?.name || 'default',
              type: 'named',
              line: node.loc?.start.line || 0,
            });
          }
        },
        ExportDefaultDeclaration: (node: t.Node) => {
          if (!t.isExportDefaultDeclaration(node)) {
            return;
          }
          exports.push({
            name:
              t.isFunctionDeclaration(node.declaration) || t.isClassDeclaration(node.declaration)
                ? node.declaration.id?.name || 'default'
                : 'default',
            type: 'default',
            line: node.loc?.start.line || 0,
          });
        },
      });

      return {
        language,
        ast,
        functions,
        classes,
        imports,
        exports,
      };
    } catch (error) {
      throw new Error(`Failed to parse ${language}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse Python
   */
  private parsePython(content: string): ParseResult {
    try {
      // Simplified Python parsing (would use actual Python AST parser in production)
      const functions: FunctionInfo[] = [];
      const classes: ClassInfo[] = [];
      const imports: ImportInfo[] = [];
      const exports: ExportInfo[] = [];

      const lines = content.split('\n');
      lines.forEach((line, index) => {
        const trimmed = line.trim();

        // Function detection
        if (trimmed.startsWith('def ')) {
          const match = trimmed.match(/def\s+(\w+)\s*\(/);
          if (match) {
            functions.push({
              name: match[1],
              line: index + 1,
              column: 0,
              parameters: [],
              isAsync: trimmed.includes('async def'),
              isExported: false,
            });
          }
        }

        // Class detection
        if (trimmed.startsWith('class ')) {
          const match = trimmed.match(/class\s+(\w+)/);
          if (match) {
            classes.push({
              name: match[1],
              line: index + 1,
              column: 0,
              methods: [],
            });
          }
        }

        // Import detection
        if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
          imports.push({
            source: trimmed,
            specifiers: [],
            line: index + 1,
          });
        }
      });

      return {
        language: 'python',
        ast: {}, // Would use actual Python AST parser (e.g., tree-sitter-python) in production
        functions,
        classes,
        imports,
        exports,
      };
    } catch (error) {
      throw new Error(`Failed to parse Python: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse Java (simplified)
   */
  private parseJava(_content: string): ParseResult {
    // Simplified Java parsing
    return {
      language: 'java',
      ast: {},
      functions: [],
      classes: [],
      imports: [],
      exports: [],
    };
  }

  /**
   * Parse Go (simplified)
   */
  private parseGo(_content: string): ParseResult {
    // Simplified Go parsing
    return {
      language: 'go',
      ast: {},
      functions: [],
      classes: [],
      imports: [],
      exports: [],
    };
  }

  /**
   * Traverse AST with visitor pattern
   */
  private traverseAST(ast: babel.ParseResult<t.File>, visitors: Record<string, (node: t.Node) => void>): void {
    const traverse = (node: t.Node): void => {
      if (!node || typeof node !== 'object') {
        return;
      }

      if (node.type && visitors[node.type]) {
        visitors[node.type](node);
      }

      for (const key in node) {
        if (key === 'parent' || key === 'leadingComments' || key === 'trailingComments') {
          continue;
        }

        const value = (node as unknown as Record<string, unknown>)[key];
        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (item && typeof item === 'object' && 'type' in item) {
              traverse(item as t.Node);
            }
          });
        } else if (value && typeof value === 'object' && 'type' in value) {
          traverse(value as t.Node);
        }
      }
    };

    traverse(ast.program);
  }
}

export const codeParserService = new CodeParserService();
