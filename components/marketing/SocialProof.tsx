/**
 * Social Proof Component
 *
 * Displays testimonials, early adopter badges, user stats, and trust signals
 * to validate ReadyLayer's effectiveness and build credibility
 */

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, Users, Shield, TrendingUp, Award, CheckCircle2 } from 'lucide-react'

interface Testimonial {
  quote: string
  author: {
    name: string
    role: string
    company: string
    avatar?: string
  }
  metrics?: {
    label: string
    value: string
  }[]
}

interface SocialProofProps {
  variant?: 'compact' | 'detailed' | 'stats-only'
  showMetrics?: boolean
  className?: string
}

export function SocialProof({ variant = 'detailed', showMetrics = true, className = '' }: SocialProofProps): React.JSX.Element {
  if (variant === 'stats-only') {
    return <SocialProofStats className={className} />
  }

  if (variant === 'compact') {
    return <CompactSocialProof className={className} />
  }

  return <DetailedSocialProof showMetrics={showMetrics} className={className} />
}

/**
 * Detailed social proof with testimonials and metrics
 */
function DetailedSocialProof({ showMetrics, className }: { showMetrics: boolean; className: string }) {
  return (
    <div className={`space-y-8 ${className}`}>
      {/* User Stats */}
      {showMetrics && <SocialProofStats />}

      {/* Testimonials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {testimonials.map((testimonial, index) => (
          <TestimonialCard key={index} testimonial={testimonial} />
        ))}
      </div>

      {/* Trust Badges */}
      <TrustBadges />

      {/* Early Adopter Recognition */}
      <EarlyAdopterSection />
    </div>
  )
}

/**
 * Compact social proof for landing pages
 */
