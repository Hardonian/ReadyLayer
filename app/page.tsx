'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, LoadingState } from '@/components/ui'
import { Container } from '@/components/ui/container'
import { staggerContainer, staggerItem, fadeIn } from '@/lib/design/motion'
import { Shield, TestTube, FileText, CheckCircle2, Github, GitBranch, Code, Zap, Gitlab } from 'lucide-react'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!url || !key) {
      setLoading(false)
      return
    }

    const supabase = createSupabaseClient()

    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Failed to get user:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <LoadingState message="Loading..." />
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      {/* Hero Section with Glass Morphism */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          {/* Animated gradient orbs */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
          
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>

        {/* Hero GIF/Image Container - Animated Code Preview */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 dark:opacity-5 overflow-hidden">
          <div className="relative w-full max-w-5xl h-full">
            {/* Animated code preview mockup with glass morphism */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-full max-w-3xl">
                {/* Glowing code blocks */}
                <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-transparent rounded-lg blur-3xl code-preview-glow"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-pink-500/30 via-purple-500/30 to-transparent rounded-lg blur-3xl code-preview-glow float-animation-delay-1"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-full blur-3xl code-preview-glow float-animation"></div>
                
                {/* Code preview mockup with glass effect */}
                <div className="backdrop-blur-xl bg-white/10 dark:bg-gray-900/10 border border-white/20 dark:border-gray-700/30 rounded-2xl p-8 shadow-2xl float-animation-delay-2">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                    </div>
                    <div className="space-y-2 font-mono text-sm">
                      <div className="text-blue-400/50">function <span className="text-purple-400/50">verifyCode</span>()</div>
                      <div className="text-green-400/50 pl-4">✓ Security checks</div>
                      <div className="text-green-400/50 pl-4">✓ Tests generated</div>
                      <div className="text-green-400/50 pl-4">✓ Docs synced</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Container size="lg" className="relative z-10">
          <motion.div
            className="text-center space-y-6"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              className="inline-block mb-4"
              variants={fadeIn}
            >
              <div className="backdrop-blur-xl bg-white/60 dark:bg-gray-900/60 border border-white/20 dark:border-gray-700/50 rounded-2xl px-6 py-3 shadow-xl">
                <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AI Code Verification Platform
                </span>
              </div>
            </motion.div>

            <motion.h1 
              className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
              variants={fadeIn}
            >
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                ReadyLayer
              </span>
            </motion.h1>
            <motion.p 
              className="text-xl text-text-muted max-w-2xl mx-auto font-medium"
              variants={fadeIn}
            >
              AI writes the code. ReadyLayer makes it production-ready.
            </motion.p>
            <motion.p 
              className="text-lg text-text-muted max-w-3xl mx-auto"
              variants={fadeIn}
            >
              Integrates seamlessly with your existing tools and workflows. Adds verification layers that catch AI common errors—context slips, drift, security risks—before they reach production. Trust built through transparency at every step.
            </motion.p>

            {!user && (
              <motion.div className="pt-6 space-y-4" variants={fadeIn}>
                <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border border-white/20 dark:border-gray-700/50 rounded-2xl p-6 shadow-2xl max-w-md mx-auto">
                  <p className="text-sm font-medium text-text-muted mb-4">Sign in with your preferred provider</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button asChild size="lg" className="backdrop-blur-sm bg-[#24292e] hover:bg-[#24292e]/90 text-white border-0">
                      <Link href="/auth/signin">
                        <Github className="mr-2 h-4 w-4" />
                        GitHub
                      </Link>
                    </Button>
                    <Button asChild size="lg" className="backdrop-blur-sm bg-[#FC6D26] hover:bg-[#FC6D26]/90 text-white border-0">
                      <Link href="/auth/signin">
                        <Gitlab className="mr-2 h-4 w-4" />
                        GitLab
                      </Link>
                    </Button>
                    <Button asChild size="lg" className="backdrop-blur-sm bg-[#0052CC] hover:bg-[#0052CC]/90 text-white border-0">
                      <Link href="/auth/signin">
                        <Code className="mr-2 h-4 w-4" />
                        Bitbucket
                      </Link>
                    </Button>
                    <Button asChild size="lg" className="backdrop-blur-sm bg-white hover:bg-gray-50 text-gray-700 border border-gray-300">
                      <Link href="/auth/signin">
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Google
                      </Link>
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {user && (
              <motion.div className="pt-4" variants={fadeIn}>
                <p className="text-lg mb-6">Welcome, {user.user_metadata?.full_name || user.email}!</p>
                <Button asChild size="lg">
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </motion.div>
            )}
          </motion.div>
        </Container>
      </section>

      {/* Trust Badge with Glass Morphism */}
      <Container size="lg" className="relative z-10">
        <motion.div
          className="flex justify-center mb-16"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
        >
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border border-white/20 dark:border-gray-700/50 inline-flex items-center gap-2 px-6 py-3 rounded-xl shadow-xl">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Verifiable Assurance Every Step of the Way</span>
          </div>
        </motion.div>
      </Container>

      {/* Features Grid */}
      {user && (
        <section className="py-16">
          <Container size="lg">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={staggerItem}>
                <Card className="backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-white/20 dark:border-gray-700/50 shadow-xl">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <CardTitle>Review Guard</CardTitle>
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded backdrop-blur-sm">Verified</span>
                    </div>
                    <CardDescription>
                      AI-aware checks catch context slips, drift, and security risks. Works with GitHub, GitLab, Bitbucket, and your existing CI/CD.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/dashboard">View Dashboard →</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={staggerItem}>
                <Card className="backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-white/20 dark:border-gray-700/50 shadow-xl">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <TestTube className="h-5 w-5 text-primary" />
                      <CardTitle>Test Engine</CardTitle>
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded backdrop-blur-sm">Verified</span>
                    </div>
                    <CardDescription>
                      Automatic test generation with coverage enforcement. Integrates with Jest, pytest, and your test framework.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/dashboard">View Dashboard →</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={staggerItem}>
                <Card className="backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-white/20 dark:border-gray-700/50 shadow-xl">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <CardTitle>Doc Sync</CardTitle>
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded backdrop-blur-sm">Verified</span>
                    </div>
                    <CardDescription>
                      Keeps API docs in sync with code changes. Prevents drift and flags outdated documentation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/dashboard">View Dashboard →</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </Container>
        </section>
      )}

      {/* Integration Section */}
      <section className="py-16 bg-surface-muted/50">
        <Container size="lg">
          <motion.div
            className="text-center space-y-4 mb-12"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
          >
            <h2 className="text-3xl font-bold">Works With Your Existing Tools</h2>
            <p className="text-lg text-text-muted max-w-2xl mx-auto">
              ReadyLayer integrates seamlessly—no workflow disruption. Adds verification layers to your current setup.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {[
              { icon: Github, title: 'Git Providers', desc: 'GitHub, GitLab, Bitbucket' },
              { icon: Zap, title: 'CI/CD', desc: 'GitHub Actions, GitLab CI, CircleCI' },
              { icon: Code, title: 'IDEs', desc: 'VS Code, JetBrains' },
              { icon: TestTube, title: 'Test Frameworks', desc: 'Jest, pytest, Mocha' },
            ].map((item) => (
              <motion.div key={item.title} variants={staggerItem}>
                <Card className="text-center backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/50 shadow-lg">
                  <CardContent className="pt-6">
                    <item.icon className="h-8 w-8 mx-auto mb-3 text-text-muted" />
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-text-muted">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>

      {/* Verification Features */}
      <section className="py-16">
        <Container size="lg">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {[
              {
                icon: Shield,
                title: 'AI Error Detection',
                description: 'Specialized checks catch AI common errors: context slips, code drift, hallucinated dependencies, and security vulnerabilities. Each check is verified and transparent.',
                color: 'text-info',
                bg: 'bg-info-muted',
              },
              {
                icon: Zap,
                title: 'Threat Detection & Analytics',
                description: 'Security analysis, threat detection, and code quality metrics inform each other. Compound insights build confidence in every code submission.',
                color: 'text-success',
                bg: 'bg-success-muted',
              },
              {
                icon: CheckCircle2,
                title: 'Verifiable Assurance',
                description: 'Every check is traceable. See exactly what was verified, when, and why. Build trust through transparency at every step of your workflow.',
                color: 'text-accent',
                bg: 'bg-accent-muted',
              },
              {
                icon: GitBranch,
                title: 'No Workflow Disruption',
                description: 'Adds verification layers without replacing your tools. Works alongside GitHub, your CI/CD, and existing review processes. Double-checks, not replacements.',
                color: 'text-warning',
                bg: 'bg-warning-muted',
              },
            ].map((feature) => (
              <motion.div key={feature.title} variants={staggerItem}>
                <Card className={`${feature.bg} backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-white/20 dark:border-gray-700/50 shadow-xl`}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <feature.icon className={`h-6 w-6 ${feature.color}`} />
                      <CardTitle>{feature.title}</CardTitle>
                    </div>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 bg-surface-muted/50">
        <Container size="lg">
          <motion.div
            className="text-center space-y-8"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
          >
            <h3 className="text-2xl font-semibold">Built for Trust</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="font-semibold mb-2">Transparent Checks</div>
                <div className="text-sm text-text-muted">Every verification is visible and traceable</div>
              </div>
              <div>
                <div className="font-semibold mb-2">Compound Insights</div>
                <div className="text-sm text-text-muted">Analytics inform threat detection and vice versa</div>
              </div>
              <div>
                <div className="font-semibold mb-2">Portable Integration</div>
                <div className="text-sm text-text-muted">Works with all major dev platforms and tools</div>
              </div>
            </div>
          </motion.div>
        </Container>
      </section>
    </main>
  )
}
