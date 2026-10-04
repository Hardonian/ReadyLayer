'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ShieldCheck,
  Search,
  Sparkles,
  FileCheck2,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Cpu,
  Zap,
  BookOpen,
} from 'lucide-react'

interface PolicyPackTemplate {
  id: string
  name: string
  version: string
  category: 'security' | 'compliance' | 'ai' | 'quality'
  description: string
  author: string
  isCertified: boolean
  downloads: string
  ruleCount: number
  rules: string[]
  sampleYaml: string
}

const MARKETPLACE_POLICIES: PolicyPackTemplate[] = [
  {
    id: 'soc2-type-2',
    name: 'SOC 2 Type II Enterprise Guard',
    version: '2.1.0',
    category: 'compliance',
    description: 'Checks for unencrypted secrets, missing audit triggers, and untracked code modifications that can contribute evidence to a SOC 2 control program.',
    author: 'ReadyLayer Security Engineering',
    isCertified: true,
    downloads: '12.4k',
    ruleCount: 14,
    rules: [
      'security.secret-leak',
      'audit.tamper-evidence-manifest',
      'access.least-privilege-db',
      'crypto.tls-v1-3-enforcement',
      'compliance.dependency-cve-blocker',
    ],
    sampleYaml: `version: "2.1.0"
name: "SOC 2 Type II Enterprise Guard"
rules:
  - ruleId: "security.secret-leak"
    severityMapping: { critical: "block", high: "block" }
  - ruleId: "audit.tamper-evidence-manifest"
    severityMapping: { critical: "block", high: "block" }
  - ruleId: "access.least-privilege-db"
    severityMapping: { high: "block", medium: "warn" }
  - ruleId: "crypto.tls-v1-3-enforcement"
    severityMapping: { critical: "block", high: "block" }
`,
  },
  {
    id: 'owasp-top-10-llm',
    name: 'OWASP Top 10 Web & LLM Defense',
    version: '1.4.0',
    category: 'security',
    description: 'Guards against LLM prompt injections, SQL injections, insecure output handling, broken access controls, and phantom library dependencies.',
    author: 'OWASP AI Foundation',
    isCertified: true,
    downloads: '18.9k',
    ruleCount: 16,
    rules: [
      'security.sql-injection',
      'security.ssrf-detector',
      'ai.hallucinated-imports',
      'security.prompt-injection-filter',
      'security.unparameterized-queries',
    ],
    sampleYaml: `version: "1.4.0"
name: "OWASP Top 10 Web & LLM Defense"
rules:
  - ruleId: "security.sql-injection"
    severityMapping: { critical: "block", high: "block" }
  - ruleId: "ai.hallucinated-imports"
    severityMapping: { critical: "block", high: "block" }
  - ruleId: "security.ssrf-detector"
    severityMapping: { critical: "block", high: "warn" }
  - ruleId: "security.prompt-injection-filter"
    severityMapping: { critical: "block", high: "block" }
`,
  },
  {
    id: 'eu-ai-act-governance',
    name: 'EU AI Act High-Risk Governance',
    version: '1.2.0',
    category: 'ai',
    description: 'Mandatory risk management, transparency logs, and deterministic human-in-the-loop audit gates tailored to EU AI Act Title III compliance.',
    author: 'ReadyLayer Governance Labs',
    isCertified: true,
    downloads: '8.3k',
    ruleCount: 12,
    rules: [
      'ai.heuristic-detection',
      'provenance.synthetic-code-marker',
      'governance.human-in-the-loop-review',
      'audit.reproducible-build-hash',
    ],
    sampleYaml: `version: "1.2.0"
name: "EU AI Act High-Risk Governance"
rules:
  - ruleId: "ai.heuristic-detection"
    severityMapping: { critical: "block", high: "warn" }
  - ruleId: "provenance.synthetic-code-marker"
    severityMapping: { critical: "block", high: "block" }
  - ruleId: "governance.human-in-the-loop-review"
    severityMapping: { high: "block", medium: "warn" }
`,
  },
  {
    id: 'hipaa-ephi-privacy',
    name: 'HIPAA ePHI Data Protection & Privacy',
    version: '1.0.5',
    category: 'compliance',
    description: 'Strict PHI and PII detection, preventing patient health records and identifiable data from leaking into client-side bundles or unencrypted logs.',
    author: 'HealthTech Platform WG',
    isCertified: false,
    downloads: '5.1k',
    ruleCount: 10,
    rules: [
      'privacy.phi-pii-regex-scanner',
      'logging.unredacted-payload-blocker',
      'storage.encrypted-at-rest-assertion',
    ],
    sampleYaml: `version: "1.0.5"
name: "HIPAA ePHI Data Protection"
rules:
  - ruleId: "privacy.phi-pii-regex-scanner"
    severityMapping: { critical: "block", high: "block" }
  - ruleId: "logging.unredacted-payload-blocker"
    severityMapping: { critical: "block", high: "block" }
`,
  },
  {
    id: 'pci-dss-fintech',
    name: 'PCI-DSS v4.0 FinTech Security Bundle',
    version: '2.0.1',
    category: 'compliance',
    description: 'Cardholder data masking, immutable audit verification, cryptographic key rotation checks, and zero-trust perimeter enforcement.',
    author: 'FinTech Cloud Guild',
    isCertified: true,
    downloads: '9.7k',
    ruleCount: 15,
    rules: [
      'security.cardholder-data-masking',
      'crypto.key-rotation-verifier',
      'audit.tamper-evidence-manifest',
    ],
    sampleYaml: `version: "2.0.1"
name: "PCI-DSS v4.0 FinTech Security Bundle"
rules:
  - ruleId: "security.cardholder-data-masking"
    severityMapping: { critical: "block", high: "block" }
  - ruleId: "crypto.key-rotation-verifier"
    severityMapping: { high: "block", medium: "warn" }
`,
  },
  {
    id: 'lean-startup-speed',
    name: 'Lean Startup Rapid Shipping Guard',
    version: '1.1.2',
    category: 'quality',
    description: 'Optimized for high-velocity teams. Catches fatal crashes, N+1 Prisma query loops, and bundle bloat without slowing down PR merges.',
    author: 'ReadyLayer Community',
    isCertified: false,
    downloads: '14.2k',
    ruleCount: 8,
    rules: [
      'startup.scaling',
      'quality.unhandled-rejection',
      'quality.circular-import-detector',
    ],
    sampleYaml: `version: "1.1.2"
name: "Lean Startup Rapid Shipping Guard"
rules:
  - ruleId: "startup.scaling"
    severityMapping: { critical: "block", high: "warn" }
  - ruleId: "quality.unhandled-rejection"
    severityMapping: { high: "block", medium: "warn" }
`,
  },
]

