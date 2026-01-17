'use client';

import Link from 'next/link';
import { CheckCircle, AlertTriangle, Users, Zap, Shield, Code } from 'lucide-react';

export default function OSSMaintainersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero Section */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            <CheckCircle className="h-4 w-4" />
            Built for Open Source
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            Maintain Code Quality
            <span className="block text-emerald-600">Without the Headache</span>
          </h1>

          <p className="mt-6 text-xl leading-8 text-slate-600">
            Detect breaking changes, prevent license violations, and catch security issues before merging. Built specifically for OSS maintainers.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/auth/signin?plan=oss"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700"
            >
              Get Started Free
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              See Features
            </Link>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            Free forever for public repositories. No credit card required.
          </p>
        </div>
      </section>

      {/* Pain Points */}
      <section className="relative px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-slate-900">Common Pain Points</h2>
          <p className="mt-4 text-lg text-slate-600">
            We understand the challenges of maintaining popular open source projects.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Pain Point 1 */}
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Breaking Changes Sneak Through
              </h3>
              <p className="mt-2 text-slate-600">
                Accidental API breaks in PRs, discovered too late by users. Causing frustration and version management headaches.
              </p>
            </div>

            {/* Pain Point 2 */}
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <Shield className="h-8 w-8 text-red-500" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                License Compliance Risk
              </h3>
              <p className="mt-2 text-slate-600">
                Importing GPL/AGPL packages accidentally, violating your project&apos;s license or creating legal issues.
              </p>
            </div>

            {/* Pain Point 3 */}
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <Code className="h-8 w-8 text-red-600" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Manual Review Burden
              </h3>
              <p className="mt-2 text-slate-600">
                Spending hours reviewing every PR for quality, security, and compatibility issues. Volunteer burnout.
              </p>
            </div>

            {/* Pain Point 4 */}
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <Users className="h-8 w-8 text-blue-500" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Contributor Experience
              </h3>
              <p className="mt-2 text-slate-600">
                New contributors frustrated by rejection comments without actionable guidance or automated checks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-slate-900">Built for Your Workflow</h2>

          <div className="mt-12 space-y-8">
            {/* Feature 1 */}
            <div className="flex gap-4 rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
                  <AlertTriangle className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Breaking Change Detection</h3>
                <p className="mt-2 text-slate-600">
                  Automatically detect function signature changes, removed exports, and property modifications. Prevent accidental breaking changes before merge.
                </p>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                    Function signatures
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                    API changes
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                    Version bumps
                  </span>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex gap-4 rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">License Compliance Scanning</h3>
                <p className="mt-2 text-slate-600">
                  Scan imports for GPL, AGPL, SSPL, and other restrictive licenses. Catch incompatible dependencies before they become legal issues.
                </p>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
                    GPL detection
                  </span>
                  <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
                    AGPL warnings
                  </span>
                  <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
                    License matrix
                  </span>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex gap-4 rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Community-Friendly Feedback</h3>
                <p className="mt-2 text-slate-600">
                  Clear, actionable PR comments that help contributors learn and improve. Reduce back-and-forth while being encouraging.
                </p>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                    Guided fixes
                  </span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                    Education
                  </span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                    Empathy-first
                  </span>
                </div>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex gap-4 rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                  <Code className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Free for Public Repositories</h3>
                <p className="mt-2 text-slate-600">
                  Zero cost for open source. Scaled to handle any repository size. We believe in giving back to the community.
                </p>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-full bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700">
                    Unlimited PRs
                  </span>
                  <span className="rounded-full bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700">
                    No limits
                  </span>
                  <span className="rounded-full bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700">
                    Community first
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="relative px-4 py-16 sm:px-6 lg:px-8 bg-slate-900 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold">Works with Your Git Provider</h2>
          <p className="mt-4 text-lg text-slate-300">
            Integrate in minutes. Works with GitHub, GitLab, and Bitbucket.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {['GitHub', 'GitLab', 'Bitbucket'].map((provider) => (
              <div key={provider} className="flex items-center justify-center rounded-lg bg-slate-800 py-6 px-4">
                <span className="text-lg font-semibold">{provider}</span>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <Link
              href="/docs/integrations"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700"
            >
              View Setup Guides
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900">
            Ready to Improve Your Maintenance Experience?
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Join hundreds of open source projects using ReadyLayer.
          </p>

          <div className="mt-8">
            <Link
              href="/auth/signin?plan=oss"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-emerald-700"
            >
              Get Started Free
            </Link>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            No credit card required. All features included.
          </p>
        </div>
      </section>
    </div>
  );
}
