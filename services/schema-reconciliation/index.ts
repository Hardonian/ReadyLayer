/**
 * Schema Reconciliation Service
 * 
 * Validates that database schema changes match application code assumptions
 * Prevents schema drift that causes runtime errors
 * 
 * Based on founder pain event: Schema drift causing production issues
 */

import { prisma } from '../../lib/prisma';
import { codeParserService } from '../code-parser';
import { Issue } from '../static-analysis';

export interface SchemaReconciliationRequest {
  repositoryId: string;
  prNumber: number;
  prSha: string;
  migrationFiles: Array<{ path: string; content: string }>;
  codeFiles: Array<{ path: string; content: string }>;
}

export interface SchemaReconciliationResult {
  issues: Issue[];
  isBlocked: boolean;
  blockedReason?: string;
}

export class SchemaReconciliationService {
  /**
   * Reconcile schema changes with code
   */
  async reconcile(request: SchemaReconciliationRequest): Promise<SchemaReconciliationResult> {
    const issues: Issue[] = [];

    // Extract schema changes from migration files
    const schemaChanges = this.extractSchemaChanges(request.migrationFiles);

    // Analyze code files for Prisma model usage
    const codeModelUsage = await this.extractModelUsage(request.codeFiles);

    // Check for mismatches
    for (const change of schemaChanges) {
      const mismatches = this.checkSchemaCodeMismatch(change, codeModelUsage);
      issues.push(...mismatches);
    }

    // Check for missing indexes (common AI mistake)
    const missingIndexes = this.checkMissingIndexes(schemaChanges, codeModelUsage);
    issues.push(...missingIndexes);

    // Check for RLS policy mismatches (Supabase-specific)
    const rlsMismatches = await this.checkRLSPolicies(schemaChanges, codeModelUsage);
    issues.push(...rlsMismatches);

    const isBlocked = issues.some(i => i.severity === 'critical' || i.severity === 'high');

    return {
      issues,
      isBlocked,
      blockedReason: isBlocked
        ? 'Schema changes do not match application code assumptions'
        : undefined,
    };
  }

