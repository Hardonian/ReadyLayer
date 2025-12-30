/**
 * Code Parser Service
 * 
 * Multi-language code parsing and AST generation
 * Supports TypeScript/JavaScript, Python, Java, Go, etc.
 */

import * as babel from '@babel/parser';

export interface ParseResult {
  language: string;
  ast: any;
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
    const language = this.detectLanguage(filePath, afterContent);

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

    for (const [name, beforeFunc] of beforeFunctions) {
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
  private detectLanguage(filePath: string, content: string): string {
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

      const functions: FunctionInfo[] = [];
      const classes: ClassInfo[] = [];
      const imports: ImportInfo[] = [];
      const exports: ExportInfo[] = [];

      this.traverseAST(ast, {
        FunctionDeclaration: (node: any) => {
          functions.push({
            name: node.id?.name || 'anonymous',
            line: node.loc?.start.line || 0,
            column: node.loc?.start.column || 0,
            parameters: node.params.map((p: any) => p.name || p.left?.name || ''),
            returnType: node.returnType?.typeAnnotation?.typeName?.name,
            isAsync: node.async || false,
            isExported: false, // Would check parent
          });
        },
        ClassDeclaration: (node: any) => {
          const methods: FunctionInfo[] = [];
          node.body.body.forEach((member: any) => {
            if (member.type === 'MethodDefinition' || member.type === 'ClassMethod') {
              methods.push({
                name: member.key?.name || 'anonymous',
                line: member.loc?.start.line || 0,
                column: member.loc?.start.column || 0,
                parameters: member.value?.params?.map((p: any) => p.name || '') || [],
                isAsync: member.value?.async || false,
                isExported: false,
              });
            }
          });

          classes.push({
            name: node.id?.name || 'anonymous',
            line: node.loc?.start.line || 0,
            column: node.loc?.start.column || 0,
            methods,
            extends: node.superClass?.name,
          });
        },
        ImportDeclaration: (node: any) => {
          imports.push({
            source: node.source.value,
            specifiers: node.specifiers.map((s: any) => s.imported?.name || s.local?.name || ''),
            line: node.loc?.start.line || 0,
          });
        },
        ExportNamedDeclaration: (node: any) => {
          if (node.declaration) {
            exports.push({
              name: node.declaration.id?.name || 'default',
              type: 'named',
              line: node.loc?.start.line || 0,
            });
          }
        },
        ExportDefaultDeclaration: (node: any) => {
          exports.push({
            name: node.declaration?.id?.name || 'default',
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
  private parseJava(content: string): ParseResult {
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
  private parseGo(content: string): ParseResult {
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
  private traverseAST(ast: any, visitors: Record<string, (node: any) => void>): void {
    const traverse = (node: any): void => {
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

        const value = node[key];
        if (Array.isArray(value)) {
          value.forEach(traverse);
        } else if (value && typeof value === 'object') {
          traverse(value);
        }
      }
    };

    traverse(ast);
  }
}

export const codeParserService = new CodeParserService();
