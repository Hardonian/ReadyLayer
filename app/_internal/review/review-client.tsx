'use client'

import type * as React from 'react'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle, ErrorState, Skeleton } from '@/components/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useOrganizationId } from '@/lib/hooks'
import { useRuntimeUiConfig } from '@/components/providers/runtime-ui-config-provider'
import { getRuntimeCopy } from '@/lib/runtime-ui-config'

type DemoState = 'normal' | 'loading' | 'empty' | 'error'
type BannerVariant = 'info' | 'success' | 'warning' | 'danger'

export default function ReviewClient(): React.JSX.Element {
  const { organizationId, loading: orgLoading } = useOrganizationId()
  const runtime = useRuntimeUiConfig()
  const [demoState, setDemoState] = useState<DemoState>('normal')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState<string | null>(null)

  const routes = useMemo(
    () => ({
      public: [
        { href: '/', label: 'Landing' },
        { href: '/pricing', label: 'Pricing' },
        { href: '/how-it-works', label: 'How it works' },
        { href: '/help', label: 'Help' },
      ],
      dashboard: [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/dashboard/runs', label: 'Runs' },
        { href: '/dashboard/findings', label: 'Findings' },
        { href: '/dashboard/policies', label: 'Policies' },
        { href: '/dashboard/audit', label: 'Audit' },
        { href: '/dashboard/billing', label: 'Billing' },
        { href: '/dashboard/settings', label: 'Settings' },
        { href: '/dashboard/repos', label: 'Repos' },
        { href: '/dashboard/prs', label: 'PRs' },
        { href: '/dashboard/metrics', label: 'Metrics' },
        { href: '/dashboard/readiness', label: 'Readiness' },
      ],
    }),
    []
  )

  const [radiusSm, setRadiusSm] = useState(runtime.config.tokens.radius.sm)
  const [radiusMd, setRadiusMd] = useState(runtime.config.tokens.radius.md)
  const [radiusLg, setRadiusLg] = useState(runtime.config.tokens.radius.lg)
  const [radiusBase, setRadiusBase] = useState(runtime.config.tokens.radius.base)

  const [bannerEnabled, setBannerEnabled] = useState(runtime.config.banners.topNotice.enabled)
  const [bannerVariant, setBannerVariant] = useState<BannerVariant>(runtime.config.banners.topNotice.variant)
  const [bannerTitle, setBannerTitle] = useState(runtime.config.banners.topNotice.title)
  const [bannerMessage, setBannerMessage] = useState(runtime.config.banners.topNotice.message)

  const [aiBotEnabled, setAiBotEnabled] = useState(runtime.config.features.aiSupportBotEnabled)
  const [polishModeEnabled, setPolishModeEnabled] = useState(runtime.config.features.polishModeEnabled)
  const [copyJson, setCopyJson] = useState(() => JSON.stringify(runtime.config.copy, null, 2))

  async function saveConfig() {
    if (!organizationId) return
    setSaving(true)
    setSaveError(null)
    setSaveOk(null)
    try {
      const copy = JSON.parse(copyJson) as unknown
      const res = await fetch(`/api/ui-config?organizationId=${encodeURIComponent(organizationId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          tokens: { radius: { sm: radiusSm, md: radiusMd, lg: radiusLg, base: radiusBase } },
          banners: {
            topNotice: {
              enabled: bannerEnabled,
              variant: bannerVariant,
              title: bannerTitle,
              message: bannerMessage,
              dismissible: true,
            },
          },
          features: {
            aiSupportBotEnabled: aiBotEnabled,
            polishModeEnabled,
          },
          copy,
        }),
      })
      const json = (await res.json()) as unknown
      if (!res.ok) {
        const msg = (() => {
          if (typeof json !== 'object' || !json) return 'Failed to save'
          const err = (json as { error?: unknown }).error
          if (typeof err === 'object' && err && 'message' in err) {
            const m = (err as { message?: unknown }).message
            return typeof m === 'string' && m.length > 0 ? m : 'Failed to save'
          }
          return 'Failed to save'
        })()
        throw new Error(msg)
      }
      setSaveOk('Saved. Refresh any preview page to see changes immediately.')
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Internal review / polish mode</h1>
          <p className="text-text-muted">
            {getRuntimeCopy(
              runtime.config.copy,
              'internal.review.subtitle',
              'Private review surface for preview deployments. Not indexed. Owner-only.'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Config: {runtime.source}</Badge>
          {runtime.updatedAt ? <Badge variant="outline">Updated: {new Date(runtime.updatedAt).toLocaleString()}</Badge> : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick links (critical flows)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-2">Public</div>
            <div className="flex flex-wrap gap-2">
              {routes.public.map((r) => (
                <Button key={r.href} asChild variant="outline" size="sm">
                  <Link href={r.href}>{r.label}</Link>
                </Button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-2">Dashboard</div>
            <div className="flex flex-wrap gap-2">
              {routes.dashboard.map((r) => (
                <Button key={r.href} asChild variant="outline" size="sm">
                  <Link href={r.href}>{r.label}</Link>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>State simulator (loading / empty / error)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {(['normal', 'loading', 'empty', 'error'] as DemoState[]).map((s) => (
              <Button key={s} variant={demoState === s ? 'default' : 'outline'} size="sm" onClick={() => setDemoState(s)}>
                {s}
              </Button>
            ))}
          </div>

          {demoState === 'loading' && (
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {demoState === 'empty' && (
            <div className="p-6 border rounded-lg bg-surface-muted text-text-muted">
              Empty state: nothing to show yet. (Use this to tune empty copy and spacing.)
            </div>
          )}

          {demoState === 'error' && (
            <ErrorState
              message="This is a simulated error state to validate tone, spacing, and action affordances."
              action={{ label: 'Retry', onClick: () => setDemoState('loading') }}
              showDetails={runtime.config.features.polishModeEnabled}
              details={runtime.config.features.polishModeEnabled ? 'Simulated error: E_REVIEW_DEMO' : undefined}
            />
          )}

          {demoState === 'normal' && (
            <div className="p-6 border rounded-lg">
              <div className="font-medium mb-1">Normal state</div>
              <div className="text-sm text-text-muted">
                Use this page to quickly iterate on radius, banner copy, and feature toggles without rebuilding.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Runtime UI config (editable)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {orgLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : !organizationId ? (
            <ErrorState message="No organization detected. Connect a repository first." />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Radius tokens</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={radiusSm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRadiusSm(e.target.value)} placeholder="--radius-sm" />
                    <Input value={radiusMd} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRadiusMd(e.target.value)} placeholder="--radius-md" />
                    <Input value={radiusLg} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRadiusLg(e.target.value)} placeholder="--radius-lg" />
                    <Input value={radiusBase} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRadiusBase(e.target.value)} placeholder="--radius" />
                  </div>
                  <div className="text-xs text-text-muted">
                    Applied immediately via CSS variables; refresh other pages to confirm.
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Top notice banner</div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={bannerEnabled ? 'default' : 'outline'}
                      onClick={() => setBannerEnabled((v) => !v)}
                    >
                      {bannerEnabled ? 'Enabled' : 'Disabled'}
                    </Button>
                    <select
                      className="h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                      value={bannerVariant}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBannerVariant(e.target.value as BannerVariant)}
                    >
                      <option value="info">info</option>
                      <option value="success">success</option>
                      <option value="warning">warning</option>
                      <option value="danger">danger</option>
                    </select>
                  </div>
                  <Input value={bannerTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBannerTitle(e.target.value)} placeholder="Banner title" />
                  <Input value={bannerMessage} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBannerMessage(e.target.value)} placeholder="Banner message" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Feature toggles</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={aiBotEnabled ? 'default' : 'outline'}
                      onClick={() => setAiBotEnabled((v) => !v)}
                    >
                      AI Support Bot: {aiBotEnabled ? 'on' : 'off'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={polishModeEnabled ? 'default' : 'outline'}
                      onClick={() => setPolishModeEnabled((v) => !v)}
                    >
                      Polish mode: {polishModeEnabled ? 'on' : 'off'}
                    </Button>
                  </div>
                  <div className="text-xs text-text-muted">
                    Polish mode enables showing error “details” in this review harness only.
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Copy overrides (JSON map)</div>
                  <Textarea value={copyJson} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCopyJson(e.target.value)} rows={8} />
                  <div className="text-xs text-text-muted">
                    Keys are arbitrary (e.g. <span className="font-mono">dashboard.empty.title</span>).
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={saveConfig} disabled={saving}>
                  {saving ? 'Saving…' : 'Save runtime config'}
                </Button>
                {saveOk ? <span className="text-sm text-success">{saveOk}</span> : null}
                {saveError ? <span className="text-sm text-danger">{saveError}</span> : null}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Current runtime config snapshot (read-only)</div>
                <pre className="text-xs p-3 rounded-md bg-surface-muted overflow-auto border">
                  {JSON.stringify(runtime.config, null, 2)}
                </pre>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  )
}

