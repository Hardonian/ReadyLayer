'use client';

import Link from 'next/link';
import { TrendingUp, AlertCircle, BarChart3, Zap, Shield, Workflow } from 'lucide-react';

export default function StartupCTOsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero Section */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            <TrendingUp className="h-4 w-4" />
            Production-Ready Platform
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            Ship with Confidence
            <span className="block text-blue-600">at Startup Speed</span>
          </h1>

          <p className="mt-6 text-xl leading-8 text-slate-600">
            Production readiness metrics, cost insights, and automatic quality gates. Everything CTOs need to scale confidently.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/auth/signin?plan=startup"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Start Free Trial
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Explore Features
            </Link>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            14-day free trial. No credit card required. All features included.
          </p>
        </div>
      </section>

      {/* Challenges Section */}
      <section className="relative px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-slate-900">The Startup CTO's Dilemma</h2>
          <p className="mt-4 text-lg text-slate-600">
            You need to move fast without breaking production. We make that possible.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Challenge 1 */}
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <AlertCircle className="h-8 w-8 text-orange-500" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Production Blindness
              </h3>
              <p className="mt-2 text-slate-600">
                You don't know your real uptime, latency, or error rates. Flying blind into scale.
              </p>
            </div>

            {/* Challenge 2 */}
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <TrendingUp className="h-8 w-8 text-red-500" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Cost Surprises
              </h3>
              <p className="mt-2 text-slate-600">
                LLM, database, and API costs spiral. You don't know where money is going.
              </p>
            </div>

            {/* Challenge 3 */}
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <Workflow className="h-8 w-8 text-red-600" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Deployment Uncertainty
              </h3>
              <p className="mt-2 text-slate-600">
                Manual testing. Praying before each deploy. Post-merge bugs waste engineering time.
              </p>
            </div>

            {/* Challenge 4 */}
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <Shield className="h-8 w-8 text-blue-500" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Security Debt
              </h3>
              <p className="mt-2 text-slate-600">
                No consistent security review. Compliance questions from investors go unanswered.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-slate-900">Built for Startup Scaling</h2>

          <div className="mt-12 space-y-8">
            {/* Feature 1 */}
            <div className="flex gap-4 rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Production Readiness Dashboard</h3>
                <p className="mt-2 text-slate-600">
                  Real-time uptime, latency, error rates, test coverage, and deployment frequency. Know your actual SLA compliance.
                </p>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                    99.9% uptime tracking
                  </span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                    P95 latency graphs
                  </span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                    MTTR metrics
                  </span>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex gap-4 rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Cost Attribution & Optimization</h3>
                <p className="mt-2 text-slate-600">
                  Per-org cost breakdown. Understand LLM, database, and API spending. Get optimization recommendations.
                </p>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
                    Monthly trends
                  </span>
                  <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
                    Cost forecasting
                  </span>
                  <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
                    Optimization tips
                  </span>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex gap-4 rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                  <Zap className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Automated Quality Gates</h3>
                <p className="mt-2 text-slate-600">
                  Comprehensive CI/CD integration. Block breaking changes, security issues, and untested code before merge.
                </p>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <span className="rounded-full bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700">
                    Policy-driven
                  </span>
                  <span className="rounded-full bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700">
                    Test coverage enforcement
                  </span>
                  <span className="rounded-full bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700">
                    Security scanning
                  </span>
                </div>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex gap-4 rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
                  <Shield className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Compliance & Audit Trail</h3>
                <p className="mt-2 text-slate-600">
                  Full audit log of every review, decision, and waiver. Investor-ready compliance reports and SLA documentation.
                </p>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700">
                    SOC 2 ready
                  </span>
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700">
                    Audit trails
                  </span>
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700">
                    Compliance reports
                  </span>
                </div>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="flex gap-4 rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-100">
                  <Workflow className="h-6 w-6 text-cyan-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Developer Experience First</h3>
                <p className="mt-2 text-slate-600">
                  Seamless GitHub/GitLab integration. Fast feedback loops. Actionable PR comments that help your team learn.
                </p>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-medium text-cyan-700">
                    < 30s feedback
                  </span>
                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-medium text-cyan-700">
                    Clear guidance
                  </span>
                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-medium text-cyan-700">
                    Team morale
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Section */}
      <section className="relative px-4 py-16 sm:px-6 lg:px-8 bg-blue-50">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-slate-900 text-center">The ROI</h2>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">40%</div>
              <p className="mt-2 text-slate-600">Faster code reviews</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">3x</div>
              <p className="mt-2 text-slate-600">Fewer post-merge bugs</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">25%</div>
              <p className="mt-2 text-slate-600">Cost savings identified</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-slate-900">Simple, Predictable Pricing</h2>
          <p className="mt-4 text-lg text-slate-600">
            Pay only for what you use. No surprises.
          </p>

          <div className="mt-12 rounded-lg border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-bold text-slate-900">Pro Plan</h3>
            <p className="mt-2 text-slate-600">For startups and growing companies</p>
            <div className="mt-4 text-5xl font-bold text-blue-600">$99<span className="text-2xl text-slate-600">/mo</span></div>
            <p className="mt-4 text-slate-600">All features included. Unlimited teams & repos.</p>

            <div className="mt-8 space-y-3 text-left">
              {[
                'Unlimited PR reviews',
                'Production readiness metrics',
                'Cost attribution dashboard',
                'Priority support',
                'Custom policies',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-slate-700">{feature}</span>
                </div>
              ))}
            </div>

            <Link
              href="/auth/signin?plan=startup"
              className="mt-8 inline-flex items-center justify-center rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700 w-full"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900">
            Join the Community of Confident CTOs
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Hundreds of startups ship faster and more reliably with ReadyLayer.
          </p>

          <div className="mt-8">
            <Link
              href="/auth/signin?plan=startup"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-blue-700"
            >
              Start Your Free Trial
            </Link>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            14 days free. No credit card. Cancel anytime.
          </p>
        </div>
      </section>
    </div>
  );
}