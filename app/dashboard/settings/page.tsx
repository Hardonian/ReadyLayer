'use client'

import React, { useState } from 'react'
import { useOrganizationId } from '@/lib/hooks'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle, ErrorState, Skeleton } from '@/components/ui'
import { motion } from 'framer-motion'
import { fadeIn } from '@/lib/design/motion'
import { Settings, Github, Gitlab, ToggleLeft, ToggleRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function SettingsPage() {
  const { organizationId, loading } = useOrganizationId()
  const [featureFlags, setFeatureFlags] = useState({
    aiAssistEnabled: true,
    advancedDetectorsEnabled: false,
    auditExportsEnabled: true,
    integrationsEnabled: true,
  })

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
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Github className="h-5 w-5" />
                  <div>
                    <div className="font-medium">GitHub</div>
                    <div className="text-sm text-muted-foreground">Connect your GitHub repositories</div>
                  </div>
                </div>
                <Badge variant="outline">Not Connected</Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Gitlab className="h-5 w-5" />
                  <div>
                    <div className="font-medium">GitLab</div>
                    <div className="text-sm text-muted-foreground">Connect your GitLab repositories</div>
                  </div>
                </div>
                <Badge variant="outline">Not Connected</Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Github className="h-5 w-5" />
                  <div>
                    <div className="font-medium">Bitbucket</div>
                    <div className="text-sm text-muted-foreground">Connect your Bitbucket repositories</div>
                  </div>
                </div>
                <Badge variant="outline">Not Connected</Badge>
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
                  onClick={() =>
                    setFeatureFlags({ ...featureFlags, aiAssistEnabled: !featureFlags.aiAssistEnabled })
                  }
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
                  onClick={() =>
                    setFeatureFlags({
                      ...featureFlags,
                      advancedDetectorsEnabled: !featureFlags.advancedDetectorsEnabled,
                    })
                  }
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
                  onClick={() =>
                    setFeatureFlags({
                      ...featureFlags,
                      auditExportsEnabled: !featureFlags.auditExportsEnabled,
                    })
                  }
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
                  onClick={() =>
                    setFeatureFlags({
                      ...featureFlags,
                      integrationsEnabled: !featureFlags.integrationsEnabled,
                    })
                  }
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
