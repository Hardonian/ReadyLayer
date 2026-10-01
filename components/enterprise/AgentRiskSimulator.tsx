'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  FileCode,
  Terminal,
} from 'lucide-react'

interface Scenario {
  id: string
  title: string
  subtitle: string
  agent: string
  model: string
  riskTier: 'TIER_0_CRITICAL' | 'TIER_1_PERSISTENCE' | 'TIER_2_APPLICATION' | 'TIER_3_SAFE'
  verdict: 'BLOCKED' | 'NEEDS_DUAL_CUSTODY' | 'PASSED'
  score: number
  targetFile: string
  diffPreview: string
  explanation: string
  attestationSnippet: {
    predicateType: string
    agentId: string
    policyChecksum: string
    signatureAlgorithm: string
  }
}

const SCENARIOS: Scenario[] = [
  {
    id: 'slopsquatting',
    title: 'AI Package Slopsquatting Attack',
    subtitle: 'Agent hallucinates non-existent npm package; potential RCE supply-chain threat',
    agent: 'claude-code',
    model: 'claude-3-7-sonnet',
    riskTier: 'TIER_0_CRITICAL',
    verdict: 'BLOCKED',
    score: 85,
    targetFile: 'package.json',
    diffPreview: `--- a/package.json
+++ b/package.json
@@ -24,2 +24,3 @@
     "next": "^16.0.0",
+    "@auth/fast-jwt-vault-client": "^1.0.0",
     "zod": "^3.22.0"`,
    explanation:
      'CRITICAL: Package \'@auth/fast-jwt-vault-client\' flagged by ReadyLayer Slopsquatting Detector. Synthetic stem matches high-risk AI hallucination patterns. Pre-execution block prevented malicious supply-chain package takeover.',
    attestationSnippet: {
      predicateType: 'https://readylayer.dev/attestation/agent-governance/v1',
      agentId: 'claude-code',
      policyChecksum: 'owasp-llm-03:4f8a29...',
      signatureAlgorithm: 'ed25519-sha256',
    },
  },
  {
    id: 'blast-radius',
    title: 'Agent CI/CD Perimeter Escalation',
    subtitle: 'Autonomous agent attempts to modify deployment pipeline without human sign-off',
    agent: 'cursor-composer',
    model: 'gpt-4.5-preview',
    riskTier: 'TIER_0_CRITICAL',
    verdict: 'NEEDS_DUAL_CUSTODY',
    score: 92,
    targetFile: '.github/workflows/deploy.yml',
    diffPreview: `--- a/.github/workflows/deploy.yml
+++ b/.github/workflows/deploy.yml
@@ -18,2 +18,3 @@
     - name: Build & Deploy
+      env: AWS_ACCESS_KEY_ID: \${{ secrets.PROD_KEY }}
       run: npm run deploy:prod`,
    explanation:
      'PERIMETER BREACH: AI Agent crossed Tier 0 Security Boundary by mutating workflow secrets. Autonomous merge blocked. Cryptographic Dual-Custody required from a designated Security Custodian before merge.',
    attestationSnippet: {
      predicateType: 'https://readylayer.dev/attestation/agent-governance/v1',
      agentId: 'cursor-composer',
      policyChecksum: 'blast-radius-tier0:9e12cb...',
      signatureAlgorithm: 'ed25519-sha256',
    },
  },
  {
    id: 'compliant-feature',
    title: 'Compliant Feature with in-toto Attestation',
    subtitle: 'Standard agent change verified clean with CycloneDX AIBOM & signed provenance',
    agent: 'aider-autonomous',
    model: 'claude-3-7-sonnet',
    riskTier: 'TIER_2_APPLICATION',
    verdict: 'PASSED',
    score: 18,
    targetFile: 'components/analytics/MetricCard.tsx',
    diffPreview: `--- a/components/analytics/MetricCard.tsx
+++ b/components/analytics/MetricCard.tsx
@@ -5,2 +5,5 @@
+export function MetricCard({ title, value }: Props) {
+  return <div className="p-4 border rounded">{title}: {value}</div>;
+}`,
    explanation:
      'APPROVED: Change passed deterministic static checks, zero slopsquatting flags, and conforms to SOC 2 Type II / NIST AI RMF guidelines. In-toto provenance minted with cryptographic signature.',
    attestationSnippet: {
      predicateType: 'https://readylayer.dev/attestation/agent-governance/v1',
      agentId: 'aider-autonomous',
      policyChecksum: 'nist-ai-rmf:a4b771...',
      signatureAlgorithm: 'ed25519-sha256',
    },
  },
]

