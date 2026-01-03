'use client'

import React from 'react'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { motion } from 'framer-motion'
import { fadeIn } from '@/lib/design/motion'
import { Shield, FileText, Settings, CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function PoliciesPage() {
  return (
    <Container className="py-8">
      <motion.div className="space-y-8" variants={fadeIn} initial="hidden" animate="visible">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Shield className="h-10 w-10" />
            Understanding Policies
          </h1>
          <p className="text-lg text-muted-foreground">
            Policies define the rules ReadyLayer enforces on your code. Learn how to configure and
            customize them for your team.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>What Are Policies?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Policies are sets of rules that ReadyLayer uses to evaluate your code. Each policy
              contains multiple rules that check for security vulnerabilities, code quality issues,
              performance problems, and compliance requirements.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Security Policies</h3>
                <p className="text-sm text-muted-foreground">
                  Detect vulnerabilities, secrets, and security anti-patterns in your code.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Quality Policies</h3>
                <p className="text-sm text-muted-foreground">
                  Enforce code quality standards, best practices, and maintainability rules.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Performance Policies</h3>
                <p className="text-sm text-muted-foreground">
                  Identify performance bottlenecks, inefficient patterns, and optimization opportunities.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Compliance Policies</h3>
                <p className="text-sm text-muted-foreground">
                  Ensure code meets regulatory requirements and industry standards.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Policy Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Organization-Level Policies
                </h3>
                <p className="text-sm text-muted-foreground">
                  Applied to all repositories in your organization. Use these for company-wide
                  standards and compliance requirements.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Repository-Level Policies
                </h3>
                <p className="text-sm text-muted-foreground">
                  Applied to specific repositories. Use these to customize policies for individual
                  projects or teams.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <strong>Start with Templates:</strong> ReadyLayer provides pre-configured policy
                  templates for common use cases. Go to Dashboard {'>'} Policies {'>'} New Policy to browse
                  templates.
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <strong>Customize Rules:</strong> Enable or disable specific rules, adjust severity
                  levels, and configure rule parameters to match your team&apos;s needs.
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <strong>Test Your Policy:</strong> Use the dry-run feature to test your policy
                  against existing code before applying it to new PRs.
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div>
                  <strong>Apply to Repositories:</strong> Assign your policy to specific repositories
                  or apply it organization-wide.
                </div>
              </li>
            </ol>
            <div className="mt-6">
              <Link href="/dashboard/policies/new">
                <Button>
                  {'Create Your First Policy'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
          <CardHeader>
            <CardTitle>Best Practices</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Start Small:</strong> Begin with a few essential rules and gradually add
                  more as your team adapts.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Use Waivers:</strong> For legitimate exceptions, use waivers with expiration
                  dates and clear justifications.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Review Regularly:</strong> Periodically review your policies to ensure they
                  remain relevant and effective.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Document Decisions:</strong> Use policy comments and documentation to explain
                  why certain rules are enabled or disabled.
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  )
}
