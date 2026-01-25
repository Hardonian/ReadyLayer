'use client'

import { usePersona } from '@/lib/hooks/use-persona'
import { PersonaBadge } from '@/components/persona'
import { Card, CardContent, CardHeader, CardTitle, LoadingState } from '@/components/ui'
import { Container } from '@/components/ui/container'
import { motion } from 'framer-motion'
import { fadeIn } from '@/lib/design/motion'
import { 
  Shield, 
  Users, 
  Code, 
  GitBranch,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react'

const personaInfo = {
  founder: {
    title: 'Founder Dashboard',
    description: 'Optimized for solo founders shipping AI-generated code quickly and safely.',
    features: [
      'Edge runtime protection',
      'Type safety enforcement',
      'Schema drift detection',
      'Auth pattern validation',
    ],
    icon: Code,
  },
  'enterprise-cto': {
    title: 'Enterprise CTO Dashboard',
    description: 'Team-level metrics, compliance tracking, and executive reporting.',
    features: [
      'Team consistency metrics',
      'Compliance reporting',
      'Security posture dashboard',
      'Cost tracking',
    ],
    icon: Users,
  },
  'junior-developer': {
    title: 'Junior Developer Dashboard',
    description: 'Learning-focused interface with educational explanations and progress tracking.',
    features: [
      'Educational explanations',
      'Learning resources',
      'Progress tracking',
      'Code quality improvement',
    ],
    icon: Code,
  },
  'open-source-maintainer': {
    title: 'Open Source Maintainer Dashboard',
    description: 'Community-friendly feedback and contributor quality metrics.',
    features: [
      'Community-friendly feedback',
      'PR prioritization',
      'Contributor metrics',
      'Time saved calculator',
    ],
    icon: GitBranch,
  },
  'agency-freelancer': {
    title: 'Agency/Freelancer Dashboard',
    description: 'Multi-project view with client-specific configurations and billing tracking.',
    features: [
      'Multi-project switcher',
      'Client configurations',
      'Billing time tracker',
      'Quality assurance reports',
    ],
    icon: TrendingUp,
  },
  'startup-cto': {
    title: 'Startup CTO Dashboard',
    description: 'Fast-track interface with minimal UI and maximum speed.',
    features: [
      'Quick status indicators',
      'Production stability alerts',
      'Scaling readiness score',
      'Minimal UI',
    ],
    icon: Shield,
  },
}

export default function PersonaDashboardPage() {
  const { persona, loading } = usePersona()

  if (loading) {
    return (
      <Container className="py-8">
        <LoadingState message="Detecting persona..." />
      </Container>
    )
  }

  if (!persona) {
    return (
      <Container className="py-8">
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <p className="text-text-muted">Persona detection not available</p>
          </CardContent>
        </Card>
      </Container>
    )
  }

  const info = personaInfo[persona]
  const Icon = info.icon

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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{info.title}</h1>
            <PersonaBadge persona={persona} />
          </div>
          <p className="text-text-muted">{info.description}</p>
        </div>

        {/* Features */}
        <Card className="glass-strong backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-white/20 dark:border-gray-700/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              <CardTitle>Persona-Specific Features</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {info.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-surface-muted rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Note */}
        <Card className="glass backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 dark:border-gray-700/50">
          <CardContent className="pt-6">
            <p className="text-sm text-text-muted">
              Your dashboard is optimized for your persona. Switch personas in settings to see different views.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  )
}