export default function MarketplacePoliciesPage(): React.JSX.Element {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [activePreviewPack, setActivePreviewPack] = useState<PolicyPackTemplate | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filteredPacks = MARKETPLACE_POLICIES.filter((pack) => {
    const matchesCategory = selectedCategory === 'all' || pack.category === selectedCategory
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      pack.name.toLowerCase().includes(q) ||
      pack.description.toLowerCase().includes(q) ||
      pack.rules.some((r) => r.toLowerCase().includes(q))
    return matchesCategory && matchesSearch
  })

  const copyYaml = (pack: PolicyPackTemplate): void => {
    navigator.clipboard.writeText(pack.sampleYaml)
    setCopiedId(pack.id)
    setTimeout(() => {
      setCopiedId(null)
    }, 2000)
  }

  return (
    <main className="min-h-screen py-12 lg:py-24 bg-background">
      <Container size="lg" className="space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge variant="outline" className="gap-1.5 py-1 px-3 border-primary/30 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Verified Policy Catalog
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Community Policy Marketplace
          </h1>
          <p className="text-muted-foreground text-lg">
            Browse, inspect, and install industry-standard governance packs. From SOC2 and HIPAA to the EU AI Act, enforce compliance deterministically in your CI/CD pipelines.
          </p>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl border bg-card shadow-sm">
          {/* Categories */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            {[
              { id: 'all', label: 'All Packs' },
              { id: 'security', label: 'Security & OWASP' },
              { id: 'compliance', label: 'SOC2 & HIPAA' },
              { id: 'ai', label: 'EU AI Act & LLMs' },
              { id: 'quality', label: 'Code Quality' },
            ].map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className="text-xs"
              >
                {cat.label}
              </Button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search rules or packs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
        </div>

        {/* Policy Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPacks.map((pack) => {
            const isCopied = copiedId === pack.id

            return (
              <Card key={pack.id} className="flex flex-col justify-between hover:border-primary/50 transition-colors">
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {pack.category === 'security' && <Lock className="h-4 w-4 text-rose-500" />}
                      {pack.category === 'compliance' && <ShieldCheck className="h-4 w-4 text-blue-500" />}
                      {pack.category === 'ai' && <Cpu className="h-4 w-4 text-purple-500" />}
                      {pack.category === 'quality' && <Zap className="h-4 w-4 text-amber-500" />}
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {pack.category}
                      </span>
                    </div>

                    {pack.isCertified && (
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 gap-1 text-[10px]">
                        <Check className="h-3 w-3" /> Certified
                      </Badge>
                    )}
                  </div>

                  <CardTitle className="text-xl leading-tight">
                    {pack.name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    by {pack.author} • v{pack.version}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 text-sm">
                  <p className="text-muted-foreground line-clamp-3">
                    {pack.description}
                  </p>

                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-foreground flex items-center justify-between">
                      <span>Included Rules ({pack.ruleCount})</span>
                      <span className="text-muted-foreground">{pack.downloads} installs</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {pack.rules.slice(0, 3).map((rule) => (
                        <code key={rule} className="text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {rule}
                        </code>
                      ))}
                      {pack.rules.length > 3 && (
                        <span className="text-[11px] text-muted-foreground px-1 py-0.5">
                          +{pack.rules.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-2 border-t gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs gap-1.5"
                    onClick={() => setActivePreviewPack(pack)}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Inspect YAML
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => copyYaml(pack)}
                  >
                    {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {isCopied ? 'Copied' : 'Copy'}
                  </Button>

                  <Button asChild size="sm" className="text-xs">
                    <Link href={`/dashboard/policies/new?template=${pack.id}`}>
                      Install
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>

        {filteredPacks.length === 0 && (
          <div className="text-center py-16 space-y-3 border rounded-xl bg-card">
            <FileCheck2 className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="font-semibold text-lg">No policies match your search</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Try adjusting your search query or selecting a different policy category.
            </p>
            <Button variant="outline" size="sm" onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}>
              Reset Filters
            </Button>
          </div>
        )}

        {/* Modal / Inspector Drawer for Policy YAML */}
        {activePreviewPack && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl bg-card border rounded-xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">{activePreviewPack.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Version {activePreviewPack.version} • {activePreviewPack.ruleCount} Rules configured
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActivePreviewPack(null)}
                  className="h-8 w-8 p-0 rounded-full"
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Policy Pack Definition (YAML)</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => copyYaml(activePreviewPack)}
                  >
                    {copiedId === activePreviewPack.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    {copiedId === activePreviewPack.id ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <pre className="p-4 rounded-lg bg-muted text-xs font-mono overflow-x-auto max-h-72 border">
                  {activePreviewPack.sampleYaml}
                </pre>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setActivePreviewPack(null)}>
                  Close
                </Button>
                <Button asChild size="sm" className="gap-1.5">
                  <Link href={`/dashboard/policies/new?template=${activePreviewPack.id}`}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    Install into Organization
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </Container>
    </main>
  )
}
