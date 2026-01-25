'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Container } from '@/components/ui/container'
import { fadeIn } from '@/lib/design/motion'
import { AlertTriangle } from 'lucide-react'

export default function HelpError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Help section error:', error)
  }, [error])

  return (
    <Container size="md" className="min-h-screen flex items-center justify-center py-12">
      <motion.div
        className="w-full"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle>Help Section Error</CardTitle>
            </div>
            <CardDescription>
              Something went wrong loading the help section.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm font-mono text-destructive break-all">
                  {error.message}
                </p>
                {error.stack && (
                  <pre className="text-xs text-muted-foreground mt-2 overflow-auto max-h-64">
                    {error.stack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <Button onClick={reset}>
                Try again
              </Button>
              <Button asChild variant="outline">
                <Link href="/help">Go to Help</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  )
}
