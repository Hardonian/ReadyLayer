'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, TrendingUp, Zap, X, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { fadeIn } from '@/lib/design/motion'
import { trackUpgradePromptEvent } from '@/lib/telemetry/analytics'

export type UpgradeContext =
  | 'usage-limit-approaching'
  | 'usage-limit-exceeded'
  | 'blocked-prs'
  | 'ai-disabled'
  | 'team-invite'
  | 'premium-feature'

interface UpgradePromptProps {
  context: UpgradeContext
  show?: boolean
  onDismiss?: () => void
  onUpgradeClick?: () => void
  compact?: boolean
  data?: {
    current?: number
    limit?: number
    feature?: string
  }
}

interface UpgradeContextConfig {
  icon: typeof AlertCircle
  color: 'warning' | 'destructive' | 'info' | 'secondary'
  title: string
  description: string
  cta: string
  details: string
  badgeText: string
}

const contextConfig: Record<UpgradeContext, UpgradeContextConfig> = {
  'usage-limit-approaching': {
    icon: AlertCircle,
    color: 'warning',
    title: 'Running low on AI budget',
    description: 'You have used {current}% of your monthly AI budget.',
    cta: 'Upgrade to keep using AI',
    details:
      'Growth plan includes 10x the AI budget and priority processing. Upgrade now to never worry about limits.',
    badgeText: 'Limited time',
  },
  'usage-limit-exceeded': {
    icon: AlertCircle,
    color: 'destructive',
    title: 'AI budget exceeded',
    description: 'Your AI features are paused until next billing cycle.',
    cta: 'Upgrade now',
    details:
      'Scale plan includes unlimited AI analysis and priority support. Perfect for growing teams.',
    badgeText: 'Urgent',
  },
  'blocked-prs': {
    icon: TrendingUp,
    color: 'info',
    title: '{count} PRs blocked this week',
    description: 'Your team is shipping more secure code with ReadyLayer.',
    cta: 'See upgrade benefits',
    details:
      'Upgrade to unlock team collaboration features and advanced policy templates.',
    badgeText: 'Pro tip',
  },
  'ai-disabled': {
    icon: Zap,
    color: 'secondary',
    title: 'Enable AI-powered review',
    description: 'Unlock intelligent suggestions and test generation.',
    cta: 'Start free trial',
    details: 'Try premium features free for 14 days. No credit card required.',
    badgeText: 'New',
  },
  'team-invite': {
    icon: AlertCircle,
    color: 'info',
    title: 'Invite your team',
    description: 'Starter plan limited to 1 user. Upgrade to add team members.',
    cta: 'Upgrade for team seats',
    details: 'Growth and Scale plans support unlimited team members.',
    badgeText: 'Recommended',
  },
  'premium-feature': {
    icon: Zap,
    color: 'secondary',
    title: 'Premium feature',
    description: 'This feature is available on Growth and Scale plans.',
    cta: 'Upgrade to unlock',
    details: 'Full API access, advanced policies, and priority support included.',
    badgeText: 'Premium',
  },
}

export function UpgradePrompt({
  context,
  show = true,
  onDismiss,
  onUpgradeClick,
  compact = false,
  data = {},
}: UpgradePromptProps): React.JSX.Element | null {
  const [isDismissed, setIsDismissed] = useState(false)
  const config = contextConfig[context]
  const Icon = config.icon

  // Track when prompt is shown
  useEffect(() => {
    if (show && !isDismissed) {
      trackUpgradePromptEvent('shown', context, {
        compact,
        ...data,
      })
    }
  }, [show, isDismissed, context, compact, data])

  const handleDismiss = () => {
    setIsDismissed(true)
    trackUpgradePromptEvent('dismissed', context, { data })
    onDismiss?.()
  }

  const handleUpgradeClick = () => {
    trackUpgradePromptEvent('clicked-upgrade', context, { data })
    onUpgradeClick?.()
  }

  const displayText = (text: string) => {
    return text
      .replace('{current}', data.current?.toString() || '0')
      .replace('{limit}', data.limit?.toString() || '100')
      .replace('{feature}', data.feature || 'this feature')
      .replace('{count}', data.current?.toString() || '5')
  }

  if (!show || isDismissed) return null

  if (compact) {
    return (
      <AnimatePresence>
        <motion.div variants={fadeIn} initial="initial" animate="animate" exit="exit">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">{displayText(config.description)}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDismiss}>
                  Dismiss
                </Button>
                <Button size="sm" onClick={handleUpgradeClick}>
                  {config.cta}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      <motion.div variants={fadeIn} initial="initial" animate="animate" exit="exit">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden">
          {/* Decorative element */}
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5" />

          <CardHeader className="relative">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">
                      {displayText(config.title)}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {config.badgeText}
                    </Badge>
                  </div>
                  <CardDescription>{displayText(config.description)}</CardDescription>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{config.details}</p>

            <div className="flex gap-2">
              <Button onClick={handleUpgradeClick} className="gap-1 flex-1">
                {config.cta}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleDismiss}>
                Maybe later
              </Button>
            </div>

            {/* Trust signals */}
            <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
              <span>✓ No credit card required</span>
              <span>✓ Cancel anytime</span>
              <span>✓ 14-day free trial</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

export default UpgradePrompt
