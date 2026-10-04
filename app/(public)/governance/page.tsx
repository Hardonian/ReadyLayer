import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Card, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  Lock,
  FileCheck2,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Deterministic AI Code Governance Architecture | ReadyLayer',
  description:
    'Human-in-the-loop and cryptographic governance for AI-assisted code. Deterministic policy engines, package slopsquatting defense, and in-toto provenance attestation.',
}

export default function GovernancePage(): React.JSX.Element {
  return (
    <main className="min-h-screen py-16 lg:py-24 space-y-20">
      <Container size="lg" className="space-y-8 text-center">
        <Badge variant="outline" className="mx-auto font-mono text-xs">
          DETERMINISTIC TRUST ARCHITECTURE
        </Badge>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight text-text-primary max-w-4xl mx-auto">
          Governance You Can Cryptographically Audit
        </h1>
        <p className="text-text-muted text-lg sm:text-xl font-body max-w-3xl mx-auto leading-relaxed">
          AI cannot reliably audit AI. ReadyLayer replaces non-deterministic LLM feedback with deterministic policy evaluation, blast radius containment, and signed in-toto evidence bundles.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Button asChild size="lg" className="shadow-glow tap-target px-8 py-6 text-base font-semibold">
            <Link href="/enterprise">Explore Enterprise Platform</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="tap-target px-8 py-6 text-base font-medium">
            <Link href="/docs">Read Architecture RFC</Link>
          </Button>
        </div>
      </Container>

      {/* The 3 Axioms */}
      <Container size="lg" className="space-y-6">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-border/30 bg-surface/50 p-6 space-y-3 shadow-surface-raised">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg font-display">1. Absolute Determinism</CardTitle>
            <p className="text-sm text-text-muted leading-relaxed">
              Same git diff + same policy configuration produces identical JSON evidence and binary decision hashes every single time. No model drift or temperature volatility.
            </p>
          </Card>

          <Card className="border-border/30 bg-surface/50 p-6 space-y-3 shadow-surface-raised">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <Lock className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg font-display">2. Blast Radius Dual-Custody</CardTitle>
            <p className="text-sm text-text-muted leading-relaxed">
              Autonomous agents can move at breakneck speed on application logic, but any mutation to Tier 0 perimeter zones (CI/CD, Terraform, IAM, auth) strictly requires human dual-custody.
            </p>
          </Card>

          <Card className="border-border/30 bg-surface/50 p-6 space-y-3 shadow-surface-raised">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg font-display">3. Verifiable in-toto Provenance</CardTitle>
            <p className="text-sm text-text-muted leading-relaxed">
              Every accepted change is bound to an in-toto v1.0 Statement and CycloneDX 1.6 AIBOM, proving model lineage, prompt hashes, and policy checks to auditors.
            </p>
          </Card>
        </div>
      </Container>

      {/* The 5-Stage Governance Flow */}
      <Container size="lg" className="space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="outline" className="font-mono text-xs">END-TO-END SPECIFICATION</Badge>
          <h2 className="text-3xl font-display font-bold text-text-primary">
            The ReadyLayer 5-Stage Governance Chain
          </h2>
          <p className="text-text-muted text-sm sm:text-base">
            How code transitions from raw agent synthesis to cryptographically verified production artifact.
          </p>
        </div>

        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="p-6 rounded-xl border border-border/30 bg-surface/40 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center font-mono font-bold text-primary text-lg">
              01
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-display font-semibold text-text-primary">Agent Intake & Context Fingerprinting</h3>
              <p className="text-sm text-text-muted">
                The agent (via MCP or CLI) reports its session context. ReadyLayer computes cryptographic SHA-256 hashes of the prompts, model parameters, and tool call traces while redacting secrets and PII.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-border/30 bg-surface/40 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-mono font-bold text-amber-500 text-lg">
              02
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-display font-semibold text-text-primary">Blast Radius Boundary Analysis</h3>
              <p className="text-sm text-text-muted">
                Files modified are mapped against repository risk tiers. Tier 0 (CI workflows, Terraform, IAM, crypto) and Tier 1 (database migrations, billing) trigger immediate dual-custody flags.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-border/30 bg-surface/40 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center font-mono font-bold text-rose-500 text-lg">
              03
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-display font-semibold text-text-primary">Package Slopsquatting & Supply-Chain Scan</h3>
              <p className="text-sm text-text-muted">
                All newly added package dependencies are inspected. AI hallucinated names, synthetic stems, and typo-squatted packages are blocked prior to dependency installation or CI execution.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-border/30 bg-surface/40 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center font-mono font-bold text-accent text-lg">
              04
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-display font-semibold text-text-primary">Deterministic Policy-as-Code Evaluation</h3>
              <p className="text-sm text-text-muted">
                The portable Go runner evaluates packaged and custom rules locally with no network calls and emits schema-validated JSON output. Benchmark it against your own repositories and hardware before setting a latency objective.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-border/30 bg-surface/40 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-emerald-500 text-lg">
              05
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-display font-semibold text-text-primary">in-toto Attestation Minting & Dual-Custody Merge</h3>
              <p className="text-sm text-text-muted">
                If policies pass, a cryptographically signed in-toto v1.0 Statement and CycloneDX AIBOM are generated and attached to the Git commit. If dual-custody is required, designated security custodians sign before CI allows merge.
              </p>
            </div>
          </div>
        </div>
      </Container>

      {/* CTA Strip */}
      <Container size="lg" className="text-center space-y-6 pt-12 border-t border-border/30">
        <h2 className="text-3xl font-display font-bold text-text-primary">
          Ready to Implement Deterministic AI Governance?
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg" className="shadow-glow px-8 py-6 text-base font-semibold">
            <Link href="/enterprise">View Enterprise Details</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="px-8 py-6 text-base font-medium">
            <Link href="/docs">View Documentation</Link>
          </Button>
        </div>
      </Container>
    </main>
  )
}
