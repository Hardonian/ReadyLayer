'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@/components/ui'
import { Container } from '@/components/ui/container'
import { fadeIn } from '@/lib/design/motion'
import { ArrowLeft, Github, Gitlab, Code, CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/hooks/use-toast'

interface Installation {
  id: string
  provider: string
  providerId: string
  permissions: any
  isActive: boolean
  installedAt: string
  organizationId: string
}

interface Repository {
  id: string
  name: string
  fullName: string
  provider: string
  enabled: boolean
  createdAt: string
}

export default function ConnectRepositoryPage() {
  const [connecting, setConnecting] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<'github' | 'gitlab' | 'bitbucket' | null>(null)
  const [installations, setInstallations] = useState<Installation[]>([])
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [testingConnection, setTestingConnection] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          return
        }

        // Fetch installations
        const installationsResponse = await fetch('/api/v1/installations', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        if (installationsResponse.ok) {
          const installationsData = await installationsResponse.json()
          setInstallations(installationsData.installations || [])
        }

        // Fetch repositories
        const reposResponse = await fetch('/api/v1/repos?limit=100', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        if (reposResponse.ok) {
          const reposData = await reposResponse.json()
          setRepositories(reposData.repositories || [])
        }
      } catch (error) {
        // Silently handle fetch errors - UI will show empty state
      }
    }

    fetchData()
  }, [])

  const handleConnect = async (provider: 'github' | 'gitlab' | 'bitbucket') => {
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

      // Redirect to provider OAuth flow
      const oauthUrl = `/api/auth/${provider}`
      window.location.href = oauthUrl
      
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Failed to connect repository. Please try again.',
      })
      setConnecting(false)
      setSelectedProvider(null)
    }
  }

  const handleTestConnection = async (repoId: string) => {
    setTestingConnection(repoId)
    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast({
          variant: 'destructive',
          title: 'Authentication required',
          description: 'Please sign in to test connection.',
        })
        return
      }

      const response = await fetch(`/api/v1/repos/${repoId}/test-connection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        toast({
          variant: 'default',
          title: 'Connection successful',
          description: data.message || 'Repository connection is working correctly.',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Connection failed',
          description: data.error?.message || 'Failed to test connection.',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Test failed',
        description: error instanceof Error ? error.message : 'Failed to test connection.',
      })
    } finally {
      setTestingConnection(null)
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'github':
        return Github
      case 'gitlab':
        return Gitlab
      case 'bitbucket':
        return Code
      default:
        return Github
    }
  }

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'github':
        return 'GitHub'
      case 'gitlab':
        return 'GitLab'
      case 'bitbucket':
        return 'Bitbucket'
      default:
        return provider
    }
  }

  const getInstallationStatus = (provider: string) => {
    const installation = installations.find(inst => inst.provider === provider && inst.isActive)
    return installation
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['github', 'gitlab', 'bitbucket'] as const).map((provider) => {
            const Icon = getProviderIcon(provider)
            const installation = getInstallationStatus(provider)
            const providerRepos = repositories.filter(r => r.provider === provider)

            return (
              <Card key={provider} className="glass backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/50 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-6 w-6" />
                      <CardTitle>{getProviderName(provider)}</CardTitle>
                    </div>
                    {installation && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-success-muted text-success rounded border border-success/20">
                        <CheckCircle2 className="h-3 w-3" />
                        Installed
                      </span>
                    )}
                  </div>
                  <CardDescription>
                    {installation 
                      ? `${providerRepos.length} repository${providerRepos.length !== 1 ? 'ies' : ''} connected`
                      : 'Connect repositories from ' + getProviderName(provider)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {installation ? (
                    <>
                      <div className="text-sm text-muted-foreground">
                        <div>Installation ID: {installation.providerId.slice(0, 8)}...</div>
                        <div>Installed: {new Date(installation.installedAt).toLocaleDateString()}</div>
                      </div>
                      {providerRepos.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Connected Repositories:</div>
                          {providerRepos.slice(0, 3).map((repo) => (
                            <div key={repo.id} className="flex items-center justify-between p-2 bg-surface-muted rounded text-sm">
                              <span className="truncate">{repo.fullName}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleTestConnection(repo.id)}
                                disabled={testingConnection === repo.id}
                                className="ml-2 h-6 px-2"
                              >
                                {testingConnection === repo.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  'Test'
                                )}
                              </Button>
                            </div>
                          ))}
                          {providerRepos.length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{providerRepos.length - 3} more
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <Button
                      onClick={() => handleConnect(provider)}
                      disabled={connecting}
                      className="w-full"
                      variant="default"
                    >
                      {connecting && selectedProvider === provider ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Icon className="h-4 w-4 mr-2" />
                          Connect {getProviderName(provider)}
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
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