  /**
   * Extract schema changes from migration files
   */
  private extractSchemaChanges(migrationFiles: Array<{ path: string; content: string }>): Array<{
    table: string;
    operation: 'create' | 'alter' | 'drop';
    columns?: string[];
    indexes?: string[];
    constraints?: string[];
  }> {
    const changes: Array<{
      table: string;
      operation: 'create' | 'alter' | 'drop';
      columns?: string[];
      indexes?: string[];
      constraints?: string[];
    }> = [];

    for (const file of migrationFiles) {
      const content = file.content;

      // Extract CREATE TABLE statements
      const createTableMatches = content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?/gi);
      for (const match of createTableMatches) {
        const tableName = match[1];
        const tableContent = this.extractTableDefinition(content, tableName);
        changes.push({
          table: tableName,
          operation: 'create',
          columns: this.extractColumns(tableContent),
          indexes: this.extractIndexes(content, tableName),
          constraints: this.extractConstraints(tableContent),
        });
      }

      // Extract ALTER TABLE statements
      const alterTableMatches = content.matchAll(/ALTER\s+TABLE\s+["']?(\w+)["']?/gi);
      for (const match of alterTableMatches) {
        changes.push({
          table: match[1],
          operation: 'alter',
        });
      }

      // Extract DROP TABLE statements
      const dropTableMatches = content.matchAll(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?["']?(\w+)["']?/gi);
      for (const match of dropTableMatches) {
        changes.push({
          table: match[1],
          operation: 'drop',
        });
      }
    }

    return changes;
  }

  /**
   * Extract model usage from code files
   */
  private async extractModelUsage(
    codeFiles: Array<{ path: string; content: string }>
  ): Promise<Map<string, Set<string>>> {
    const modelUsage = new Map<string, Set<string>>();

    for (const file of codeFiles) {
      // Only check TypeScript/JavaScript files
      if (!file.path.match(/\.(ts|tsx|js|jsx)$/)) {
        continue;
      }

      try {
        const parseResult = await codeParserService.parse(file.path, file.content);

        // Find Prisma client usage
        const prismaUsage = file.content.matchAll(/prisma\.(\w+)\.(\w+)/g);
        for (const match of prismaUsage) {
          const modelName = match[1];
          const operation = match[2];

          if (!modelUsage.has(modelName)) {
            modelUsage.set(modelName, new Set());
          }
          modelUsage.get(modelName)!.add(operation);
        }

        // Find Prisma model references in types
        const typeReferences = file.content.matchAll(/:\s*(\w+)\s*\[\]|:\s*(\w+)\s*\|/g);
        for (const match of typeReferences) {
          const modelName = match[1] || match[2];
          // Check if it looks like a Prisma model (capitalized, used with prisma.)
          if (modelName && modelName[0] === modelName[0].toUpperCase()) {
            if (!modelUsage.has(modelName)) {
              modelUsage.set(modelName, new Set());
            }
          }
        }
      } catch (error) {
        // Skip files that can't be parsed
        continue;
      }
    }

    return modelUsage;
  }

  /**
   * Check for schema-code mismatches
   */
  private checkSchemaCodeMismatch(
    schemaChange: {
      table: string;
      operation: 'create' | 'alter' | 'drop';
      columns?: string[];
    },
    codeModelUsage: Map<string, Set<string>>
  ): Issue[] {
    const issues: Issue[] = [];

    // Check if table being dropped is still used in code
    if (schemaChange.operation === 'drop') {
      const modelName = this.tableToModelName(schemaChange.table);
      if (codeModelUsage.has(modelName)) {
        issues.push({
          ruleId: 'founder.schema-drift',
          severity: 'critical',
          file: 'migration',
          line: 1,
          message: `CRITICAL: Table '${schemaChange.table}' is being dropped but model '${modelName}' is still used in code`,
          fix: 'Remove all references to this model from code before dropping the table',
          confidence: 0.95,
        });
      }
    }

    // Check if table being created matches Prisma schema expectations
    if (schemaChange.operation === 'create' && schemaChange.columns) {
      const modelName = this.tableToModelName(schemaChange.table);
      if (codeModelUsage.has(modelName)) {
        // Verify required fields exist (simplified check)
        const requiredFields = ['id', 'createdAt', 'updatedAt'];
        const hasRequiredFields = requiredFields.some(field =>
          schemaChange.columns!.some(col => col.toLowerCase().includes(field.toLowerCase()))
        );

        if (!hasRequiredFields) {
          issues.push({
            ruleId: 'founder.schema-drift',
            severity: 'high',
            file: 'migration',
            line: 1,
            message: `Table '${schemaChange.table}' missing common required fields (id, createdAt, updatedAt)`,
            fix: 'Ensure table has required fields matching Prisma schema',
            confidence: 0.8,
          });
        }
      }
    }

    return issues;
  }

  /**
   * Check for missing indexes
   */
  private checkMissingIndexes(
    schemaChanges: Array<{ table: string; indexes?: string[] }>,
    codeModelUsage: Map<string, Set<string>>
  ): Issue[] {
    const issues: Issue[] = [];

    // If code uses findMany with where clauses, should have indexes
    // This is simplified - would need deeper analysis
    for (const [modelName, operations] of codeModelUsage.entries()) {
      if (operations.has('findMany') || operations.has('findFirst')) {
        const tableName = this.modelToTableName(modelName);
        const schemaChange = schemaChanges.find(c => c.table === tableName);
        
        if (schemaChange && (!schemaChange.indexes || schemaChange.indexes.length === 0)) {
          issues.push({
            ruleId: 'founder.schema-drift',
            severity: 'medium',
            file: 'migration',
            line: 1,
            message: `Table '${tableName}' is queried but has no indexes - may cause performance issues`,
            fix: 'Add indexes for frequently queried columns',
            confidence: 0.6,
          });
        }
      }
    }

    return issues;
  }

  /**
   * Check RLS policy mismatches (Supabase-specific)
   */
  private async checkRLSPolicies(
    schemaChanges: Array<{ table: string }>,
    codeModelUsage: Map<string, Set<string>>
  ): Promise<Issue[]> {
    const issues: Issue[] = [];

    // Check if tables have RLS enabled but code doesn't handle it
    // This would require querying Supabase metadata
    // Simplified version: flag tables that might need RLS

    for (const change of schemaChanges) {
      if (change.operation === 'create') {
        const modelName = this.tableToModelName(change.table);
        if (codeModelUsage.has(modelName)) {
          // Check if this looks like a user-facing table that needs RLS
          if (change.table.includes('user') || 
              change.table.includes('organization') ||
              change.table.includes('repository')) {
            issues.push({
              ruleId: 'founder.schema-drift',
              severity: 'high',
              file: 'migration',
              line: 1,
              message: `Table '${change.table}' likely needs RLS policies for security`,
              fix: 'Add RLS policies to prevent unauthorized access',
              confidence: 0.7,
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * Helper: Extract table definition from SQL
   */
  private extractTableDefinition(content: string, tableName: string): string {
    const match = content.match(
      new RegExp(`CREATE\\s+TABLE\\s+.*?${tableName}.*?(\\([\\s\\S]*?\\));`, 'i')
    );
    return match ? match[1] : '';
  }

  /**
   * Helper: Extract columns from table definition
   */
  private extractColumns(tableDefinition: string): string[] {
    const columns: string[] = [];
    const columnMatches = tableDefinition.matchAll(/(\w+)\s+\w+/g);
    for (const match of columnMatches) {
      columns.push(match[1]);
    }
    return columns;
  }

  /**
   * Helper: Extract indexes from SQL
   */
  private extractIndexes(content: string, tableName: string): string[] {
    const indexes: string[] = [];
    const indexMatches = content.matchAll(
      new RegExp(`CREATE\\s+(?:UNIQUE\\s+)?INDEX.*?ON\\s+${tableName}`, 'gi')
    );
    for (const match of indexMatches) {
      indexes.push(match[0]);
    }
    return indexes;
  }

  /**
   * Helper: Extract constraints from table definition
   */
  private extractConstraints(tableDefinition: string): string[] {
    const constraints: string[] = [];
    const constraintMatches = tableDefinition.matchAll(
      /(?:PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK)\s*\([^)]+\)/gi
    );
    for (const match of constraintMatches) {
      constraints.push(match[0]);
    }
    return constraints;
  }

  /**
   * Helper: Convert table name to model name (snake_case to PascalCase)
   */
  private tableToModelName(tableName: string): string {
    return tableName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  /**
   * Helper: Convert model name to table name (PascalCase to snake_case)
   */
  private modelToTableName(modelName: string): string {
    return modelName
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }
}

export const schemaReconciliationService = new SchemaReconciliationService();
