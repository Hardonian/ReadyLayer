/**
 * Cultural Lock-In Artifacts Section
 * 
 * Showcases Merge Confidence Certificates, Readiness Scores, and AI Risk Exposure Index
 */

'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Container } from '@/components/ui/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/design/motion';
import {
  Award,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  BarChart3,
} from 'lucide-react';

export function CulturalArtifacts() {
  const prefersReducedMotion = React.useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  return (
    <section className="py-16 bg-gradient-to-br from-primary/5 via-purple-500/5 to-blue-500/5">
      <Container size="lg">
        <motion.div
          className="text-center mb-12"
          variants={prefersReducedMotion ? fadeIn : staggerItem}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            ReadyLayer Verified™
          </Badge>
          <h2 className="text-3xl font-bold mb-2">Cultural Lock-In Artifacts</h2>
          <p className="text-lg text-text-muted max-w-3xl mx-auto">
            Make ReadyLayer&apos;s absence visible. Every review generates artifacts that prove verification and create accountability.
          </p>
          <div className="mt-4 p-4 bg-background/50 rounded-lg border border-primary/20 max-w-2xl mx-auto">
            <div className="text-sm font-semibold text-primary mb-2">The Inevitability Principle</div>
            <div className="text-sm text-text-muted">
              If it passed ReadyLayer, we can defend it in audits, postmortems, and courtrooms. 
              If ReadyLayer didn&apos;t review it, that absence is visible.
            </div>
          </div>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={prefersReducedMotion ? fadeIn : staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Merge Confidence Certificate */}
          <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
            <Card className="h-full border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Merge Confidence Certificate</CardTitle>
                </div>
                <Badge variant="success" className="w-fit">
                  ReadyLayer Verified™
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-background/50 rounded-lg border border-primary/20">
                    <div className="text-xs text-text-muted mb-2">Certificate ID</div>
                    <div className="font-mono text-sm">cert_rev_abc123_20240115</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-text-muted mb-1">Confidence Score</div>
                      <div className="text-2xl font-bold text-success">85/100</div>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted mb-1">Readiness</div>
                      <Badge variant="success" className="text-xs">Ready</Badge>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-border">
                    <div className="text-xs text-text-muted">
                      <strong className="text-text-primary">Signed with:</strong> Policy version hash, review ID signature, immutable evidence bundle
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Readiness Score */}
          <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
            <Card className="h-full border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-transparent">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <BarChart3 className="h-6 w-6 text-purple-500" />
                  </div>
                  <CardTitle className="text-xl">Readiness Score™</CardTitle>
                </div>
                <Badge variant="outline" className="w-fit border-purple-500/30 text-purple-600">
                  Per Repository
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-purple-500 mb-2">87</div>
                    <div className="text-sm text-text-muted">out of 100</div>
                    <Badge variant="success" className="mt-2">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Good
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Gate Pass Rate</span>
                      <span className="font-semibold">92%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Policy Compliance</span>
                      <span className="font-semibold">95%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Test Coverage</span>
                      <span className="font-semibold">87%</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-border text-xs text-text-muted">
                    Visible in PRs and dashboards. Creates competitive pressure for code quality.
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Risk Exposure Index */}
          <motion.div variants={prefersReducedMotion ? fadeIn : staggerItem}>
            <Card className="h-full border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <AlertTriangle className="h-6 w-6 text-blue-500" />
                  </div>
                  <CardTitle className="text-xl">AI Risk Exposure Index™</CardTitle>
                </div>
                <Badge variant="outline" className="w-fit border-blue-500/30 text-blue-600">
                  Per Organization
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-blue-500 mb-2">32</div>
                    <div className="text-sm text-text-muted">out of 100</div>
                    <Badge variant="info" className="mt-2">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      Low Risk
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">AI-Touched %</span>
                      <span className="font-semibold">45%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Unreviewed Merges</span>
                      <span className="font-semibold text-success">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Critical Findings</span>
                      <span className="font-semibold">2%</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-border text-xs text-text-muted">
                    Organization-wide risk assessment. Track trends and improve over time.
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <motion.div
          className="mt-12 text-center"
          variants={prefersReducedMotion ? fadeIn : staggerItem}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <Card className="bg-background/50 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-semibold">Absence is Visible</span>
              </div>
              <p className="text-sm text-text-muted max-w-2xl mx-auto">
                Every PR reviewed by ReadyLayer gets a Merge Confidence Certificate. 
                PRs without certificates are immediately identifiable as unreviewed. 
                This creates cultural lock-in through visible accountability.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </Container>
    </section>
  );
}
