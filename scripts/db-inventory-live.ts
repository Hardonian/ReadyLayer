#!/usr/bin/env tsx
/**
 * Database Inventory Script - Live State Discovery
 * 
 * Queries the live Supabase database to discover actual state:
 * - Tables, columns, types, defaults, nullability
 * - Indexes, constraints (PK, FK, UNIQUE, CHECK)
 * - Triggers
 * - Extensions
 * - RLS policies
 * - Functions (RPC)
 * - Storage buckets (if any)
 * - Realtime publications
 * 
 * Usage:
 *   DATABASE_URL="postgresql://..." tsx scripts/db-inventory-live.ts > live-inventory.json
 */

import { PrismaClient } from '@prisma/client';

interface TableColumn {
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

interface TableIndex {
  tableName: string;
  indexName: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
}

interface TableConstraint {
  tableName: string;
  constraintName: string;
  constraintType: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK';
  definition: string;
}

interface RLSPolicy {
  tableName: string;
  policyName: string;
  command: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  definition: string;
  checkExpression: string | null;
  usingExpression: string | null;
}

interface Trigger {
  tableName: string;
  triggerName: string;
  functionName: string;
  timing: 'BEFORE' | 'AFTER';
  events: string[];
}

interface DatabaseFunction {
  functionName: string;
  schema: string;
  returnType: string;
  arguments: string;
  securityType: 'DEFINER' | 'INVOKER';
}

interface Extension {
  name: string;
  version: string;
}

interface StorageBucket {
  name: string;
  public: boolean;
}

interface Inventory {
  timestamp: string;
  databaseUrl: string;
  tables: {
    name: string;
    rlsEnabled: boolean;
    rlsForced: boolean;
    columns: TableColumn[];
    indexes: TableIndex[];
    constraints: TableConstraint[];
    policies: RLSPolicy[];
    triggers: Trigger[];
  }[];
  functions: DatabaseFunction[];
  extensions: Extension[];
  storageBuckets: StorageBucket[];
  realtimePublications: string[];
}

const prisma = new PrismaClient();

async function inventoryLiveDatabase(): Promise<Inventory> {
  const timestamp = new Date().toISOString();
  const databaseUrl = process.env.DATABASE_URL || '';

  console.error(`🔍 Inventorying live database at ${timestamp}...`);

  // Get all tables in public schema
  const tablesResult = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE '_prisma%'
    ORDER BY tablename;
  `;

  const tableNames = tablesResult.map(t => t.tablename);

  console.error(`📊 Found ${tableNames.length} tables`);

  const tables = await Promise.all(
    tableNames.map(async (tableName) => {
      // Get columns
      const columnsResult = await prisma.$queryRaw<Array<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
        is_primary: boolean;
        is_foreign: boolean;
      }>>`
        SELECT 
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          EXISTS(
            SELECT 1 FROM pg_constraint pk 
            WHERE pk.conrelid = c.table_name::regclass 
            AND pk.contype = 'p' 
            AND pk.conkey[1] = c.ordinal_position
          ) as is_primary,
          EXISTS(
            SELECT 1 FROM pg_constraint fk 
            WHERE fk.conrelid = c.table_name::regclass 
            AND fk.contype = 'f'
          ) as is_foreign
        FROM information_schema.columns c
        WHERE c.table_schema = 'public' 
        AND c.table_name = ${tableName}
        ORDER BY c.ordinal_position;
      `;

      const columns: TableColumn[] = columnsResult.map(col => ({
        tableName,
        columnName: col.column_name,
        dataType: col.data_type,
        isNullable: col.is_nullable === 'YES',
        defaultValue: col.column_default,
        isPrimaryKey: col.is_primary,
        isForeignKey: col.is_foreign,
      }));

      // Get indexes
      const indexesResult = await prisma.$queryRaw<Array<{
        indexname: string;
        indexdef: string;
      }>>`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' 
        AND tablename = ${tableName};
      `;

      const indexes: TableIndex[] = indexesResult.map(idx => {
        const isUnique = idx.indexdef.includes('UNIQUE');
        const isPrimary = idx.indexdef.includes('PRIMARY KEY');
        const columnsMatch = idx.indexdef.match(/\(([^)]+)\)/);
        const columns = columnsMatch 
          ? columnsMatch[1].split(',').map(c => c.trim().replace(/"/g, ''))
          : [];
        
        return {
          tableName,
          indexName: idx.indexname,
          columns,
          isUnique,
          isPrimary,
        };
      });

      // Get constraints
      const constraintsResult = await prisma.$queryRaw<Array<{
        constraint_name: string;
        constraint_type: string;
        definition: string;
      }>>`
        SELECT 
          conname as constraint_name,
          CASE contype
            WHEN 'p' THEN 'PRIMARY KEY'
            WHEN 'f' THEN 'FOREIGN KEY'
            WHEN 'u' THEN 'UNIQUE'
            WHEN 'c' THEN 'CHECK'
            ELSE 'OTHER'
          END as constraint_type,
          pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = ${tableName}::regclass
        ORDER BY contype, conname;
      `;

      const constraints: TableConstraint[] = constraintsResult.map(con => ({
        tableName,
        constraintName: con.constraint_name,
        constraintType: con.constraint_type as TableConstraint['constraintType'],
        definition: con.definition,
      }));

      // Get RLS status
      const rlsResult = await prisma.$queryRaw<Array<{
        relrowsecurity: boolean;
        relforcerowsecurity: boolean;
      }>>`
        SELECT relrowsecurity, relforcerowsecurity
        FROM pg_class
        WHERE relname = ${tableName}
        AND relnamespace = 'public'::regnamespace;
      `;

      const rlsEnabled = rlsResult[0]?.relrowsecurity || false;
      const rlsForced = rlsResult[0]?.relforcerowsecurity || false;

      // Get RLS policies
      const policiesResult = await prisma.$queryRaw<Array<{
        policyname: string;
        cmd: string;
        qual: string | null;
        with_check: string | null;
      }>>`
        SELECT 
          policyname,
          CASE cmd
            WHEN 'r' THEN 'SELECT'
            WHEN 'a' THEN 'INSERT'
            WHEN 'w' THEN 'UPDATE'
            WHEN 'd' THEN 'DELETE'
            ELSE 'ALL'
          END as cmd,
          pg_get_expr(qual, polrelid) as qual,
          pg_get_expr(with_check, polrelid) as with_check
        FROM pg_policies
        WHERE schemaname = 'public' 
        AND tablename = ${tableName};
      `;

      const policies: RLSPolicy[] = policiesResult.map(pol => ({
        tableName,
        policyName: pol.policyname,
        command: pol.cmd as RLSPolicy['command'],
        definition: `${pol.cmd} policy`,
        checkExpression: pol.with_check,
        usingExpression: pol.qual,
      }));

      // Get triggers
      const triggersResult = await prisma.$queryRaw<Array<{
        trigger_name: string;
        action_timing: string;
        event_manipulation: string;
        action_statement: string;
      }>>`
        SELECT 
          trigger_name,
          action_timing,
          event_manipulation,
          action_statement
        FROM information_schema.triggers
        WHERE event_object_schema = 'public' 
        AND event_object_table = ${tableName};
      `;

      const triggers: Trigger[] = triggersResult.map(trig => {
        const functionMatch = trig.action_statement.match(/EXECUTE FUNCTION\s+([^(]+)/i);
        const functionName = functionMatch ? functionMatch[1].trim() : '';
        
        return {
          tableName,
          triggerName: trig.trigger_name,
          functionName,
          timing: trig.action_timing as 'BEFORE' | 'AFTER',
          events: [trig.event_manipulation],
        };
      });

      return {
        name: tableName,
        rlsEnabled,
        rlsForced,
        columns,
        indexes,
        constraints,
        policies,
        triggers,
      };
    })
  );

  // Get functions
  const functionsResult = await prisma.$queryRaw<Array<{
    routine_name: string;
    routine_schema: string;
    data_type: string;
    routine_definition: string;
    security_type: string;
  }>>`
    SELECT 
      routine_name,
      routine_schema,
      data_type,
      routine_definition,
      security_type
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION';
  `;

  const functions: DatabaseFunction[] = functionsResult.map(fn => ({
    functionName: fn.routine_name,
    schema: fn.routine_schema,
    returnType: fn.data_type,
    arguments: '', // Would need pg_get_function_arguments for full signature
    securityType: fn.security_type as 'DEFINER' | 'INVOKER',
  }));

  // Get extensions
  const extensionsResult = await prisma.$queryRaw<Array<{
    extname: string;
    extversion: string;
  }>>`
    SELECT extname, extversion
    FROM pg_extension
    ORDER BY extname;
  `;

  const extensions: Extension[] = extensionsResult.map(ext => ({
    name: ext.extname,
    version: ext.extversion,
  }));

  // Get storage buckets (if storage schema exists)
  let storageBuckets: StorageBucket[] = [];
  try {
    const bucketsResult = await prisma.$queryRaw<Array<{
      name: string;
      public: boolean;
    }>>`
      SELECT name, public
      FROM storage.buckets;
    `;
    storageBuckets = bucketsResult;
  } catch (error) {
    // Storage schema might not exist
    console.error('⚠️  Storage schema not accessible (this is OK if not using Supabase Storage)');
  }

  // Get realtime publications
  let realtimePublications: string[] = [];
  try {
    const pubResult = await prisma.$queryRaw<Array<{ pubname: string }>>`
      SELECT pubname 
      FROM pg_publication 
      WHERE pubname LIKE '%realtime%';
    `;
    realtimePublications = pubResult.map(p => p.pubname);
  } catch (error) {
    console.error('⚠️  Could not query publications');
  }

  return {
    timestamp,
    databaseUrl: databaseUrl.replace(/:[^:@]+@/, ':****@'), // Mask password
    tables,
    functions,
    extensions,
    storageBuckets,
    realtimePublications,
  };
}

async function main() {
  try {
    const inventory = await inventoryLiveDatabase();
    console.log(JSON.stringify(inventory, null, 2));
  } catch (error) {
    console.error('❌ Failed to inventory database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
