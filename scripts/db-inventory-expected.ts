#!/usr/bin/env tsx
/**
 * Expected Database Contract Inventory
 * 
 * Builds expected backend contract from:
 * - Prisma schema (schema.prisma)
 * - Migration files
 * - App code references
 * 
 * Usage:
 *   tsx scripts/db-inventory-expected.ts > expected-inventory.json
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface ExpectedTable {
  name: string;
  columns: {
    name: string;
    type: string;
    nullable: boolean;
    defaultValue: string | null;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
  }[];
  indexes: {
    name: string;
    columns: string[];
    unique: boolean;
  }[];
  constraints: {
    name: string;
    type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK';
    definition: string;
  }[];
  rlsRequired: boolean;
  policies: {
    name: string;
    command: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
    using?: string;
    withCheck?: string;
  }[];
  triggers: {
    name: string;
    function: string;
    timing: 'BEFORE' | 'AFTER';
    events: string[];
  }[];
}

interface ExpectedContract {
  timestamp: string;
  source: 'prisma-schema' | 'migration-sql';
  tables: ExpectedTable[];
  functions: {
    name: string;
    schema: string;
    returnType: string;
    securityType: 'DEFINER' | 'INVOKER';
  }[];
  extensions: string[];
}

function parsePrismaSchema(): ExpectedContract {
  const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
  const schemaContent = readFileSync(schemaPath, 'utf-8');

  const tables: ExpectedTable[] = [];
  const models: string[] = [];

  // Extract model names
  const modelMatches = schemaContent.matchAll(/^model\s+(\w+)\s*\{/gm);
  for (const match of modelMatches) {
    models.push(match[1]);
  }

  // Parse each model
  for (const modelName of models) {
    const modelRegex = new RegExp(`^model\\s+${modelName}\\s*\\{([^}]+)\\}`, 'ms');
    const modelMatch = schemaContent.match(modelRegex);
    if (!modelMatch) continue;

    const modelBody = modelMatch[1];
    const columns: ExpectedTable['columns'] = [];
    const indexes: ExpectedTable['indexes'] = [];
    const constraints: ExpectedTable['constraints'] = [];

    // Parse fields
    const fieldMatches = modelBody.matchAll(/^\s+(\w+)\s+(\S+)(.*)$/gm);
    for (const fieldMatch of fieldMatches) {
      const [, fieldName, fieldType, modifiers] = fieldMatch;
      
      const isOptional = modifiers.includes('?');
      const isId = modifiers.includes('@id');
      const hasDefault = modifiers.match(/@default\(([^)]+)\)/);
      const isUnique = modifiers.includes('@unique');
      const isRelation = modifiers.includes('@relation');

      // Map Prisma types to PostgreSQL types
      let pgType = 'TEXT';
      if (fieldType === 'Int') pgType = 'INTEGER';
      else if (fieldType === 'BigInt') pgType = 'BIGINT';
      else if (fieldType === 'Float' || fieldType === 'Decimal') pgType = 'DECIMAL';
      else if (fieldType === 'Boolean') pgType = 'BOOLEAN';
      else if (fieldType === 'DateTime') pgType = 'TIMESTAMP(3)';
      else if (fieldType === 'Json') pgType = 'JSONB';
      else if (fieldType.startsWith('String')) pgType = 'TEXT';
      else if (fieldType.includes('[]')) pgType = 'TEXT[]';

      columns.push({
        name: fieldName,
        type: pgType,
        nullable: isOptional && !isId,
        defaultValue: hasDefault ? hasDefault[1] : null,
        isPrimaryKey: isId,
        isForeignKey: isRelation,
      });

      if (isUnique && !isId) {
        indexes.push({
          name: `${modelName}_${fieldName}_unique`,
          columns: [fieldName],
          unique: true,
        });
      }
    }

    // Parse indexes
    const indexMatches = modelBody.matchAll(/@@index\(\[([^\]]+)\](?:,\s*unique:\s*true)?\)/g);
    for (const indexMatch of indexMatches) {
      const columnsStr = indexMatch[1];
      const columns = columnsStr.split(',').map(c => c.trim().replace(/"/g, ''));
      const isUnique = indexMatch[0].includes('unique: true');
      
      indexes.push({
        name: `${modelName}_${columns.join('_')}_idx`,
        columns,
        unique: isUnique,
      });
    }

    // Parse unique constraints
    const uniqueMatches = modelBody.matchAll(/@@unique\(\[([^\]]+)\]\)/g);
    for (const uniqueMatch of uniqueMatches) {
      const columnsStr = uniqueMatch[1];
      const columns = columnsStr.split(',').map(c => c.trim().replace(/"/g, ''));
      
      constraints.push({
        name: `${modelName}_${columns.join('_')}_key`,
        type: 'UNIQUE',
        definition: `UNIQUE (${columns.map(c => `"${c}"`).join(', ')})`,
      });
    }

    // All tables should have RLS enabled (from migration)
    const rlsRequired = true;

    // Policies are defined in migration SQL, not Prisma schema
    // We'll extract them from the migration file
    const policies: ExpectedTable['policies'] = [];

    tables.push({
      name: modelName,
      columns,
      indexes,
      constraints,
      rlsRequired,
      policies,
      triggers: [], // Triggers defined in migration
    });
  }

  return {
    timestamp: new Date().toISOString(),
    source: 'prisma-schema',
    tables,
    functions: [], // Functions defined in migration
    extensions: ['uuid-ossp', 'pgcrypto'], // From migration
  };
}

function parseMigrationSQL(): Partial<ExpectedContract> {
  const migrationPath = join(
    process.cwd(),
    'backend',
    'prisma',
    'migrations',
    '20241230000000_init_readylayer',
    'migration.sql'
  );

  try {
    const migrationContent = readFileSync(migrationPath, 'utf-8');
    const tables: ExpectedTable[] = [];
    const functions: ExpectedContract['functions'] = [];
    const extensions: string[] = [];

    // Extract extensions
    const extMatches = migrationContent.matchAll(/CREATE EXTENSION IF NOT EXISTS "([^"]+)"/g);
    for (const match of extMatches) {
      extensions.push(match[1]);
    }

    // Extract tables (simplified - full parsing would be more complex)
    const tableMatches = migrationContent.matchAll(/CREATE TABLE IF NOT EXISTS "(\w+)"\s*\(/g);
    for (const tableMatch of tableMatches) {
      const tableName = tableMatch[1];
      
      // Extract RLS policies for this table
      const policyRegex = new RegExp(
        `(?:DROP POLICY IF EXISTS|CREATE POLICY)\\s+"([^"]+)"\\s+ON\\s+"${tableName}"[^;]+;`,
        'gs'
      );
      const policies: ExpectedTable['policies'] = [];
      const policyMatches = migrationContent.matchAll(policyRegex);
      for (const polMatch of policyMatches) {
        const policyDef = polMatch[0];
        const policyName = polMatch[1];
        
        let command: ExpectedTable['policies'][0]['command'] = 'ALL';
        if (policyDef.includes('FOR SELECT')) command = 'SELECT';
        else if (policyDef.includes('FOR INSERT')) command = 'INSERT';
        else if (policyDef.includes('FOR UPDATE')) command = 'UPDATE';
        else if (policyDef.includes('FOR DELETE')) command = 'DELETE';

        const usingMatch = policyDef.match(/USING\s+\(([^)]+)\)/);
        const withCheckMatch = policyDef.match(/WITH CHECK\s+\(([^)]+)\)/);

        policies.push({
          name: policyName,
          command,
          using: usingMatch ? usingMatch[1] : undefined,
          withCheck: withCheckMatch ? withCheckMatch[1] : undefined,
        });
      }

      // Extract triggers
      const triggerRegex = new RegExp(
        `CREATE TRIGGER\\s+(\\w+)\\s+(BEFORE|AFTER)\\s+(UPDATE|INSERT|DELETE)\\s+ON\\s+"${tableName}"`,
        'gi'
      );
      const triggers: ExpectedTable['triggers'] = [];
      const triggerMatches = migrationContent.matchAll(triggerRegex);
      for (const trigMatch of triggerMatches) {
        const triggerName = trigMatch[1];
        const timing = trigMatch[2] as 'BEFORE' | 'AFTER';
        const event = trigMatch[3];
        
        // Find function name
        const funcMatch = migrationContent.match(
          new RegExp(`${triggerName}[^;]+EXECUTE FUNCTION\\s+([^(]+)`, 'i')
        );
        const functionName = funcMatch ? funcMatch[1].trim() : '';

        triggers.push({
          name: triggerName,
          function: functionName,
          timing,
          events: [event],
        });
      }

      tables.push({
        name: tableName,
        columns: [], // Would need full SQL parsing
        indexes: [],
        constraints: [],
        rlsRequired: true,
        policies,
        triggers,
      });
    }

    // Extract functions
    const funcMatches = migrationContent.matchAll(
      /CREATE OR REPLACE FUNCTION\s+([^(]+)\([^)]*\)\s+RETURNS\s+(\w+)[^;]+SECURITY\s+(DEFINER|INVOKER)/gi
    );
    for (const funcMatch of funcMatches) {
      functions.push({
        name: funcMatch[1].trim(),
        schema: 'public',
        returnType: funcMatch[2],
        securityType: funcMatch[3] as 'DEFINER' | 'INVOKER',
      });
    }

    return { tables, functions, extensions };
  } catch (error) {
    console.error('⚠️  Could not parse migration SQL:', error);
    return {};
  }
}

async function main() {
  const prismaContract = parsePrismaSchema();
  const migrationContract = parseMigrationSQL();

  // Merge contracts (migration takes precedence for policies/triggers)
  const contract: ExpectedContract = {
    timestamp: new Date().toISOString(),
    source: 'prisma-schema',
    tables: prismaContract.tables.map(table => {
      const migrationTable = migrationContract.tables?.find(t => t.name === table.name);
      return {
        ...table,
        policies: migrationTable?.policies || table.policies,
        triggers: migrationTable?.triggers || table.triggers,
      };
    }),
    functions: migrationContract.functions || prismaContract.functions,
    extensions: [...new Set([...prismaContract.extensions, ...(migrationContract.extensions || [])])],
  };

  console.log(JSON.stringify(contract, null, 2));
}

main();
