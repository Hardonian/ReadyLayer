'use client'

import { useEffect, useState } from 'react'
import { useOrganizationId } from '@/lib/hooks'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle, ErrorState, Skeleton, Button } from '@/components/ui'
import { motion } from 'framer-motion'
import { fadeIn } from '@/lib/design/motion'
import { Settings, ToggleLeft, ToggleRight, CheckCircle2, ExternalLink } from 'lucide-react'
import { Github, Gitlab, Bitbucket } from '@/components/icons/brand-icons'
import { Badge } from '@/components/ui/badge'

interface InstallationItem {
  id: string
  provider: string
  providerId: string
  isActive: boolean
}

export default function SettingsPage(): React.JSX.Element {
  const { organizationId, loading } = useOrganizationId()
  const [installations, setInstallations] = useState<InstallationItem[]>([])
  const [installationsLoading, setInstallationsLoading] = useState(true)

  const [featureFlags, setFeatureFlags] = useState({
    aiAssistEnabled: true,
    advancedDetectorsEnabled: false,
    auditExportsEnabled: true,
    integrationsEnabled: true,
  })

  // Load persisted feature flags from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('readylayer_feature_flags')
      if (saved) {
        setFeatureFlags(JSON.parse(saved) as typeof featureFlags)
      }
    } catch (_err) {
      // Graceful fallback to default flags
    }
  }, [])

  // Fetch real installation status from backend
  useEffect(() => {
    async function loadInstallations(): Promise<void> {
      try {
        const res = await fetch('/api/v1/installations')
        if (res.ok) {
          const data = (await res.json()) as { installations?: InstallationItem[] }
          if (Array.isArray(data.installations)) {
            setInstallations(data.installations)
          }
        }
      } catch (_err) {
        // Fallback to empty installations list
      } finally {
        setInstallationsLoading(false)
      }
    }
    void loadInstallations()
  }, [])

  const handleToggle = (key: keyof typeof featureFlags): void => {
    const updated = { ...featureFlags, [key]: !featureFlags[key] }
    setFeatureFlags(updated)
    try {
      localStorage.setItem('readylayer_feature_flags', JSON.stringify(updated))
    } catch (_err) {
      // Fallback
    }
  }

  const isConnected = (provider: string): boolean => {
    return installations.some(
      (inst) => inst.provider.toLowerCase() === provider.toLowerCase() && inst.isActive
    )
  }

  if (loading) {
    return (
      <Container className="py-8">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-96 w-full" />
      </Container>
    )
  }

  if (!organizationId) {
    return (
      <Container className="py-8">
        <ErrorState message="Organization ID required. Please connect a repository first." />
      </Container>
    )
  }

  return (
    <Container className="py-8">
      <motion.div className="space-y-6" variants={fadeIn} initial="hidden" animate="visible">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Integrations, feature flags, and plan gates
          </p>
        </div>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <CardTitle>Git Provider Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* GitHub */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Github className="h-5 w-5" />
                  <div>
                    <div className="font-medium">GitHub</div>
                    <div className="text-sm text-muted-foreground">Connect your GitHub repositories</div>
                  </div>
                </div>
                {installationsLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : isConnected('github') ? (
                  <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Connected
                  </Badge>
                ) : (
                  <a href="/api/integrations/github/install?returnUrl=/dashboard/settings">
                    <Button size="sm" variant="outline" className="flex items-center gap-1.5">
                      Connect
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                )}
              </div>

              {/* GitLab */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Gitlab className="h-5 w-5" />
                  <div>
                    <div className="font-medium">GitLab</div>
                    <div className="text-sm text-muted-foreground">Connect your GitLab repositories</div>
                  </div>
                </div>
                {installationsLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : isConnected('gitlab') ? (
                  <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Connected
                  </Badge>
                ) : (
                  <a href="/api/integrations/gitlab/install?returnUrl=/dashboard/settings">
                    <Button size="sm" variant="outline" className="flex items-center gap-1.5">
                      Connect
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                )}
              </div>

              {/* Bitbucket */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Bitbucket className="h-5 w-5" />
                  <div>
                    <div className="font-medium">Bitbucket</div>
                    <div className="text-sm text-muted-foreground">Connect your Bitbucket repositories</div>
                  </div>
                </div>
                {installationsLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : isConnected('bitbucket') ? (
                  <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Connected
                  </Badge>
                ) : (
                  <a href="/api/integrations/bitbucket/install?returnUrl=/dashboard/settings">
                    <Button size="sm" variant="outline" className="flex items-center gap-1.5">
                      Connect
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Flags */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">AI Assist</div>
                  <div className="text-sm text-muted-foreground">
                    Enable AI-powered explanations and remediation suggestions
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Toggle AI Assist"
                  onClick={() => handleToggle('aiAssistEnabled')}
                  className="text-2xl"
                >
                  {featureFlags.aiAssistEnabled ? (
                    <ToggleRight className="text-primary" />
                  ) : (
                    <ToggleLeft className="text-muted-foreground" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Advanced Detectors</div>
                  <div className="text-sm text-muted-foreground">
                    Enable advanced security and quality detectors
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Toggle Advanced Detectors"
                  onClick={() => handleToggle('advancedDetectorsEnabled')}
                  className="text-2xl"
                >
                  {featureFlags.advancedDetectorsEnabled ? (
                    <ToggleRight className="text-primary" />
                  ) : (
                    <ToggleLeft className="text-muted-foreground" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Audit Exports</div>
                  <div className="text-sm text-muted-foreground">
                    Enable audit trail exports (JSON/CSV)
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Toggle Audit Exports"
                  onClick={() => handleToggle('auditExportsEnabled')}
                  className="text-2xl"
                >
                  {featureFlags.auditExportsEnabled ? (
                    <ToggleRight className="text-primary" />
                  ) : (
                    <ToggleLeft className="text-muted-foreground" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Integrations</div>
                  <div className="text-sm text-muted-foreground">
                    Enable third-party integrations
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Toggle Integrations"
                  onClick={() => handleToggle('integrationsEnabled')}
                  className="text-2xl"
                >
                  {featureFlags.integrationsEnabled ? (
                    <ToggleRight className="text-primary" />
                  ) : (
                    <ToggleLeft className="text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plan Gates */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Limits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-3 bg-surface-muted rounded-lg">
                <span className="font-medium">Current Plan</span>
                <Badge variant="outline">Starter</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-muted rounded-lg">
                <span className="font-medium">Runs per Month</span>
                <span>100 / Unlimited</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-muted rounded-lg">
                <span className="font-medium">Repositories</span>
                <span>5 / Unlimited</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  )
}
