'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Eye, XCircle, CheckCircle2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { fadeIn, staggerContainer, staggerItem } from '@/lib/design/motion'

interface IntegrationConfidenceProps {
  className?: string
}

const permissionSteps = [
  {
    step: 1,
    title: 'Repository access',
    permission: 'Read repository contents',
    why: 'Needed to analyze PR diffs and code changes',
    required: true,
  },
  {
    step: 2,
    title: 'Pull request access',
    permission: 'Read and write pull requests',
    why: 'Needed to post review comments and status checks',
    required: true,
  },
  {
    step: 3,
    title: 'Status checks',
    permission: 'Write status checks',
    why: 'Needed to show ReadyLayer check results in PR',
    required: true,
  },
  {
    step: 4,
    title: 'Webhooks',
    permission: 'Receive webhook events',
    why: 'Needed to trigger checks on PR events',
    required: true,
  },
]

const whatWeDontDo = [
  {
    icon: XCircle,
    title: 'No code modification',
    description: 'ReadyLayer never modifies your code. It only reads diffs and posts comments.',
  },
  {
    icon: XCircle,
    title: 'No repository deletion',
    description: 'ReadyLayer cannot delete repositories or branches.',
  },
  {
    icon: XCircle,
    title: 'No force pushes',
    description: 'ReadyLayer never performs destructive git operations.',
  },
  {
    icon: XCircle,
    title: 'No admin access',
    description: 'ReadyLayer does not request admin or owner-level permissions.',
  },
]

export function IntegrationConfidence({ className }: IntegrationConfidenceProps) {
  const prefersReducedMotion = React.useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  return (
    <motion.section
      className={cn('w-full space-y-6', className)}
      variants={prefersReducedMotion ? fadeIn : staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <Shield className="h-6 w-6" />
          What connecting a repo actually does
        </h2>
        <p className="text-text-muted">
          Explicit, minimal permissions. Everything ReadyLayer does is transparent and reversible.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Permissions requested</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {permissionSteps.map((perm) => (
            <motion.div
              key={perm.step}
              variants={prefersReducedMotion ? fadeIn : staggerItem}
              className="flex items-start gap-4 p-4 rounded-md border border-border-subtle bg-surface-raised"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-muted flex items-center justify-center text-sm font-semibold">
                {perm.step}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{perm.title}</span>
                  {perm.required && (
                    <Badge variant="outline" className="text-xs">
                      Required
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-text-muted mb-1">
                  <strong>Permission:</strong> {perm.permission}
                </div>
                <div className="text-xs text-text-muted">
                  <strong>Why:</strong> {perm.why}
                </div>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <XCircle className="h-5 w-5 text-danger" />
            What ReadyLayer does NOT do
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {whatWeDontDo.map((item, idx) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={idx}
                  variants={prefersReducedMotion ? fadeIn : staggerItem}
                  className="flex items-start gap-3 p-3 rounded-md border border-border-subtle bg-surface-muted"
                >
                  <Icon className="h-5 w-5 text-danger mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-sm mb-1">{item.title}</div>
                    <div className="text-xs text-text-muted">{item.description}</div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-success bg-success-muted/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold mb-2">How to uninstall / revoke</div>
              <ol className="text-sm text-text-muted space-y-1 list-decimal list-inside">
                <li>Go to your repository settings on GitHub/GitLab</li>
                <li>Navigate to "Installed GitHub Apps" or "Integrations"</li>
                <li>Find ReadyLayer and click "Uninstall"</li>
                <li>All permissions are immediately revoked</li>
                <li>ReadyLayer will stop processing new PRs</li>
              </ol>
              <p className="text-xs text-text-muted mt-3">
                <strong>Note:</strong> Historical review data remains accessible in your ReadyLayer dashboard for audit
                purposes, but ReadyLayer loses access to your repository immediately upon uninstall.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.section>
  )
}
