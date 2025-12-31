'use client'

import { motion } from 'framer-motion'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Container } from '@/components/ui/container'
import { fadeIn } from '@/lib/design/motion'

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <Container size="md" className="min-h-screen flex items-center justify-center py-12">
          <motion.div
            className="w-full"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
          >
            <Card>
              <CardHeader>
                <CardTitle>Application Error</CardTitle>
                <CardDescription>
                  A critical error occurred. Please refresh the page or contact support.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={reset}>
                  Try again
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </Container>
      </body>
    </html>
  )
}
