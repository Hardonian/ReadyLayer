#!/usr/bin/env tsx

/**
 * Database Query Audit
 * 
 * Analyzes Prisma queries and logs to detect:
 * - N+1 query problems
 * - Slow queries
 * - Missing indexes
 * - Inefficient patterns
 * 
 * Run with: pnpm tsx scripts/db-query-audit.ts
 */

import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';
import type { Prisma } from '@prisma/client';
import { console } from './logger';

interface QueryMetric {
  query: string;
  model: string;
  operation: string;
  duration: number;
  timestamp: Date;
  count: number; // How many times executed in sequence
}

class QueryAuditor {
  private queryLog: QueryMetric[] = [];
  private queryPatterns: Map<string, number> = new Map();

  /**
   * Enable Prisma query logging
   */
  enableQueryLogging(): void {
    // @ts-expect-error - Prisma client type issue with $on method
    prisma.$on('query', (e: Prisma.QueryEvent) => {
      const metric: QueryMetric = {
        query: e.query,
        model: extractModelFromQuery(e.query),
        operation: extractOperationFromQuery(e.query),
        duration: e.duration,
        timestamp: new Date(),
        count: 1,
      };

      this.queryLog.push(metric);
      this.trackQueryPattern(metric);
    });
  }

  /**
   * Track recurring query patterns (N+1 detection)
   */
  private trackQueryPattern(metric: QueryMetric): void {
    const pattern = `${metric.model}:${metric.operation}`;
    const count = (this.queryPatterns.get(pattern) || 0) + 1;
    this.queryPatterns.set(pattern, count);
  }

  /**
   * Detect N+1 query problems
   */
  detectN1Queries(): Array<{
    pattern: string;
    count: number;
    avgDuration: number;
    recommendation: string;
  }> {
    const issues: Array<{
      pattern: string;
      count: number;
      avgDuration: number;
      recommendation: string;
    }> = [];

    // Queries executed more than 5 times in sequence = N+1
    for (const [pattern, count] of this.queryPatterns) {
      if (count > 5) {
        const relevantLogs = this.queryLog.filter(
          (q) => `${q.model}:${q.operation}` === pattern
        );
        const avgDuration =
          relevantLogs.reduce((sum, q) => sum + q.duration, 0) / relevantLogs.length;

        const [model, operation] = pattern.split(':');
        let recommendation = `Use \`include\` or \`select\` to fetch related ${model} data in a single query.`;

        if (operation === 'findUnique') {
          recommendation = `Consider using \`findMany\` with a WHERE clause instead of repeated \`findUnique\` calls.`;
        }

        issues.push({
          pattern,
          count,
          avgDuration,
          recommendation,
        });
      }
    }

    return issues.sort((a, b) => b.count - a.count);
  }

  /**
   * Detect slow queries
   */
  detectSlowQueries(thresholdMs: number = 100): Array<{
    query: string;
    duration: number;
    model: string;
    recommendation: string;
  }> {
    return this.queryLog
      .filter((q) => q.duration > thresholdMs)
      .map((q) => ({
        query: q.query.substring(0, 100),
        duration: q.duration,
        model: q.model,
        recommendation: `Consider adding an index on frequently filtered fields or using pagination.`,
      }))
      .sort((a, b) => b.duration - a.duration);
  }

  /**
   * Suggest missing indexes
   */
  suggestMissingIndexes(): string[] {
    const suggestions: string[] = [];

    // Analyze WHERE clauses
    for (const query of this.queryLog) {
      if (query.operation === 'findMany' && query.duration > 50) {
        const wherePattern = query.query.match(/WHERE\s+(\w+)\s*=/);
        if (wherePattern) {
          suggestions.push(
            `Consider adding an index on ${query.model}(${wherePattern[1]}) - this query took ${query.duration}ms`
          );
        }
      }
    }

    // Remove duplicates
    return [...new Set(suggestions)];
  }

