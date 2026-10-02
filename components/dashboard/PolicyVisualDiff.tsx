'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui'
import { comparePolicyRules, PolicySemanticDiff, RuleComparison } from '@/lib/policies/diff'
import { RotateCcw, GitCompare, PlusCircle, MinusCircle, AlertCircle, CheckCircle2 } from 'lucide-react'

export interface PolicyVersionItem {
  id: string
  version: string
  checksum: string
  source: string
  ruleCount: number
  rules: Array<{
    ruleId: string
    enabled?: boolean
    severityMapping?: Record<string, string>
    params?: Record<string, unknown>
  }>
  isCurrent: boolean
  createdAt: string
  updatedAt: string
}

interface PolicyVisualDiffProps {
  packId: string
  versions: PolicyVersionItem[]
  currentVersion: string
  onRollbackSuccess?: (newVersion: string) => void
}

export function PolicyVisualDiff({
  packId,
  versions,
  currentVersion,
  onRollbackSuccess,
}: PolicyVisualDiffProps): React.JSX.Element {
  const [targetVersionId, setTargetVersionId] = useState<string>(() => {
    const historical = versions.find((v) => !v.isCurrent)
    return historical ? historical.id : versions[0]?.id || ''
  })
  const [rollingBack, setRollingBack] = useState(false)
  const [rollbackError, setRollbackError] = useState<string | null>(null)
  const [rollbackSuccess, setRollbackSuccess] = useState<string | null>(null)

  const currentPackVersion = versions.find((v) => v.isCurrent) || versions[0]
  const targetPackVersion = versions.find((v) => v.id === targetVersionId) || versions[0]

  const diff: PolicySemanticDiff = comparePolicyRules(
    (currentPackVersion?.rules || []) as RuleComparison[],
    (targetPackVersion?.rules || []) as RuleComparison[],
    currentPackVersion?.version || currentVersion,
    targetPackVersion?.version || ''
  )

  const handleRollback = async (): Promise<void> => {
    if (!targetPackVersion || targetPackVersion.isCurrent) return
    const confirmed = window.confirm(
      `Are you sure you want to rollback this policy pack to version ${targetPackVersion.version}? This will overwrite active rules.`
    )
    if (!confirmed) return

    setRollingBack(true)
    setRollbackError(null)
    setRollbackSuccess(null)

    try {
      const res = await fetch(`/api/v1/policies/${packId}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPackId: targetPackVersion.id }),
      })

      const data = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        throw new Error(data.error?.message || 'Rollback failed');
      }

      setRollbackSuccess(`Successfully restored version ${targetPackVersion.version}`)
      if (onRollbackSuccess) {
        onRollbackSuccess(targetPackVersion.version)
      }
    } catch (err) {
      setRollbackError(err instanceof Error ? err.message : 'Rollback failed')
    } finally {
      setRollingBack(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Version Comparison Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-muted/40 rounded-lg border">
        <div className="flex items-center gap-3">
          <GitCompare className="h-5 w-5 text-primary" />
          <div>
            <div className="font-semibold text-sm">Compare with Historical Version</div>
            <div className="text-xs text-muted-foreground">
              Current active version: <span className="font-mono font-medium text-foreground">{currentVersion}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="target-version-select" className="text-xs text-muted-foreground font-medium">Compare to:</label>
          <select
            id="target-version-select"
            aria-label="Select target version to compare"
            className="px-3 py-1.5 rounded-md border text-sm bg-background font-mono focus:ring-1 focus:ring-primary"
            value={targetVersionId}
            onChange={(e) => setTargetVersionId(e.target.value)}
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.version} {v.isCurrent ? '(Current)' : `(${new Date(v.createdAt).toLocaleDateString()})`}
              </option>
            ))}
          </select>

          {!targetPackVersion?.isCurrent && (
            <Button
              variant="destructive"
              size="sm"
              disabled={rollingBack}
              onClick={handleRollback}
              className="gap-1.5"
            >
              <RotateCcw className={`h-4 w-4 ${rollingBack ? 'animate-spin' : ''}`} />
              {rollingBack ? 'Rolling back...' : `Rollback to v${targetPackVersion?.version}`}
            </Button>
          )}
        </div>
      </div>

      {rollbackSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-md text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {rollbackSuccess}
        </div>
      )}

      {rollbackError && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-md text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {rollbackError}
        </div>
      )}

      {/* Semantic Diff Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase font-medium">Added Rules</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              +{diff.summary.addedCount}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase font-medium">Removed Rules</div>
            <div className="text-2xl font-bold text-destructive">
              -{diff.summary.removedCount}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase font-medium">Modified Rules</div>
            <div className="text-2xl font-bold text-amber-500">
              ~{diff.summary.modifiedCount}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-muted-foreground">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase font-medium">Unchanged</div>
            <div className="text-2xl font-bold text-muted-foreground">
              ={diff.summary.unchangedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Semantic Differences Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span>Rule-Level Semantic Changes</span>
            <span className="text-xs font-normal text-muted-foreground">
              (Comparing v{diff.baseVersion} → v{diff.targetVersion})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!diff.hasChanges ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No differences detected between v{diff.baseVersion} and v{diff.targetVersion}. Both versions define identical rules and severity actions.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Added */}
              {diff.addedRules.map((rule) => (
                <div
                  key={`add_${rule.ruleId}`}
                  className="flex items-start justify-between p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/30"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      <PlusCircle className="h-4 w-4 shrink-0" />
                      <span>{rule.ruleId}</span>
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">Added</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      Actions: {JSON.stringify(rule.severityMapping || {})}
                    </div>
                  </div>
                </div>
              ))}

              {/* Removed */}
              {diff.removedRules.map((rule) => (
                <div
                  key={`rem_${rule.ruleId}`}
                  className="flex items-start justify-between p-3 rounded-lg border bg-destructive/5 border-destructive/30"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-mono text-sm font-semibold text-destructive line-through">
                      <MinusCircle className="h-4 w-4 shrink-0" />
                      <span>{rule.ruleId}</span>
                      <Badge variant="destructive">Removed</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      Prior Actions: {JSON.stringify(rule.severityMapping || {})}
                    </div>
                  </div>
                </div>
              ))}

              {/* Modified */}
              {diff.modifiedRules.map((mod) => (
                <div
                  key={`mod_${mod.ruleId}`}
                  className="p-3 rounded-lg border bg-amber-500/5 border-amber-500/30 space-y-2"
                >
                  <div className="flex items-center gap-2 font-mono text-sm font-semibold text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{mod.ruleId}</span>
                    <Badge variant="secondary">Modified</Badge>
                  </div>
                  <div className="space-y-1 pl-6">
                    {mod.changes.map((ch, idx) => (
                      <div key={idx} className="text-xs font-mono flex items-center gap-2">
                        <span className="text-muted-foreground">{ch.field}:</span>
                        <span className="text-destructive line-through bg-destructive/10 px-1 rounded">
                          {JSON.stringify(ch.from)}
                        </span>
                        <span>→</span>
                        <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded">
                          {JSON.stringify(ch.to)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