export function AgentRiskSimulator(): React.JSX.Element {
  const [activeScenarioId, setActiveScenarioId] = React.useState<string>('slopsquatting')
  const [activeTab, setActiveTab] = React.useState<'diff' | 'attestation'>('diff')

  const scenario = SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0]

  return (
    <div className="w-full max-w-5xl mx-auto rounded-2xl border border-border/40 bg-surface/50 backdrop-blur-xl p-6 sm:p-8 shadow-surface-raised">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/30">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-text-subtle">
              Interactive Agent Guard Simulator
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-display font-bold text-text-primary">
            Observe Deterministic Agent Containment in Action
          </h3>
        </div>
        <Badge variant="outline" className="font-mono text-xs px-3 py-1 flex items-center gap-1.5 self-start sm:self-auto">
          <Terminal className="h-3 w-3" />
          ReadyLayer Engine v2.0
        </Badge>
      </div>

      {/* Scenario Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-6">
        {SCENARIOS.map((sc) => {
          const isActive = sc.id === scenario.id
          return (
            <button
              key={sc.id}
              onClick={() => setActiveScenarioId(sc.id)}
              className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                isActive
                  ? 'border-primary/60 bg-primary/10 shadow-glow ring-1 ring-primary/40'
                  : 'border-border/30 bg-surface-subtle/40 hover:border-border/60 hover:bg-surface-subtle'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-mono font-medium text-text-subtle">{sc.agent}</span>
                {sc.verdict === 'BLOCKED' && (
                  <Badge variant="destructive" className="text-[10px] uppercase font-mono">
                    Blocked
                  </Badge>
                )}
                {sc.verdict === 'NEEDS_DUAL_CUSTODY' && (
                  <Badge variant="warning" className="text-[10px] uppercase font-mono">
                    Dual-Custody
                  </Badge>
                )}
                {sc.verdict === 'PASSED' && (
                  <Badge variant="success" className="text-[10px] uppercase font-mono">
                    Passed
                  </Badge>
                )}
              </div>
              <p className="text-sm font-semibold font-display text-text-primary">{sc.title}</p>
            </button>
          )
        })}
      </div>

      {/* Simulation Display Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Code Diff or Attestation */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-border/30 pb-2">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-text-muted" />
              <span className="text-xs font-mono text-text-muted">{scenario.targetFile}</span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setActiveTab('diff')}
                className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                  activeTab === 'diff'
                    ? 'bg-primary text-primary-foreground font-mono'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Diff
              </button>
              <button
                onClick={() => setActiveTab('attestation')}
                className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                  activeTab === 'attestation'
                    ? 'bg-primary text-primary-foreground font-mono'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                in-toto Attestation
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-200 border border-slate-800 shadow-inner overflow-x-auto min-h-[220px]">
            {activeTab === 'diff' ? (
              <pre className="leading-relaxed">
                {scenario.diffPreview.split('\n').map((line, idx) => {
                  let lineClass = 'text-slate-400'
                  if (line.startsWith('+')) lineClass = 'text-emerald-400 bg-emerald-950/40 px-1 rounded'
                  if (line.startsWith('-')) lineClass = 'text-rose-400 bg-rose-950/40 px-1 rounded'
                  if (line.startsWith('@@')) lineClass = 'text-cyan-400'
                  return (
                    <div key={idx} className={lineClass}>
                      {line}
                    </div>
                  )
                })}
              </pre>
            ) : (
              <pre className="leading-relaxed text-indigo-300">
                {JSON.stringify(
                  {
                    _type: 'https://in-toto.io/Statement/v1',
                    subject: [{ name: `git:file:${scenario.targetFile}`, digest: { sha256: '8e27c19...' } }],
                    predicateType: scenario.attestationSnippet.predicateType,
                    predicate: {
                      invocation: {
                        agentId: scenario.attestationSnippet.agentId,
                        model: scenario.model,
                      },
                      governanceVerdict: {
                        verdict: scenario.verdict,
                        blastRadiusScore: scenario.score,
                        policyPackChecksum: scenario.attestationSnippet.policyChecksum,
                      },
                    },
                    signature: {
                      keyId: 'readylayer-corp-attest-01',
                      algorithm: scenario.attestationSnippet.signatureAlgorithm,
                      sig: '9d214f8a9e01...',
                    },
                  },
                  null,
                  2
                )}
              </pre>
            )}
          </div>
        </div>

        {/* Right Column: Deterministic Governance Assessment */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border/30 bg-surface-subtle/30 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-medium text-text-muted">Decision Engine</span>
                <Badge
                  variant={
                    scenario.verdict === 'BLOCKED'
                      ? 'destructive'
                      : scenario.verdict === 'NEEDS_DUAL_CUSTODY'
                      ? 'warning'
                      : 'success'
                  }
                  className="font-mono text-xs uppercase"
                >
                  {scenario.verdict.replace(/_/g, ' ')}
                </Badge>
              </div>
              <CardTitle className="text-base font-display mt-1">
                Risk Score: {scenario.score} / 100
              </CardTitle>
              <CardDescription className="text-xs font-mono">
                Boundary: {scenario.riskTier}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-xs">
              <div className="p-3 rounded-lg bg-surface/70 border border-border/20 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-text-primary">
                  {scenario.verdict === 'BLOCKED' && <ShieldAlert className="h-4 w-4 text-rose-500" />}
                  {scenario.verdict === 'NEEDS_DUAL_CUSTODY' && <Lock className="h-4 w-4 text-amber-500" />}
                  {scenario.verdict === 'PASSED' && <ShieldCheck className="h-4 w-4 text-emerald-500" />}
                  <span>ReadyLayer Analysis</span>
                </div>
                <p className="text-text-muted leading-relaxed">{scenario.explanation}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded bg-surface/40 border border-border/20">
                  <span className="text-text-subtle block">Agent Caller</span>
                  <span className="font-semibold text-text-primary">{scenario.agent}</span>
                </div>
                <div className="p-2 rounded bg-surface/40 border border-border/20">
                  <span className="text-text-subtle block">SLSA Evidence</span>
                  <span className="font-semibold text-emerald-400">Minted & Signed</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