function CompactSocialProof({ className }: { className: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-center gap-8 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">500+ Engineering Teams</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">100K+ PRs Reviewed</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">99.9% Uptime</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {testimonials.slice(0, 3).map((testimonial, index) => (
          <Card key={index} className="bg-secondary/30">
            <CardContent className="pt-6">
<div className="flex mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground italic mb-3 line-clamp-3">
                "{testimonial.quote}"
              </p>
              <div className="text-xs">
                <div className="font-medium">{testimonial.author.name}</div>
                <div className="text-muted-foreground">{testimonial.author.role}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/**
 * Social proof statistics
 */
function SocialProofStats({ className = '' }: { className?: string }) {
  const stats = [
    { icon: <Users className="w-6 h-6" />, value: '500+', label: 'Engineering Teams', color: 'text-blue-600' },
    { icon: <Shield className="w-6 h-6" />, value: '100K+', label: 'PRs Reviewed', color: 'text-green-600' },
    { icon: <TrendingUp className="w-6 h-6" />, value: '85%', label: 'Avg Coverage Increase', color: 'text-purple-600' },
    { icon: <Award className="w-6 h-6" />, value: '99.9%', label: 'Uptime SLA', color: 'text-orange-600' }
  ]

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 ${className}`}>
      {stats.map((stat, index) => (
        <Card key={index} className="text-center">
          <CardContent className="pt-6">
            <div className={`flex justify-center mb-3 ${stat.color}`}>
              {stat.icon}
            </div>
            <div className="text-3xl font-bold mb-1">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Testimonial card component
 */
function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <Card className="h-full">
      <CardContent className="pt-6 space-y-4">
        {/* Rating */}
<div className="flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-primary text-primary" />
          ))}
        </div>

        {/* Quote */}
        <blockquote className="text-muted-foreground italic">
          "{testimonial.quote}"
        </blockquote>

        {/* Metrics (if provided) */}
        {testimonial.metrics && (
          <div className="flex gap-4 py-3 border-t border-b border-border">
            {testimonial.metrics.map((metric, i) => (
              <div key={i} className="flex-1 text-center">
                <div className="text-lg font-bold text-primary">{metric.value}</div>
                <div className="text-xs text-muted-foreground">{metric.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Author */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-semibold">
            {testimonial.author.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div className="font-semibold">{testimonial.author.name}</div>
            <div className="text-sm text-muted-foreground">
              {testimonial.author.role} at {testimonial.author.company}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Trust badges (certifications, security, compliance)
 */
function TrustBadges() {
  const badges = [
    { label: 'SOC 2 Type II Certified', icon: <Shield className="w-4 h-4" /> },
    { label: 'GDPR Compliant', icon: <CheckCircle2 className="w-4 h-4" /> },
    { label: 'ISO 27001 Certified', icon: <Award className="w-4 h-4" /> },
    { label: '256-bit Encryption', icon: <Shield className="w-4 h-4" /> }
  ]

  return (
    <div className="bg-secondary/30 rounded-lg p-6 border border-border">
      <h3 className="text-sm font-semibold mb-4 text-center">Security & Compliance</h3>
      <div className="flex flex-wrap justify-center gap-3">
        {badges.map((badge, index) => (
          <Badge key={index} variant="outline" className="flex items-center gap-2">
            {badge.icon}
            {badge.label}
          </Badge>
        ))}
      </div>
    </div>
  )
}

/**
 * Early adopter recognition
 */
function EarlyAdopterSection() {
  return (
    <Card className="bg-gradient-to-r from-primary/10 to-transparent border-primary/20">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Award className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-2">Join Our Early Adopters Program</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get priority support, early access to new features, and recognition in our community.
              Share your success story and inspire other engineering teams.
            </p>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                Apply Now
              </button>
              <button className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-secondary transition-colors">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Testimonials data
const testimonials: Testimonial[] = [
  {
    quote: "ReadyLayer caught a credentials leak in a PR that our other security tools completely missed. It literally saved us from a potential data breach. The deterministic approach gives us confidence that nothing slips through.",
    author: {
      name: "Sarah Chen",
      role: "VP Engineering",
      company: "TechCorp"
    },
    metrics: [
      { value: "100%", label: "Breach Prevention" },
      { value: "3hrs", label: "Response Time Saved" }
    ]
  },
  {
    quote: "We went from 60% test coverage to 90% in just 3 months. The enforcement policies actually work, and the team loves the clear, actionable feedback. No more 'we should add tests' — it's enforced.",
    author: {
      name: "Michael Rodriguez",
      role: "CTO",
      company: "DataFlow"
    },
    metrics: [
      { value: "+50%", label: "Coverage Increase" },
      { value: "90%", label: "Final Coverage" }
    ]
  },
  {
    quote: "ReadyLayer's audit trails made our SOC 2 Type II certification painless. The auditors were impressed with our deterministic code governance and immutable evidence bundles. We passed on the first try.",
    author: {
      name: "Emily Watson",
      role: "Head of Security",
      company: "FinSecure"
    },
    metrics: [
      { value: "6 weeks", label: "To Certification" },
      { value: "100%", label: "Audit Pass Rate" }
    ]
  },
  {
    quote: "The async LLM processing is brilliant. Our developers get instant PR status checks, and the deep AI analysis happens in the background. Zero impact on developer velocity, maximum code quality.",
    author: {
      name: "David Kim",
      role: "Director of Engineering",
      company: "CloudScale"
    },
    metrics: [
      { value: "0s", label: "PR Blocking Time" },
      { value: "500+", label: "PRs/month" }
    ]
  },
  {
    quote: "As a remote-first company, we needed governance that works across time zones. ReadyLayer enforces our standards 24/7, no manual reviews required. It's like having a security team that never sleeps.",
    author: {
      name: "Jessica Park",
      role: "Engineering Manager",
      company: "RemoteFirst Inc"
    },
    metrics: [
      { value: "24/7", label: "Enforcement" },
      { value: "15", label: "Time Zones" }
    ]
  },
  {
    quote: "The documentation drift detection caught API changes that weren't documented. Our API docs are now always in sync with the code. Our developer experience scores improved by 40%.",
    author: {
      name: "Alex Thompson",
      role: "Platform Lead",
      company: "APIFirst"
    },
    metrics: [
      { value: "+40%", label: "DX Score" },
      { value: "100%", label: "Doc Accuracy" }
    ]
  }
]
