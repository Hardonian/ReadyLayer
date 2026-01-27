'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Container } from '@/components/ui/container'
import { Badge } from '@/components/ui/badge'
import { fadeIn, slideUp } from '@/lib/design/motion'
import { CheckCircle2, Clock, Lock, FileText, Copy } from 'lucide-react'

export default function AuditExamplePage(): React.JSX.Element {
  const [copied, setCopied] = React.useState<string | null>(null)

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const exampleData = {
    reviewId: 'review_abc123def456',
    timestamp: '2026-01-19T15:30:45Z',
    policyVersion: 'pol_v2_hash_5e7d8f9a2b1c',
    evaluationHash: 'sha256_3f8a9c2d7e1b5f4a8c9d2e1f3a4b5c6d',
    input: {
      diff: '+ function validateToken(token: string) {\n+   return token.length > 0;\n+ }',
      files: 'src/auth.ts',
      repo: 'org/secure-api',
    },
    findings: [
      {
        id: 'sec_001',
        severity: 'high',
        title: 'Weak Token Validation',
        description: 'Token validation only checks length, not format',
        location: 'src/auth.ts:5',
      },
    ],
    evidenceBundle: {
      policyChecksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      inputHash: '7c4a8d09ca3762af61e59520943dc26494f8941b',
      outputHash: '356a192b7913b04c54574d18c28d46e6395428ab',
      signature: 'RSA_SHA256_...',
      timestamp: '2026-01-19T15:30:45.123Z',
    },
    decision: {
      isBlocked: true,
      reason: 'High-severity findings require review',
      policyRules: [
        { id: 'rule_001', name: 'Security Gate', matched: true, severity: 'CRITICAL' },
        { id: 'rule_002', name: 'Code Quality', matched: true, severity: 'MEDIUM' },
      ],
    },
  }

  const CodeBlock = ({ code, label, id }: { code: string; label: string; id: string }) => (
    <motion.div
      className="mb-6"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-text-muted">{label}</label>
        <button
          onClick={() => handleCopy(code, id)}
          className="text-xs px-2 py-1 rounded border border-border-subtle hover:border-accent hover:text-accent transition-colors flex items-center gap-1"
        >
          <Copy className="h-3 w-3" />
          {copied === id ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 rounded-lg bg-surface-muted border border-border-subtle overflow-x-auto text-xs leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </motion.div>
  )

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="py-16 lg:py-24 bg-surface-muted/50 border-b border-border-subtle">
        <Container size="lg">
          <motion.div
            className="text-center"
            variants={prefersReducedMotion ? fadeIn : slideUp}
            initial="hidden"
            animate="visible"
          >
            <Badge className="mb-4 bg-accent/10 text-accent">Deterministic & Auditable</Badge>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">Audit Trail Example</h1>
            <p className="text-xl text-text-muted max-w-3xl mx-auto">
              See how ReadyLayer provides complete transparency into every review decision with
              cryptographic proof and evidence bundles.
            </p>
          </motion.div>
        </Container>
      </section>

      {/* Example Data */}
      <section className="py-16 lg:py-24">
        <Container size="lg">
          <div className="max-w-4xl mx-auto">
            {/* Review Summary */}
            <motion.div
              className="mb-12 p-8 rounded-lg border border-accent/20 bg-accent/5"
              variants={prefersReducedMotion ? fadeIn : slideUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
            >
              <h2 className="text-2xl font-bold mb-6">Review Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                    Review ID
                  </label>
                  <p className="text-lg font-mono mt-1">{exampleData.reviewId}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                    Timestamp
                  </label>
                  <p className="text-lg font-mono mt-1">{exampleData.timestamp}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                    Policy Version
                  </label>
                  <p className="text-lg font-mono mt-1">{exampleData.policyVersion}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                    Evaluation Hash
                  </label>
                  <p className="text-lg font-mono mt-1 truncate" title={exampleData.evaluationHash}>
                    {exampleData.evaluationHash.substring(0, 30)}...
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Input Data */}
            <motion.div
              className="mb-12"
              variants={prefersReducedMotion ? fadeIn : slideUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
            >
              <h2 className="text-2xl font-bold mb-6">Input Data</h2>
              <CodeBlock
                code={JSON.stringify(exampleData.input, null, 2)}
                label="Pull Request Diff"
                id="input"
              />
            </motion.div>

            {/* Findings */}
            <motion.div
              className="mb-12"
              variants={prefersReducedMotion ? fadeIn : slideUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
            >
              <h2 className="text-2xl font-bold mb-6">Findings</h2>
              {exampleData.findings.map((finding) => (
                <motion.div
                  key={finding.id}
                  className="p-6 rounded-lg border border-danger/20 bg-danger/5 mb-4"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-danger/10 flex-shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-danger" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{finding.title}</h3>
                        <Badge variant="destructive" className="text-xs">
                          {finding.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-text-muted mb-2">{finding.description}</p>
                      <p className="text-xs text-text-subtle">{finding.location}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Decision & Policy Rules */}
            <motion.div
              className="mb-12"
              variants={prefersReducedMotion ? fadeIn : slideUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
            >
              <h2 className="text-2xl font-bold mb-6">Policy Evaluation</h2>
              <motion.div
                className="p-6 rounded-lg border border-danger/20 bg-danger/5 mb-6"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-danger/10">
                    <Lock className="h-5 w-5 text-danger" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Review Blocked</h3>
                    <p className="text-sm text-text-muted">{exampleData.decision.reason}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Policy Rules Evaluated:</h4>
                  {exampleData.decision.policyRules.map((rule) => (
                    <motion.div
                      key={rule.id}
                      className="flex items-center gap-3 p-3 rounded bg-surface-raised"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                    >
                      <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{rule.name}</p>
                        <p className="text-xs text-text-muted">{rule.id}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {rule.severity}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            {/* Evidence Bundle */}
            <motion.div
              className="mb-12"
              variants={prefersReducedMotion ? fadeIn : slideUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
            >
              <h2 className="text-2xl font-bold mb-6">Cryptographic Evidence Bundle</h2>
              <p className="text-text-muted mb-6">
                Every decision is cryptographically signed and bundled with its inputs and outputs. This
                allows for complete verification and replay of the decision.
              </p>
              <CodeBlock
                code={JSON.stringify(exampleData.evidenceBundle, null, 2)}
                label="Evidence Bundle (JSON)"
                id="evidence"
              />

              <motion.div
                className="p-6 rounded-lg border border-success/20 bg-success/5"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-success/10 flex-shrink-0 mt-1">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Deterministic Decision</h4>
                    <p className="text-sm text-text-muted mb-3">
                      Same inputs + same policy version = same output (deterministic guarantee)
                    </p>
                    <p className="text-xs text-text-subtle">
                      Signature verified ✓ | Hashes matched ✓ | Audit trail immutable ✓
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Key Insights */}
            <motion.div
              className="p-8 rounded-lg border border-accent/20 bg-accent/5"
              variants={prefersReducedMotion ? fadeIn : slideUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
            >
              <h2 className="text-2xl font-bold mb-6">Why This Matters</h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <FileText className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Complete Auditability</h4>
                    <p className="text-text-muted">
                      Every decision is logged with its exact inputs, outputs, and policy version for
                      compliance verification.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Lock className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Tamper-Proof</h4>
                    <p className="text-text-muted">
                      Cryptographic hashing and signatures ensure audit trails cannot be modified without
                      detection.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Clock className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Reproducible</h4>
                    <p className="text-text-muted">
                      Same inputs and policy always produce the same results, making decisions verifiable and
                      defendable in audits.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-surface-muted/50 border-t border-border-subtle">
        <Container size="lg">
          <motion.div
            className="text-center max-w-2xl mx-auto"
            variants={prefersReducedMotion ? fadeIn : slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            <h2 className="text-3xl font-bold mb-4">Ready to review audit artifacts?</h2>
            <p className="text-text-muted mb-6">
              Use the OSS workflow to generate evidence bundles, policy hashes, and deterministic decision logs.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href="/docs"
                className="inline-flex px-6 py-3 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent-hover transition-colors"
              >
                Get started (OSS)
              </a>
              <a
                href="https://github.com/Hardonian/ReadyLayer"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex px-6 py-3 rounded-lg border border-border-subtle bg-surface-raised font-medium hover:bg-surface-hover transition-colors"
              >
                See GitHub
              </a>
            </div>
          </motion.div>
        </Container>
      </section>
    </main>
  )
}
