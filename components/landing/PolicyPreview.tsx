'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Shield, Code, XCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { fadeIn } from '@/lib/design/motion'

interface PolicyPreviewProps {
  className?: string
}

type PolicyRule = {
  id: string
  rule: string
  action: 'block' | 'warn'
  severity?: 'critical' | 'high' | 'medium' | 'low'
  threshold?: string
}

const defaultPolicies = {
  security: {
    name: 'Security Policy',
    description: 'Block PRs with high-severity security findings',
    enabled: true,
    rules: [
      {
        id: 'block-critical-security',
        rule: 'Block PRs with critical security findings',
        severity: 'critical' as const,
        action: 'block' as const,
      },
      {
        id: 'block-high-security',
        rule: 'Block PRs with high-severity security findings',
        severity: 'high' as const,
        action: 'block' as const,
      },
      {
        id: 'warn-medium-security',
        rule: 'Warn on medium-severity security findings',
        severity: 'medium' as const,
        action: 'warn' as const,
      },
    ] satisfies PolicyRule[],
  },
  tests: {
    name: 'Test Coverage Policy',
    description: 'Require tests for AI-modified files',
    enabled: true,
    rules: [
      {
        id: 'require-tests-ai-files',
        rule: 'Require tests for AI-modified files',
        action: 'block' as const,
      },
      {
        id: 'coverage-threshold',
        rule: 'Fail if coverage drops below 80%',
        threshold: '80%',
        action: 'block' as const,
      },
    ] satisfies PolicyRule[],
  },
  docs: {
    name: 'Documentation Policy',
    description: 'Fail if OpenAPI changes are undocumented',
    enabled: true,
    rules: [
      {
        id: 'require-openapi-docs',
        rule: 'Fail if OpenAPI changes are undocumented',
        action: 'block' as const,
      },
      {
        id: 'require-readme-updates',
        rule: 'Warn if API changes lack README updates',
        action: 'warn' as const,
      },
    ] satisfies PolicyRule[],
  },
}

export function PolicyPreview({ className }: PolicyPreviewProps) {
  const [selectedPolicy, setSelectedPolicy] = React.useState<keyof typeof defaultPolicies>('security')
  const prefersReducedMotion = React.useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  const policy = React.useMemo(() => {
    try {
      return defaultPolicies[selectedPolicy] || defaultPolicies.security
    } catch {
      return defaultPolicies.security
    }
  }, [selectedPolicy])

  return (
    <motion.div
      className={cn('w-full', className)}
      variants={prefersReducedMotion ? fadeIn : undefined}
      initial="hidden"
      animate="visible"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Default Policies
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Preview
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={selectedPolicy} onValueChange={(v) => setSelectedPolicy(v as typeof selectedPolicy)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="security" className="text-xs">
                Security
              </TabsTrigger>
              <TabsTrigger value="tests" className="text-xs">
                Tests
              </TabsTrigger>
              <TabsTrigger value="docs" className="text-xs">
                Docs
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedPolicy} className="mt-4">
              <div className="space-y-3">
                <div className="p-3 rounded-md border border-border-subtle bg-surface-muted">
                  <div className="font-semibold text-sm mb-1">{policy.name}</div>
                  <div className="text-xs text-text-muted">{policy.description}</div>
                </div>

                <div className="space-y-2">
                  {policy.rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-start gap-3 p-3 rounded-md border border-border-subtle bg-surface-raised"
                    >
                      {rule.action === 'block' ? (
                        <XCircle className="h-4 w-4 text-danger mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{rule.rule}</span>
                          <Badge
                            variant={rule.action === 'block' ? 'destructive' : 'warning'}
                            className="text-xs"
                          >
                            {rule.action === 'block' ? 'Blocks merge' : 'Warns'}
                          </Badge>
                          {rule.severity && (
                            <Badge variant="outline" className="text-xs">
                              {rule.severity}
                            </Badge>
                          )}
                          {rule.threshold && (
                            <Badge variant="outline" className="text-xs">
                              Threshold: {rule.threshold}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 rounded-md border border-border-subtle bg-surface-muted">
                  <div className="flex items-center gap-2 mb-2">
                    <Code className="h-4 w-4 text-accent" />
                    <span className="text-xs font-semibold">Policy Definition (YAML)</span>
                  </div>
                  <pre className="text-xs font-mono text-text-muted whitespace-pre-wrap overflow-x-auto">
{`version: "1.0"
rules:
  - ruleId: "${policy.rules[0].id}"
    enabled: true
    severityMapping:
      ${policy.rules[0].severity ? `${policy.rules[0].severity}: ${policy.rules[0].action}` : `default: ${policy.rules[0].action}`}
    ${policy.rules[0].threshold ? `params:\n      coverageThreshold: ${policy.rules[0].threshold}` : ''}
  - ruleId: "${policy.rules[1]?.id || 'example-rule'}"
    enabled: true
    severityMapping:
      ${policy.rules[1]?.severity ? `${policy.rules[1].severity}: ${policy.rules[1].action}` : `default: ${policy.rules[1]?.action || 'warn'}`}`}
                  </pre>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  )
}
