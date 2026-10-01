import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AgentRiskSimulator } from '@/components/enterprise/AgentRiskSimulator'
import {
  Shield,
  Lock,
  Terminal,
  FileCheck2,
  Server,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Enterprise AI Agent Governance | ReadyLayer',
  description:
    'The trust and control plane for autonomous coding agents. Enforce deterministic policy boundaries, eliminate package slopsquatting, and mint cryptographically verifiable in-toto/SLSA provenance.',
}

export default function EnterprisePage(): React.JSX.Element {
  return (
    <main className="min-h-screen py-16 lg:py-24 space-y-24">
      {/* Hero Section */}
      <Container size="lg" className="space-y-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono font-medium mx-auto">
          <Sparkles className="h-3.5 w-3.5" />
          <span>ENTERPRISE AI AGENT GOVERNANCE & TRUST PLANE</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-bold tracking-tight text-text-primary max-w-5xl mx-auto leading-tight">
          Autonomous Coding Velocity.{' '}
          <span className="bg-gradient-to-r from-primary via-accent to-success bg-clip-text text-transparent">
            Zero Uncontrolled Blast Radius.
          </span>
        </h1>

        <p className="text-lg sm:text-xl font-body text-text-muted max-w-3xl mx-auto leading-relaxed">
          Empower your engineering organization to deploy Cursor, Claude Code, Windsurf, and Devin without risking supply chain poisoning, perimeter escalation, or regulatory non-compliance.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Button asChild size="lg" className="shadow-glow tap-target px-8 py-6 text-base font-semibold">
            <Link href="/contact">Request Enterprise Pilot</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="tap-target px-8 py-6 text-base font-medium">
            <Link href="/docs">View Architecture Specs</Link>
          </Button>
        </div>

        <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
          <div className="p-4 rounded-xl border border-border/30 bg-surface/40 backdrop-blur-sm">
            <div className="text-2xl font-bold font-display text-text-primary">&lt;15ms</div>
            <div className="text-xs text-text-muted mt-1 font-mono">Deterministic Decision Engine</div>
          </div>
          <div className="p-4 rounded-xl border border-border/30 bg-surface/40 backdrop-blur-sm">
            <div className="text-2xl font-bold font-display text-emerald-500">100% Zero-Leak</div>
            <div className="text-xs text-text-muted mt-1 font-mono">Air-Gapped Sovereign Runner</div>
          </div>
          <div className="p-4 rounded-xl border border-border/30 bg-surface/40 backdrop-blur-sm">
            <div className="text-2xl font-bold font-display text-text-primary">in-toto v1.0</div>
            <div className="text-xs text-text-muted mt-1 font-mono">SLSA Level 2+ Attestation</div>
          </div>
          <div className="p-4 rounded-xl border border-border/30 bg-surface/40 backdrop-blur-sm">
            <div className="text-2xl font-bold font-display text-primary">MCP-Native</div>
            <div className="text-xs text-text-muted mt-1 font-mono">Universal Agent Protocol</div>
          </div>
        </div>
      </Container>

      {/* Interactive Simulator Section */}
      <Container size="lg" className="space-y-6">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-text-primary">
            Experience Agentic Containment in Real Time
          </h2>
          <p className="text-text-muted text-sm sm:text-base max-w-2xl mx-auto">
            See how ReadyLayer catches hallucinated packages, enforces dual-custody approval, and mints signed audit bundles.
          </p>
        </div>
        <AgentRiskSimulator />
      </Container>

      {/* The 4 Enterprise Pillars */}
      <Container size="lg" className="space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge variant="outline" className="font-mono text-xs">ARCHITECTURAL PILLARS</Badge>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-text-primary">
            Engineered for Modern Agentic Delivery
          </h2>
          <p className="text-text-muted text-base">
            Existing linters and PR comment bots cannot stop agent hallucinations or contain autonomous blast radius. ReadyLayer is purpose-built for the AI agent era.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="border-border/30 bg-surface/40 backdrop-blur-md shadow-surface-raised hover:border-primary/40 transition-all duration-300">
            <CardHeader className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-display">AI Package Slopsquatting & Supply-Chain Defense</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                When coding agents generate code, they frequently hallucinate non-existent package names. Threat actors register these names on npm and PyPI to achieve RCE in CI. ReadyLayer deterministically intercepts new dependencies, scoring age, download velocity, and synthetic stems before execution.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 text-xs font-mono text-text-subtle">
                <span className="px-2.5 py-1 rounded bg-surface border border-border/30">Typo-distance analysis</span>
                <span className="px-2.5 py-1 rounded bg-surface border border-border/30">Synthetic stem detection</span>
                <span className="px-2.5 py-1 rounded bg-surface border border-border/30">Registry provenance checks</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/30 bg-surface/40 backdrop-blur-md shadow-surface-raised hover:border-primary/40 transition-all duration-300">
            <CardHeader className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Lock className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-display">Agent Blast Radius Containment & Dual-Custody</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Autonomous agents shouldn't modify CI/CD pipelines, IAM roles, Kubernetes specs, or database migrations without human sign-off. ReadyLayer classifies repository zones into 4 Risk Tiers (Tier 0 to Tier 3), automatically enforcing dual-custody sign-off for critical perimeter mutations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 text-xs font-mono text-text-subtle">
                <span className="px-2.5 py-1 rounded bg-surface border border-border/30">Tier-0 perimeter guard</span>
                <span className="px-2.5 py-1 rounded bg-surface border border-border/30">Multi-party cryptographic gate</span>
                <span className="px-2.5 py-1 rounded bg-surface border border-border/30">Autonomous merge circuit-breaker</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/30 bg-surface/40 backdrop-blur-md shadow-surface-raised hover:border-primary/40 transition-all duration-300">
            <CardHeader className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <FileCheck2 className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-display">Cryptographic in-toto v1.0 & CycloneDX AIBOM</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Regulated enterprises cannot merge AI-generated code without verifiable provenance. ReadyLayer mints signed in-toto v1.0 statements and CycloneDX 1.6 Generative AI Software Bill of Materials (AIBOM), binding model versions, prompt SHA-256 digests, and policy evaluation results into an immutable envelope.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 text-xs font-mono text-text-subtle">
                <span className="px-2.5 py-1 rounded bg-surface border border-border/30">SLSA Level 2+ provenance</span>
                <span className="px-2.5 py-1 rounded bg-surface border border-border/30">CycloneDX 1.6 AIBOM</span>
                <span className="px-2.5 py-1 rounded bg-surface border border-border/30">Ed25519 & HMAC digital signatures</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/30 bg-surface/40 backdrop-blur-md shadow-surface-raised hover:border-primary/40 transition-all duration-300">
            <CardHeader className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <Terminal className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-display">Native Model Context Protocol (MCP) Agent Gateway</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Connect Cursor, Claude Code, Windsurf, or custom agent swarms directly to ReadyLayer over stdio or SSE. Agents preflight diffs against corporate security policies, verify dependencies in real-time, and mint provenance before ever pushing code to remote repositories.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 text-xs font-mono text-text-subtle">
                <span className="px-2.5 py-1 rounded bg-surface border border-border/30">Claude Code & Cursor ready</span>
                <span className="px-2.5 py-1 rounded bg-surface border border-border/30">Local CLI preflight checks</span>
                <span className="px-2.5 py-1 rounded bg-surface border border-border/30">Zero latency overhead</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>

      {/* Compliance Frameworks Grid */}
      <Container size="lg" className="space-y-12">
        <div className="p-8 sm:p-12 rounded-2xl border border-border/40 bg-surface/30 backdrop-blur-xl space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="outline" className="font-mono text-xs">REGULATORY READINESS</Badge>
            <h2 className="text-3xl font-display font-bold text-text-primary">
              Turn-Key Enterprise Compliance Packs
            </h2>
            <p className="text-text-muted text-sm sm:text-base">
              Out-of-the-box policy packs designed to satisfy the world&apos;s most stringent AI and software security standards.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-xl border border-border/30 bg-surface/50 space-y-2">
              <div className="font-semibold text-text-primary flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span>OWASP LLM Top 10</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                2025/2026 edition covering prompt injection (LLM01), sensitive data exposure (LLM02), and excessive agency (LLM06).
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border/30 bg-surface/50 space-y-2">
              <div className="font-semibold text-text-primary flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-500" />
                <span>NIST AI RMF (SP 1270)</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Govern, Map, Measure, and Manage controls for synthetic code artifacts and AI agent oversight.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border/30 bg-surface/50 space-y-2">
              <div className="font-semibold text-text-primary flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                <span>EU AI Act (Art. 14 & 50)</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Mandatory human oversight technical measures, dual-custody verification, and machine-readable transparency marking.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border/30 bg-surface/50 space-y-2">
              <div className="font-semibold text-text-primary flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-500" />
                <span>SOC 2 Type II & ISO 42001</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Immutable evidence bundles, cryptographic audit trails, and strict separation of duties for automated systems.
              </p>
            </div>
          </div>
        </div>
      </Container>

      {/* Comparison Table */}
      <Container size="lg" className="space-y-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="outline" className="font-mono text-xs">DIFFERENTIATION MATRIX</Badge>
          <h2 className="text-3xl font-display font-bold text-text-primary">
            How ReadyLayer Outperforms Conventional Tools
          </h2>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/40 bg-surface/40 backdrop-blur-md">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-surface-subtle/50 text-text-primary font-display">
                <th className="p-4 font-semibold">Capability</th>
                <th className="p-4 font-medium text-text-muted">Traditional Linters (Sonar, ESLint)</th>
                <th className="p-4 font-medium text-text-muted">AI PR Comment Bots (CodeRabbit)</th>
                <th className="p-4 font-semibold text-primary">ReadyLayer Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-xs sm:text-sm font-body">
              <tr>
                <td className="p-4 font-medium text-text-primary">AI Package Slopsquatting Defense</td>
                <td className="p-4 text-rose-500">❌ None</td>
                <td className="p-4 text-rose-500">❌ None (hallucination prone)</td>
                <td className="p-4 font-semibold text-emerald-400">✅ Deterministic Interception</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-text-primary">Agent Blast Radius Containment</td>
                <td className="p-4 text-rose-500">❌ Unaware of agent loops</td>
                <td className="p-4 text-rose-500">❌ Advisory comments only</td>
                <td className="p-4 font-semibold text-emerald-400">✅ Tier 0-3 Dual-Custody Gates</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-text-primary">Cryptographic in-toto / SLSA Attestation</td>
                <td className="p-4 text-rose-500">❌ None</td>
                <td className="p-4 text-rose-500">❌ Non-verifiable comments</td>
                <td className="p-4 font-semibold text-emerald-400">✅ Signed in-toto v1.0 Statement</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-text-primary">Model Context Protocol (MCP) Integration</td>
                <td className="p-4 text-rose-500">❌ None</td>
                <td className="p-4 text-rose-500">❌ None</td>
                <td className="p-4 font-semibold text-emerald-400">✅ Full Stdio/SSE MCP Suite</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-text-primary">Air-Gapped Sovereign Execution</td>
                <td className="p-4 text-emerald-400">✅ Local binary</td>
                <td className="p-4 text-rose-500">❌ Requires SaaS LLM call</td>
                <td className="p-4 font-semibold text-emerald-400">✅ 100% Zero Network Leakage</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Container>

      {/* Deployment Topologies */}
      <Container size="lg" className="space-y-8">
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="border-border/30 bg-surface/50 p-6 space-y-6">
            <div className="flex items-center gap-3">
              <Server className="h-8 w-8 text-primary" />
              <div>
                <h3 className="text-xl font-display font-bold text-text-primary">Self-Hosted Air-Gapped</h3>
                <p className="text-xs font-mono text-text-muted">For Banking, Defense, and Sovereign VPCs</p>
              </div>
            </div>
            <ul className="space-y-2.5 text-xs text-text-muted">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>Zero telemetry or outbound network requirements</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>Helm charts & Docker Compose for immediate on-prem cluster deployment</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>Bring-your-own KMS keys and database infrastructure</span>
              </li>
            </ul>
            <Button asChild variant="outline" className="w-full">
              <Link href="/docs">View On-Prem Deployment Guide</Link>
            </Button>
          </Card>

          <Card className="border-primary/40 bg-surface/50 p-6 space-y-6 ring-1 ring-primary/30 shadow-glow">
            <div className="flex items-center gap-3">
              <Cloud className="h-8 w-8 text-accent" />
              <div>
                <h3 className="text-xl font-display font-bold text-text-primary">Enterprise Dedicated Cloud</h3>
                <p className="text-xs font-mono text-text-muted">Managed High-Availability Multi-Tenant</p>
              </div>
            </div>
            <ul className="space-y-2.5 text-xs text-text-muted">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>Single-tenant VPC isolation with 99.99% uptime SLA</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>SAML 2.0 / Okta / Azure AD SSO & SCIM directory synchronization</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>24/7 dedicated support engineering & quarterly policy reviews</span>
              </li>
            </ul>
            <Button asChild className="w-full shadow-glow">
              <Link href="/contact">Contact Enterprise Sales</Link>
            </Button>
          </Card>
        </div>
      </Container>

      {/* Bottom CTA */}
      <Container size="lg" className="text-center space-y-6 pt-12 border-t border-border/30">
        <h2 className="text-3xl sm:text-4xl font-display font-bold text-text-primary">
          Ready to Secure Your Agentic Software Delivery?
        </h2>
        <p className="text-text-muted max-w-xl mx-auto text-base">
          Join high-performing platform and security teams deploying autonomous coding agents with total cryptographic governance.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg" className="shadow-glow px-8 py-6 text-base font-semibold">
            <Link href="/contact">Schedule Technical Briefing</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="px-8 py-6 text-base font-medium">
            <Link href="/open-source">Deploy Open Source</Link>
          </Button>
        </div>
      </Container>
    </main>
  )
}
