'use client'

import React from 'react'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { motion } from 'framer-motion'
import { fadeIn } from '@/lib/design/motion'
import { Github, Gitlab, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlatformBadge } from '@/components/dashboard/platform-badge'
import Link from 'next/link'

export default function ConnectRepoPage() {
  const providers = [
    {
      name: 'GitHub',
      icon: Github,
      provider: 'github',
      steps: [
        'Go to Dashboard > Repositories > Connect Repository',
        'Click "Connect GitHub"',
        'Authorize ReadyLayer in the GitHub OAuth flow',
        'Select the repositories you want to connect',
        'ReadyLayer will automatically set up webhooks',
      ],
    },
    {
      name: 'GitLab',
      icon: Gitlab,
      provider: 'gitlab',
      steps: [
        'Go to Dashboard > Repositories > Connect Repository',
        'Click "Connect GitLab"',
        'Authorize ReadyLayer in the GitLab OAuth flow',
        'Select the repositories you want to connect',
        'ReadyLayer will automatically configure webhooks',
      ],
    },
    {
      name: 'Bitbucket',
      icon: Gitlab, // Placeholder
      provider: 'bitbucket',
      steps: [
        'Go to Dashboard > Repositories > Connect Repository',
        'Click "Connect Bitbucket"',
        'Authorize ReadyLayer in the Bitbucket OAuth flow',
        'Select the repositories you want to connect',
        'ReadyLayer will automatically set up webhooks',
      ],
    },
  ]

  return (
    <Container className="py-8">
      <motion.div className="space-y-8" variants={fadeIn} initial="hidden" animate="visible">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Connecting Your Repository</h1>
          <p className="text-lg text-muted-foreground">
            Connect your GitHub, GitLab, or Bitbucket repository to start using ReadyLayer.
          </p>
        </div>

        {providers.map((provider) => {
          const Icon = provider.icon
          return (
            <Card key={provider.provider}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Icon className="h-6 w-6" />
                  <CardTitle>{provider.name}</CardTitle>
                  <PlatformBadge provider={provider.provider} />
                </div>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {provider.steps.map((step, idx) => (
                    <li key={idx} className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        {idx + 1}
                      </div>
                      <span className="text-sm pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-6">
                  <Link href="/dashboard/repos/connect">
                    <Button>
                      Connect {provider.name}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}

        <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
          <CardHeader>
            <CardTitle>What Happens Next?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Automatic Webhook Setup:</strong> ReadyLayer automatically configures webhooks
                  to monitor your repositories for new PRs and commits.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Default Policies:</strong> Your repositories will use default security and
                  quality policies. You can customize these later.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <strong>First Review:</strong> When you open your next PR, ReadyLayer will
                  automatically review it. You can also trigger manual reviews from the dashboard.
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  )
}
