'use client'

/**
 * 10-Minute Evaluation Experience
 *
 * Streamlined onboarding flow designed to get prospects from landing to first value
 * in under 10 minutes. Optimized for conversion and time-to-value.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Container } from '@/components/ui/container'
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  Github,
  GitBranch,
  Shield,
  Zap,
  Award,
  TrendingUp
} from 'lucide-react'

interface EvaluationStep {
  id: string
  title: string
  description: string
  estimatedMinutes: number
  completed: boolean
  action: () => void
  icon: React.ReactNode
}

export default function EvaluatePage(): React.JSX.Element {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [startTime] = useState(Date.now())

  // Track elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  const evaluationSteps: EvaluationStep[] = [
    {
      id: 'connect-github',
      title: 'Connect Your Repository',
      description: 'Link your GitHub account and select a repository to evaluate',
      estimatedMinutes: 2,
      completed: false,
      action: () => router.push('/dashboard/repos/connect'),
      icon: <Github className="w-5 h-5" />
    },
    {
      id: 'trigger-review',
      title: 'Run First Analysis',
      description: 'Trigger a code review on your latest PR or commit',
      estimatedMinutes: 3,
      completed: false,
      action: () => router.push('/dashboard/runs/sandbox'),
      icon: <GitBranch className="w-5 h-5" />
    },
    {
      id: 'review-results',
      title: 'Explore Results',
      description: 'See security findings, coverage gaps, and documentation drift',
      estimatedMinutes: 3,
      completed: false,
      action: () => router.push('/dashboard/reviews'),
      icon: <Shield className="w-5 h-5" />
    },
    {
      id: 'configure-enforcement',
      title: 'Set Enforcement Rules',
      description: 'Customize policies to match your team standards',
      estimatedMinutes: 2,
      completed: false,
      action: () => router.push('/dashboard/policies'),
      icon: <Zap className="w-5 h-5" />
    }
  ]

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const totalEstimatedMinutes = evaluationSteps.reduce((sum, step) => sum + step.estimatedMinutes, 0)

  return (
    <Container className="py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header with Timer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 space-y-4"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <Clock className="w-4 h-4" />
            <span>{formatTime(elapsedTime)} elapsed</span>
            <span className="text-muted-foreground">/ ~{totalEstimatedMinutes}min total</span>
          </div>

          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Evaluate ReadyLayer in 10 Minutes
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            See how deterministic AI governance can catch security issues, enforce test coverage,
            and prevent documentation drift — before code reaches production.
          </p>
        </motion.div>

        {/* Value Props Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-12"
        >
          {[
            { icon: <Shield className="w-5 h-5" />, label: 'Block Critical Issues', color: 'text-red-600' },
            { icon: <Award className="w-5 h-5" />, label: 'Enforce Coverage', color: 'text-green-600' },
            { icon: <TrendingUp className="w-5 h-5" />, label: 'Prevent Tech Debt', color: 'text-blue-600' }
          ].map((prop, i) => (
            <div key={i} className="flex items-center gap-3 bg-secondary/30 rounded-lg p-4">
              <div className={prop.color}>{prop.icon}</div>
              <span className="text-sm font-medium">{prop.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Evaluation Steps */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {evaluationSteps.map((step, index) => (
            <EvaluationStepCard
              key={step.id}
              step={step}
              stepNumber={index + 1}
              isActive={currentStep === index}
              onActivate={() => setCurrentStep(index)}
            />
          ))}
        </motion.div>

        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12 bg-gradient-to-r from-primary/5 to-transparent rounded-lg p-6 border border-primary/10"
        >
          <h3 className="font-semibold mb-4">Trusted by Engineering Teams</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground italic">
                "ReadyLayer caught a credentials leak in a PR that our other tools missed.
                Saved us from a potential breach."
              </p>
              <p className="text-xs font-medium">— Sarah Chen, VP Engineering at TechCorp</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground italic">
                "We went from 60% test coverage to 90% in 3 months. The enforcement actually works."
              </p>
              <p className="text-xs font-medium">— Michael Rodriguez, CTO at DataFlow</p>
            </div>
          </div>
        </motion.div>

        {/* CTA Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center space-y-4"
        >
          <p className="text-sm text-muted-foreground">
            Questions? Check out our{' '}
            <a href="/docs" className="text-primary hover:underline">documentation</a>
            {' '}or{' '}
            <a href="/help/support" className="text-primary hover:underline">contact support</a>
          </p>
        </motion.div>
      </div>
    </Container>
  )
}

/**
 * Individual step card component
 */
function EvaluationStepCard({
  step,
  stepNumber,
  isActive,
  onActivate
}: {
  step: EvaluationStep
  stepNumber: number
  isActive: boolean
  onActivate: () => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: stepNumber * 0.1 }}
      className={`
        relative rounded-lg border p-6 cursor-pointer transition-all
        ${isActive
          ? 'bg-primary/5 border-primary shadow-lg scale-[1.02]'
          : 'bg-card border-border hover:border-primary/50 hover:shadow-md'
        }
      `}
      onClick={onActivate}
    >
      <div className="flex items-start gap-4">
        {/* Step Number & Icon */}
        <div className={`
          flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold
          ${isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}
        `}>
          {step.completed ? (
            <CheckCircle2 className="w-6 h-6" />
          ) : (
            <span>{stepNumber}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {step.icon}
              <h3 className="font-semibold text-lg">{step.title}</h3>
            </div>
            <span className="text-sm text-muted-foreground">
              ~{step.estimatedMinutes}min
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            {step.description}
          </p>

          {/* Action Button */}
          <AnimatePresence>
            {isActive && (
              <motion.button
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onClick={(e) => {
                  e.stopPropagation()
                  step.action()
                }}
                className="mt-3 inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Start Step
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
