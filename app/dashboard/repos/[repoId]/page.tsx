'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from '@/components/ui'
import { Container } from '@/components/ui/container'
import { fadeIn } from '@/lib/design/motion'
import { Settings, BarChart3 } from 'lucide-react'

/**
 * Repository Detail Page
 * 
 * Shows repository details, configuration, and analytics
 */
export default function RepositoryDetailPage({
  params: { repoId },
}: {
  params: { repoId: string };
}) {
  return (
    <Container className="py-8">
      <motion.div
        className="space-y-6"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Repository: {repoId}</h1>
          <p className="text-muted-foreground">
            Configure verification settings and view analytics
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <CardTitle>Configuration</CardTitle>
              </div>
              <CardDescription>
                Manage repository verification settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={Settings}
                title="Configuration coming soon"
                description="Repository configuration editor will be available here."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                <CardTitle>Analytics</CardTitle>
              </div>
              <CardDescription>
                View repository analytics and metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={BarChart3}
                title="Analytics coming soon"
                description="Repository analytics and metrics will be displayed here."
              />
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </Container>
  );
}
