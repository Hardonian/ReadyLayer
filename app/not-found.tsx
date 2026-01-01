'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Container } from '@/components/ui/container'
import { fadeIn } from '@/lib/design/motion'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <Container size="md" className="min-h-screen flex items-center justify-center py-12">
      <motion.div
        className="w-full"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              404
            </div>
            <CardTitle className="text-2xl">Page Not Found</CardTitle>
            <CardDescription>
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 justify-center">
              <Button asChild>
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Link>
              </Button>
              <Button asChild variant="outline" onClick={() => window.history.back()}>
                <span>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  )
}
