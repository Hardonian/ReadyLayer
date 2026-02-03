'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/lib/hooks/use-toast'

interface JobForgeActionResult {
  status: 'disabled' | 'queued'
  message: string
  job?: {
    id: string
    type: string
    status: string
    result_id?: string | null
    created_at?: string
  }
}

interface JobForgeReportResult {
  status: 'ok'
  result: {
    id: string
    job_id: string
    tenant_id: string
    result: Record<string, unknown>
    artifact_ref?: string | null
    created_at?: string
  }
}

function safeParseJson(value: string): Record<string, unknown> {
  if (!value.trim()) return {}
  const parsed = JSON.parse(value) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSON input must be an object')
  }
  return parsed as Record<string, unknown>
}

export default function JobForgeAdminPage(): React.JSX.Element {
  const { toast } = useToast()
  const [tenantId, setTenantId] = useState('')
  const [projectId, setProjectId] = useState('')

  const [eventType, setEventType] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [eventData, setEventData] = useState('{}')
  const [secretRef, setSecretRef] = useState('')
  const [timeoutMs, setTimeoutMs] = useState('10000')

  const [moduleName, setModuleName] = useState('')
  const [moduleInput, setModuleInput] = useState('{}')

  const [reportResultId, setReportResultId] = useState('')
  const [reportResult, setReportResult] = useState<JobForgeReportResult | null>(null)

  const [bundleId, setBundleId] = useState('')
  const [bundleType, setBundleType] = useState('')
  const [bundleInputs, setBundleInputs] = useState('{}')
  const [bundleExecute, setBundleExecute] = useState(false)

  const [lastAction, setLastAction] = useState<JobForgeActionResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmitEvent = async () => {
    try {
      setLoading(true)
      const payload = {
        action: 'submit_event',
        tenantId,
        projectId,
        targetUrl,
        eventType,
        data: safeParseJson(eventData),
        secretRef: secretRef || undefined,
        timeoutMs: Number(timeoutMs) || undefined,
      }

      const response = await fetch('/api/admin/jobforge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = (await response.json()) as { data?: JobForgeActionResult; error?: { message?: string } }

      if (!response.ok || !result.data) {
        throw new Error(result.error?.message || 'Failed to submit event')
      }

      setLastAction(result.data)
      toast({ title: 'Event submitted', description: result.data.message })
    } catch (error) {
      toast({
        title: 'Event failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleModuleDryRun = async () => {
    try {
      setLoading(true)
      const payload = {
        action: 'run_module_dry_run',
        tenantId,
        projectId,
        moduleName,
        input: safeParseJson(moduleInput),
      }

      const response = await fetch('/api/admin/jobforge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = (await response.json()) as { data?: JobForgeActionResult; error?: { message?: string } }

      if (!response.ok || !result.data) {
        throw new Error(result.error?.message || 'Failed to run module dry-run')
      }

      setLastAction(result.data)
      toast({ title: 'Dry-run queued', description: result.data.message })
    } catch (error) {
      toast({
        title: 'Dry-run failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFetchReport = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        tenantId,
        projectId,
        resultId: reportResultId,
      })

      const response = await fetch(`/api/admin/jobforge?${params.toString()}`)
      const result = (await response.json()) as { data?: JobForgeReportResult; error?: { message?: string } }

      if (!response.ok || !result.data) {
        throw new Error(result.error?.message || 'Failed to fetch report')
      }

      setReportResult(result.data)
      toast({ title: 'Report loaded', description: 'Report data fetched from JobForge.' })
    } catch (error) {
      toast({
        title: 'Report fetch failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBundleExecution = async () => {
    try {
      setLoading(true)
      const payload = {
        action: 'request_bundle_execution',
        tenantId,
        projectId,
        bundleId,
        bundleType: bundleType || undefined,
        inputs: safeParseJson(bundleInputs),
        execute: bundleExecute,
      }

      const response = await fetch('/api/admin/jobforge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = (await response.json()) as { data?: JobForgeActionResult; error?: { message?: string } }

      if (!response.ok || !result.data) {
        throw new Error(result.error?.message || 'Failed to request bundle execution')
      }

      setLastAction(result.data)
      toast({ title: 'Bundle request sent', description: result.data.message })
    } catch (error) {
      toast({
        title: 'Bundle request failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">JobForge Admin</h1>
          <p className="text-muted-foreground mt-2">
            Submit events, run module dry-runs, and inspect JobForge reports.
          </p>
        </div>
        <Badge variant="outline">Admin only</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenant & Project</CardTitle>
          <CardDescription>Explicitly map each request to a tenant and project.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tenant ID</label>
            <Input value={tenantId} onChange={(event) => setTenantId(event.target.value)} placeholder="UUID" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Project ID</label>
            <Input value={projectId} onChange={(event) => setProjectId(event.target.value)} placeholder="Repository ID" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Submit Event</CardTitle>
            <CardDescription>Queue a webhook delivery event through JobForge.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Event Type</label>
              <Input value={eventType} onChange={(event) => setEventType(event.target.value)} placeholder="event.type" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target URL</label>
              <Input value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} placeholder="https://example.com/webhook" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Event Data (JSON)</label>
              <Textarea value={eventData} onChange={(event) => setEventData(event.target.value)} rows={6} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Secret Ref (optional)</label>
                <Input value={secretRef} onChange={(event) => setSecretRef(event.target.value)} placeholder="JOBFORGE_WEBHOOK_SECRET" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Timeout (ms)</label>
                <Input value={timeoutMs} onChange={(event) => setTimeoutMs(event.target.value)} placeholder="10000" />
              </div>
            </div>
            <Button onClick={handleSubmitEvent} disabled={loading}>
              Submit Event
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Module Dry-Run</CardTitle>
            <CardDescription>Simulate a module run without side effects.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Module Name</label>
              <Input value={moduleName} onChange={(event) => setModuleName(event.target.value)} placeholder="policy-engine" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Module Input (JSON)</label>
              <Textarea value={moduleInput} onChange={(event) => setModuleInput(event.target.value)} rows={6} />
            </div>
            <Button onClick={handleModuleDryRun} disabled={loading}>
              Run Dry-Run
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Report Viewer</CardTitle>
            <CardDescription>Inspect report outputs from JobForge results.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Result ID</label>
              <Input value={reportResultId} onChange={(event) => setReportResultId(event.target.value)} placeholder="Result UUID" />
            </div>
            <Button onClick={handleFetchReport} disabled={loading}>
              View Report
            </Button>
            {reportResult && (
              <pre className="rounded-md bg-muted p-4 text-xs overflow-auto">
                {JSON.stringify(reportResult, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bundle Execution (Gated)</CardTitle>
            <CardDescription>
              Request a bundle execution plan. Execution requires JOBFORGE_BUNDLE_EXECUTION_ENABLED=1.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bundle ID</label>
              <Input value={bundleId} onChange={(event) => setBundleId(event.target.value)} placeholder="bundle-id" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bundle Type (optional)</label>
              <Input value={bundleType} onChange={(event) => setBundleType(event.target.value)} placeholder="evidence" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bundle Inputs (JSON)</label>
              <Textarea value={bundleInputs} onChange={(event) => setBundleInputs(event.target.value)} rows={6} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-muted-foreground"
                checked={bundleExecute}
                onChange={(event) => setBundleExecute(event.target.checked)}
              />
              Execute bundle (gated)
            </label>
            <Button onClick={handleBundleExecution} disabled={loading}>
              Request Bundle Execution
            </Button>
          </CardContent>
        </Card>
      </div>

      {lastAction && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Action</CardTitle>
            <CardDescription>Most recent JobForge response.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="rounded-md bg-muted p-4 text-xs overflow-auto">
              {JSON.stringify(lastAction, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

