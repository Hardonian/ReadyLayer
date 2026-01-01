'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@/components/ui'
import { Container } from '@/components/ui/container'
import { fadeIn } from '@/lib/design/motion'
import { ArrowLeft, Github, Gitlab, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/hooks/use-toast'

export default function ConnectRepositoryPage() {
  const [connecting, setConnecting] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<'github' | 'gitlab' | null>(null)
  const { toast } = useToast()

  const handleConnect = async (provider: 'github' | 'gitlab') => {
    setConnecting(true)
    setSelectedProvider(provider)

    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast({
          variant: 'destructive',
          title: 'Authentication required',
          description: 'Please sign in to connect a repository.',
        })
        setConnecting(false)
        return
      }

      // In a real implementation, this would:
      // 1. Initiate OAuth flow with the Git provider
      // 2. Request repository access permissions
      // 3. Store the access token securely
      // 4. Fetch available repositories
      // 5. Allow user to select repositories to connect

      // For now, show a message that this is coming soon
      toast({
        variant: 'default',
        title: 'Coming soon',
        description: `Repository connection for ${provider === 'github' ? 'GitHub' : 'GitLab'} will be available in a future update.`,
      })

      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Failed to connect repository. Please try again.',
      })
    } finally {
      setConnecting(false)
      setSelectedProvider(null)
    }
  }

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

        {/* Provider Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="glass backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/50 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Github className="h-6 w-6" />
                <CardTitle>GitHub</CardTitle>
              </div>
              <CardDescription>
                Connect repositories from GitHub
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleConnect('github')}
                disabled={connecting}
                className="w-full"
                variant="default"
              >
                {connecting && selectedProvider === 'github' ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  </>
                ) : (
                  <>
                    <Github className="h-4 w-4 mr-2" />
                    Connect GitHub
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="glass backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/50 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Gitlab className="h-6 w-6" />
                <CardTitle>GitLab</CardTitle>
              </div>
              <CardDescription>
                Connect repositories from GitLab
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleConnect('gitlab')}
                disabled={connecting}
                className="w-full"
                variant="default"
              >
                {connecting && selectedProvider === 'gitlab' ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  </>
                ) : (
                  <>
                    <Gitlab className="h-4 w-4 mr-2" />
                    Connect GitLab
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Information Card */}
        <Card className="glass backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <CardTitle>What happens next?</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-text-muted">
              <p>When you connect a repository, ReadyLayer will:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Request read access to your repositories</li>
                <li>Set up webhooks to monitor pull requests</li>
                <li>Enable automated code verification</li>
                <li>Provide real-time feedback on AI-generated code</li>
              </ul>
              <p className="pt-2">
                <strong className="text-text-primary">Note:</strong> Repository connection is currently in development. 
                This feature will be available in a future update.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  )
}
