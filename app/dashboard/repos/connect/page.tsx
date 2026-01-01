'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@/components/ui'
import { Container } from '@/components/ui/container'
import { fadeIn } from '@/lib/design/motion'
import { GitBranch, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ConnectRepositoryPage() {
  return (
    <Container className="py-8">
      <motion.div
        className="space-y-6"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="space-y-2">
          <Link
            href="/dashboard/repos"
            className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Repositories
          </Link>
          <h1 className="text-3xl font-bold">Connect Repository</h1>
          <p className="text-text-muted">
            Connect a Git repository to start verifying AI-generated code
          </p>
        </div>

        {/* Placeholder Card */}
        <Card className="glass backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              <CardTitle>Repository Connection</CardTitle>
            </div>
            <CardDescription>
              This feature is coming soon. Repository connection will be available in a future update.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-text-muted">
                To connect a repository, you will be able to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-text-muted">
                <li>Authorize ReadyLayer to access your Git provider (GitHub, GitLab, Bitbucket)</li>
                <li>Select repositories to monitor</li>
                <li>Configure verification rules and settings</li>
                <li>Enable automated code review for pull requests</li>
              </ul>
              <div className="pt-4">
                <Button asChild variant="outline">
                  <Link href="/dashboard/repos">
                    Back to Repositories
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  )
}
