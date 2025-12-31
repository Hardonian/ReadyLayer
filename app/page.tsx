'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, LoadingState } from '@/components/ui'
import { Container } from '@/components/ui/container'
import { staggerContainer, staggerItem, fadeIn } from '@/lib/design/motion'
import { Shield, TestTube, FileText, CheckCircle2, Github, GitBranch, Code, Zap } from 'lucide-react'

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
      {/* Hero Section */}
      <section className="py-24 lg:py-32">
        <Container size="lg">
          <motion.div
            className="text-center space-y-6"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
          >
            <motion.h1 
              className="text-5xl font-bold tracking-tight sm:text-6xl"
              variants={fadeIn}
            >
              ReadyLayer
            </motion.h1>
            <motion.p 
              className="text-xl text-text-muted max-w-2xl mx-auto"
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
              <motion.div className="pt-4" variants={fadeIn}>
                <Button asChild size="lg">
                  <Link href="/auth/signin">
                    <Github className="mr-2 h-5 w-5" />
                    Sign in with GitHub
                  </Link>
                </Button>
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

      {/* Trust Badge */}
      <Container size="lg">
        <motion.div
          className="flex justify-center mb-16"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg">
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
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <CardTitle>Review Guard</CardTitle>
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">Verified</span>
                    </div>
                    <CardDescription>
                      AI-aware checks catch context slips, drift, and security risks. Works with GitHub, GitLab, and your existing CI/CD.
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
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <TestTube className="h-5 w-5 text-primary" />
                      <CardTitle>Test Engine</CardTitle>
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">Verified</span>
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
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <CardTitle>Doc Sync</CardTitle>
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">Verified</span>
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
                <Card className="text-center">
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
                <Card className={feature.bg}>
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
