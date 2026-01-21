'use client'

import { motion } from 'framer-motion'
import { Container } from '@/components/ui/container'
import { Badge } from '@/components/ui/badge'
import { fadeIn, slideUp } from '@/lib/design/motion'
import { Shield, Lock, Eye, CheckCircle2, AlertCircle, FileText, Mail } from 'lucide-react'

export default function SecurityPage() {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="py-16 lg:py-24 bg-surface-muted/50 border-b border-border-subtle">
        <Container size="lg">
          <motion.div
            className="text-center mb-8"
            variants={prefersReducedMotion ? fadeIn : slideUp}
            initial="hidden"
            animate="visible"
          >
            <Badge className="mb-4 bg-accent/10 text-accent">Enterprise Security</Badge>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              Security & Compliance
            </h1>
            <p className="text-xl text-text-muted max-w-3xl mx-auto">
              ReadyLayer is built with security, privacy, and transparency at its core. We maintain
              enterprise-grade compliance standards and provide complete visibility into all decisions.
            </p>
          </motion.div>
        </Container>
      </section>

      {/* Compliance Standards */}
      <section className="py-16 lg:py-24">
        <Container size="lg">
          <motion.div
            className="mb-12"
            variants={prefersReducedMotion ? fadeIn : slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            <h2 className="text-3xl font-bold mb-8">Compliance & Certifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SOC 2 */}
              <motion.div
                className="p-6 rounded-lg border border-border-subtle bg-surface-raised"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0 }}
                viewport={{ once: true }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-accent/10 flex-shrink-0">
                    <Shield className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">SOC 2 Type II</h3>
                    <p className="text-text-muted mb-4">
                      Scheduled for Q2 2026. Demonstrates our commitment to security, availability, and
                      processing integrity with independent audit.
                    </p>
                    <a href="#contact" className="text-accent hover:text-accent-hover font-medium">
                      Request audit report →
                    </a>
                  </div>
                </div>
              </motion.div>

              {/* GDPR */}
              <motion.div
                className="p-6 rounded-lg border border-border-subtle bg-surface-raised"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                viewport={{ once: true }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-accent/10 flex-shrink-0">
                    <Eye className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">GDPR & Privacy</h3>
                    <p className="text-text-muted mb-4">
                      Full GDPR compliance with Data Processing Agreements, right to access, and right
                      to erasure implemented.
                    </p>
                    <a href="/privacy" className="text-accent hover:text-accent-hover font-medium">
                      Privacy policy →
                    </a>
                  </div>
                </div>
              </motion.div>

              {/* CCPA */}
              <motion.div
                className="p-6 rounded-lg border border-border-subtle bg-surface-raised"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                viewport={{ once: true }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-accent/10 flex-shrink-0">
                    <Lock className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">CCPA Compliant</h3>
                    <p className="text-text-muted mb-4">
                      California Consumer Privacy Act compliance with consumer rights implementation
                      and transparency requirements.
                    </p>
                    <a href="/privacy" className="text-accent hover:text-accent-hover font-medium">
                      Learn more →
                    </a>
                  </div>
                </div>
              </motion.div>

              {/* ISO 27001 */}
              <motion.div
                className="p-6 rounded-lg border border-border-subtle bg-surface-raised"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                viewport={{ once: true }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-accent/10 flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">ISO 27001 Ready</h3>
                    <p className="text-text-muted mb-4">
                      Information security management systems in place. Planning certification for
                      2026.
                    </p>
                    <a href="#contact" className="text-accent hover:text-accent-hover font-medium">
                      Inquiry →
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </Container>
      </section>

      {/* Security Features */}
      <section className="py-16 lg:py-24 bg-surface-muted/50">
        <Container size="lg">
          <motion.div
            className="mb-12"
            variants={prefersReducedMotion ? fadeIn : slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            <h2 className="text-3xl font-bold mb-8">Security Features</h2>
            <div className="space-y-6">
              {[
                {
                  title: 'End-to-End Encryption',
                  description:
                    'All data in transit uses TLS 1.3 with 256-bit encryption. At-rest encryption uses ChaCha20-Poly1305.',
                },
                {
                  title: 'Secret Redaction',
                  description:
                    'Automatic detection and redaction of API keys, passwords, SSH keys, and PII before any LLM processing. Prevents accidental exposure.',
                },
                {
                  title: 'Audit Logging',
                  description:
                    'Immutable audit trail of all actions with cryptographic hashing. Complete visibility into who did what and when.',
                },
                {
                  title: 'Row-Level Security',
                  description:
                    'Database-enforced tenant isolation. Organizations cannot access other organizations\' data at the database level.',
                },
                {
                  title: 'JWT Token Security',
                  description:
                    'Secure token generation and validation with httpOnly cookies, SameSite attributes, and automatic expiration.',
                },
                {
                  title: 'Webhook Signature Verification',
                  description:
                    'All webhooks from GitHub and other providers are cryptographically verified before processing.',
                },
              ].map((feature, idx) => (
                <motion.div
                  key={feature.title}
                  className="p-6 rounded-lg border border-border-subtle bg-surface-raised"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  viewport={{ once: true }}
                >
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-text-muted">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </Container>
      </section>

      {/* Data Protection */}
      <section className="py-16 lg:py-24">
        <Container size="lg">
          <motion.div
            className="mb-12"
            variants={prefersReducedMotion ? fadeIn : slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            <h2 className="text-3xl font-bold mb-8">Data Protection & Privacy</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-lg mb-4">Data Handling</h3>
                <ul className="space-y-3">
                  {[
                    'No personal data is shared with LLM providers without explicit consent',
                    'Code reviews and findings stored encrypted in PostgreSQL',
                    'Automatic data redaction before any external processing',
                    'Data residency options for EU and US customers',
                    'Regular security updates and patch management',
                  ].map((item, idx) => (
                    <li key={idx} className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-text-muted">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-4">Transparency & Control</h3>
                <ul className="space-y-3">
                  {[
                    'Full Data Processing Agreement available',
                    'Export data in standard formats (JSON, CSV)',
                    'Right to data deletion within 30 days',
                    'Audit logs accessible to account admins',
                    'Policy version tracking for compliance proof',
                  ].map((item, idx) => (
                    <li key={idx} className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-text-muted">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </Container>
      </section>

      {/* Vulnerability Disclosure */}
      <section className="py-16 lg:py-24 bg-surface-muted/50">
        <Container size="lg">
          <motion.div
            className="text-center max-w-2xl mx-auto"
            variants={prefersReducedMotion ? fadeIn : slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            <div className="p-3 rounded-lg bg-warning/10 inline-block mb-4">
              <AlertCircle className="h-5 w-5 text-warning" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Security Matters</h2>
            <p className="text-text-muted mb-6">
              We take security vulnerabilities seriously. Please review our responsible disclosure policy.
            </p>
            <a
              href="https://github.com/Hardonian/ReadyLayer/blob/main/SECURITY.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent-hover transition-colors"
            >
              <FileText className="h-4 w-4" />
              View Security Policy
            </a>
          </motion.div>
        </Container>
      </section>

      {/* Contact Section */}
      <section className="py-16 lg:py-24">
        <Container size="lg">
          <motion.div
            id="contact"
            className="text-center max-w-2xl mx-auto"
            variants={prefersReducedMotion ? fadeIn : slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            <h2 className="text-3xl font-bold mb-4">Questions About Security?</h2>
            <p className="text-text-muted mb-6">
              Our security team is happy to discuss compliance requirements, audit details, and security
              measures tailored to your organization.
            </p>
            <a
              href="mailto:security@readylayer.io"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-accent text-accent font-medium hover:bg-accent/10 transition-colors"
            >
              <Mail className="h-4 w-4" />
              Contact Security Team
            </a>
          </motion.div>
        </Container>
      </section>
    </main>
  )
}
