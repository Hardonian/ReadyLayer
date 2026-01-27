'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Container } from '@/components/ui/container'
import { OnboardingChecklist, type ChecklistItem } from '@/components/dashboard/OnboardingChecklist'
import { UpgradePrompt } from '@/components/billing/UpgradePrompt'
import { useOnboardingProgress } from '@/lib/hooks/use-onboarding-progress'
import { staggerContainer, staggerItem } from '@/lib/design/motion'
import { ArrowRight } from 'lucide-react'

export default function OnboardingPage(): React.JSX.Element {
  const router = useRouter()
  const { progress, completeStep, shouldShowOnboarding } = useOnboardingProgress()
  const [selectedStep, setSelectedStep] = useState<string | null>(null)
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)

  // Check if onboarding should be shown
  useEffect(() => {
    if (!shouldShowOnboarding()) {
      // Redirect to dashboard if onboarding is complete
      router.push('/dashboard')
    }
  }, [shouldShowOnboarding, router])

  const handleStepClick = (stepId: string) => {
    setSelectedStep(selectedStep === stepId ? null : stepId)

    // Handle step actions
    switch (stepId) {
      case 'connect-repo':
        // Navigate to repos connection
        setTimeout(() => {
          router.push('/dashboard/repos/connect')
        }, 300)
        break
      case 'review-results':
        // Navigate to runs
        setTimeout(() => {
          router.push('/dashboard/runs')
        }, 300)
        break
      case 'invite-team':
        // Show upgrade prompt if not on paid plan
        setShowUpgradePrompt(true)
        break
      default:
        break
    }
  }

  const handleStepComplete = (stepId: string) => {
    completeStep(stepId)
  }

  // Transform progress steps to checklist items
  const checklistItems: ChecklistItem[] = progress.steps.map((step, _index) => ({
    ...step,
    estimatedMinutes:
      {
        'connect-repo': 5,
        'review-results': 3,
        'understand-enforcement': 10,
        'invite-team': 5,
        'configure-policies': 15,
      }[step.id] || 5,
    description: getStepDescription(step.id),
    action: {
      label: getStepActionLabel(step.id),
      onClick: () => handleStepClick(step.id),
    },
  }))

  return (
    <Container className="py-12">
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="max-w-2xl mx-auto space-y-8"
      >
        {/* Header */}
        <motion.div variants={staggerItem} className="text-center space-y-3">
          <h1 className="text-4xl font-bold">Welcome to ReadyLayer</h1>
          <p className="text-lg text-muted-foreground">
            Let&apos;s set up enforcement for your team in 5 minutes
          </p>
        </motion.div>

        {/* Progress Overview */}
        <motion.div variants={staggerItem} className="bg-gradient-to-r from-primary/5 to-transparent rounded-lg p-6 border border-primary/10">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Your Progress</h2>
              <span className="text-sm font-medium text-primary">{progress.completionPercentage}%</span>
            </div>
            <div className="h-3 bg-primary/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary/60"
                initial={{ width: 0 }}
                animate={{ width: `${progress.completionPercentage}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {progress.steps.filter((s) => s.completed).length} of {progress.steps.length} steps complete
            </p>
          </div>
        </motion.div>

        {/* Onboarding Checklist */}
        <motion.div variants={staggerItem}>
          <OnboardingChecklist
            items={checklistItems}
            title="Get Started with ReadyLayer"
            subtitle="Follow these steps to enforce code quality in your repos"
            onItemClick={(stepId) => {
              handleStepClick(stepId)
              handleStepComplete(stepId)
            }}
            onComplete={() => {
              // Onboarding complete - show celebration
              setTimeout(() => {
                router.push('/dashboard')
              }, 1000)
            }}
          />
        </motion.div>

        {/* Upgrade Prompt */}
        {showUpgradePrompt && (
          <motion.div variants={staggerItem}>
            <UpgradePrompt
              context="team-invite"
              show={showUpgradePrompt}
              onDismiss={() => setShowUpgradePrompt(false)}
              onUpgradeClick={() => {
                router.push('/dashboard/billing')
              }}
            />
          </motion.div>
        )}

        {/* Tips Section */}
        <motion.div variants={staggerItem} className="grid grid-cols-3 gap-4">
          {[
            { icon: '🔒', title: 'Security First', desc: 'Block risky PRs automatically' },
            { icon: '✅', title: 'Quality Checks', desc: 'Enforce test coverage' },
            { icon: '📚', title: 'Doc Sync', desc: 'Keep docs in sync' },
          ].map((tip, index) => (
            <div
              key={index}
              className="rounded-lg border border-secondary/30 bg-secondary/20 p-4 text-center space-y-2"
            >
              <span className="text-3xl">{tip.icon}</span>
              <h3 className="font-medium text-sm">{tip.title}</h3>
              <p className="text-xs text-muted-foreground">{tip.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Help Section */}
        <motion.div variants={staggerItem} className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="space-y-2">
            <p className="font-medium text-blue-900 dark:text-blue-100">Need help?</p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Check out our{' '}
              <a
                href="/help"
                className="underline hover:no-underline font-medium"
              >
                documentation
              </a>{' '}
              or{' '}
              <a
                href="/help/support"
                className="underline hover:no-underline font-medium"
              >
                contact support
              </a>
              .
            </p>
          </div>
        </motion.div>

        {/* Skip Link */}
        <motion.div variants={staggerItem} className="text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            Skip for now
            <ArrowRight className="h-3 w-3" />
          </button>
        </motion.div>
      </motion.div>
    </Container>
  )
}

/**
 * Get description for each onboarding step
 */
function getStepDescription(stepId: string): string {
  const descriptions: Record<string, string> = {
    'connect-repo':
      'Connect your GitHub, GitLab, or Bitbucket repository to ReadyLayer. This takes less than a minute.',
    'review-results':
      'Trigger your first code review to see ReadyLayer in action. We&apos;ll analyze a sample PR.',
    'understand-enforcement':
      'Learn how ReadyLayer enforces security, coverage, and documentation policies on every PR.',
    'invite-team':
      'Add your team members so they can see reviews and enforce policies together.',
    'configure-policies':
      'Customize enforcement rules to match your team&apos;s standards and risk tolerance.',
  }
  return descriptions[stepId] || ''
}

/**
 * Get action label for each step
 */
function getStepActionLabel(stepId: string): string {
  const labels: Record<string, string> = {
    'connect-repo': 'Connect Repository',
    'review-results': 'View Reviews',
    'understand-enforcement': 'Learn More',
    'invite-team': 'Invite Team Members',
    'configure-policies': 'Set Policies',
  }
  return labels[stepId] || 'Get Started'
}