  /**
   * Generate audit report
   */
  generateReport(): string {
    const n1Issues = this.detectN1Queries();
    const slowQueries = this.detectSlowQueries();
    const missingIndexes = this.suggestMissingIndexes();

    const lines = [
      `Database Query Audit Report`,
      `============================`,
      ``,
      `Generated: ${new Date().toISOString()}`,
      `Total Queries: ${this.queryLog.length}`,
      `Unique Patterns: ${this.queryPatterns.size}`,
      ``,
    ];

    // N+1 Issues
    if (n1Issues.length > 0) {
      lines.push(`⚠️  N+1 Query Issues Detected (${n1Issues.length})`);
      lines.push(`---`);
      for (const issue of n1Issues) {
        lines.push(`Pattern: ${issue.pattern}`);
        lines.push(`  Executed: ${issue.count} times`);
        lines.push(`  Avg Duration: ${issue.avgDuration.toFixed(2)}ms`);
        lines.push(`  Fix: ${issue.recommendation}`);
        lines.push('');
      }
    } else {
      lines.push(`✓ No N+1 query patterns detected`);
      lines.push('');
    }

    // Slow Queries
    if (slowQueries.length > 0) {
      lines.push(`🐢 Slow Queries (>100ms) (${slowQueries.length})`);
      lines.push(`---`);
      for (const query of slowQueries.slice(0, 10)) {
        lines.push(`Query: ${query.query}...`);
        lines.push(`  Model: ${query.model}`);
        lines.push(`  Duration: ${query.duration}ms`);
        lines.push(`  Suggestion: ${query.recommendation}`);
        lines.push('');
      }
    } else {
      lines.push(`✓ No slow queries detected (>100ms threshold)`);
      lines.push('');
    }

    // Missing Indexes
    if (missingIndexes.length > 0) {
      lines.push(`📊 Suggested Indexes (${missingIndexes.length})`);
      lines.push(`---`);
      for (const suggestion of missingIndexes.slice(0, 5)) {
        lines.push(`  • ${suggestion}`);
      }
      lines.push('');
    } else {
      lines.push(`✓ No missing indexes suggested`);
      lines.push('');
    }

    lines.push(`Summary`);
    lines.push(`-------`);
    lines.push(`Issues Found: ${n1Issues.length + slowQueries.length + missingIndexes.length}`);

    if (n1Issues.length + slowQueries.length + missingIndexes.length === 0) {
      lines.push(`✅ Database queries are optimized!`);
    } else {
      lines.push(`❌ Please address the issues above to improve performance`);
    }

    return lines.join('\n');
  }

  /**
   * Save report to file
   */
  saveReport(filename: string = 'db-audit-report.txt'): void {
    const report = this.generateReport();
    const filepath = path.join(process.cwd(), filename);
    fs.writeFileSync(filepath, report);
    console.log(report);
    console.log(`\n📄 Report saved to: ${filepath}`);
  }
}

// Helper functions
function extractModelFromQuery(query: string): string {
  const match = query.match(/SELECT.*FROM\s+"(\w+)"/);
  return match ? match[1] : 'Unknown';
}

function extractOperationFromQuery(query: string): string {
  if (query.includes('SELECT')) return 'find';
  if (query.includes('INSERT')) return 'create';
  if (query.includes('UPDATE')) return 'update';
  if (query.includes('DELETE')) return 'delete';
  return 'unknown';
}

/**
 * Run audit on a sample of real application queries
 */
async function runAudit(): Promise<void> {
  console.log('🔍 Starting Database Query Audit...\n');

  const auditor = new QueryAuditor();
  auditor.enableQueryLogging();

  try {
    // Run sample queries (modify based on your app)
    console.log('Running sample queries...');

    // Example: Get organizations (commonly the start of N+1)
    await prisma.organization.findMany({
      take: 5,
    });

    // Example: Get repos (may cause N+1 if not using include)
    await prisma.repository.findMany({
      take: 5,
    });

    // Wait a moment for all queries to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Generate and save report
    auditor.saveReport();
  } catch (error) {
    console.error('Audit error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run
runAudit().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
