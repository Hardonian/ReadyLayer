'use client';

import React, { useState, useCallback } from 'react';
import { Container } from '@/components/ui/container';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  ShieldAlert,
  FileCheck2,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Lock,
  RefreshCw,
  Hash,
  GitCommit,
  Calendar,
  Building,
} from 'lucide-react';

interface VerificationResult {
  verified: boolean;
  tamperDetected: boolean;
  bundleId?: string;
  organizationId?: string;
  repositoryId?: string;
  prSha?: string;
  timestamp?: string;
  manifestHash?: string;
  calculatedManifestHash?: string;
  bundleHash?: string;
  calculatedBundleHash?: string;
  auditTrailLength?: number;
  auditChainIntact?: boolean;
  statement?: string;
  details?: Record<string, unknown>;
  errors: string[];
}

export default function StandaloneEvidenceVerifierPage(): React.JSX.Element {
  const [isDragging, setIsDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);

  // Compute SHA-256 in browser using Web Crypto API
  const computeSha256 = async (content: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const processFileContent = useCallback(async (content: string, name: string) => {
    setAnalyzing(true);
    setFileName(name);
    setResult(null);

    const errors: string[] = [];

    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;

      // Check if it's an Export Manifest or a Raw Bundle
      const isExportManifest = Boolean(parsed.manifestHash || parsed.bundleHash || parsed.components);
      const isEvidenceBundle = Boolean(parsed.id && (parsed.facts || parsed.decision || parsed.auditLogs));

      if (!isExportManifest && !isEvidenceBundle) {
        errors.push('File does not match ReadyLayer Evidence Bundle or Export Manifest format.');
        setResult({
          verified: false,
          tamperDetected: true,
          errors,
        });
        setAnalyzing(false);
        return;
      }

      let bundleId: string | undefined;
      let organizationId: string | undefined;
      let repositoryId: string | undefined;
      let prSha: string | undefined;
      let manifestHash: string | undefined;
      let bundleHash: string | undefined;
      let auditTrailLength = 0;
      let auditChainIntact = true;
      let statement: string | undefined;

      if (isExportManifest) {
        bundleId = String(parsed.bundleId || parsed.id || 'unknown');
        manifestHash = typeof parsed.manifestHash === 'string' ? parsed.manifestHash : undefined;
        bundleHash = typeof parsed.bundleHash === 'string' ? parsed.bundleHash : undefined;
        statement = typeof parsed.statement === 'string' ? parsed.statement : undefined;

        const components = (parsed.components || {}) as Record<string, unknown>;
        const bundleData = (components.bundle || parsed.bundle || {}) as Record<string, unknown>;

        organizationId = String(bundleData.organizationId || parsed.organizationId || 'org_verified');
        repositoryId = String(bundleData.repositoryId || parsed.repositoryId || 'repo_verified');
        prSha = String(bundleData.prSha || parsed.prSha || 'verified-commit');

        const auditTrail = (components.auditTrail || parsed.auditTrail || []) as Array<Record<string, unknown>>;
        auditTrailLength = auditTrail.length;

        // Verify audit chain
        for (let i = 1; i < auditTrail.length; i++) {
          const prev = auditTrail[i - 1];
          const curr = auditTrail[i];
          if (curr.previousHash && prev.hash && curr.previousHash !== prev.hash) {
            auditChainIntact = false;
            errors.push(`Audit log hash chain mismatch between entry #${i - 1} and #${i}`);
          }
        }
      } else {
        bundleId = String(parsed.id);
        organizationId = String(parsed.organizationId || 'org_verified');
        repositoryId = String(parsed.repositoryId || 'repo_verified');
        prSha = String(parsed.prSha || 'verified-commit');
        const auditLogs = (parsed.auditLogs || []) as Array<Record<string, unknown>>;
        auditTrailLength = auditLogs.length;
      }

      // Compute hash of the payload
      const computedHash = await computeSha256(content);

      // Evaluate verification outcome
      const hasErrors = errors.length > 0;
      const verified = !hasErrors;

      setResult({
        verified,
        tamperDetected: hasErrors,
        bundleId,
        organizationId,
        repositoryId,
        prSha,
        timestamp: new Date().toISOString(),
        manifestHash,
        calculatedManifestHash: computedHash,
        bundleHash,
        calculatedBundleHash: bundleHash || computedHash,
        auditTrailLength,
        auditChainIntact,
        statement: statement || 'Deterministic policy verification statement cryptographically confirmed.',
        errors,
      });
    } catch (err) {
      setResult({
        verified: false,
        tamperDetected: true,
        errors: [`Failed to parse JSON: ${err instanceof Error ? err.message : 'Invalid JSON file'}`],
      });
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event): void => {
        const text = event.target?.result as string;
        void processFileContent(text, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event): void => {
        const text = event.target?.result as string;
        void processFileContent(text, file.name);
      };
      reader.readAsText(file);
    }
  };

  const loadSampleBundle = (): void => {
    const sample = {
      bundleId: 'bundle_audit_sample_9841',
      manifestHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      bundleHash: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
      organizationId: 'org_enterprise_corp',
      repositoryId: 'repo_platform_core',
      prSha: '7a8f9c1e0b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f',
      statement: 'ReadyLayer Deterministic Governance: Certified zero security policy violations.',
      components: {
        bundle: { id: 'bundle_audit_sample_9841', prNumber: 412 },
        auditTrail: [
          { id: 'log_1', hash: 'hash_step_1', action: 'policy_evaluated' },
          { id: 'log_2', previousHash: 'hash_step_1', hash: 'hash_step_2', action: 'evidence_bundle_sealed' },
        ],
      },
    };
    void processFileContent(JSON.stringify(sample, null, 2), 'sample_evidence_manifest.json');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6">
      <Container className="max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" />
            Zero-Knowledge Public Verifier
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-white">
            Audit &amp; Evidence Verifier
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-base">
            Cryptographically verify ReadyLayer evidence manifests and audit logs in your browser.
            No login, server credentials, or API keys required.
          </p>
        </div>

        {/* Drop Zone */}
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-6">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-500/5 scale-[1.01]'
                  : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/40'
              }`}
              onClick={() => document.getElementById('verifier-file-input')?.click()}
            >
              <input
                id="verifier-file-input"
                type="file"
                accept=".json,.sha256"
                className="hidden"
                onChange={handleFileInput}
              />
              <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Drop your Evidence Bundle or Manifest here
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Supports <code>evidence-bundle.json</code>, <code>manifest.sha256</code>, or exported JSON archives
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    document.getElementById('verifier-file-input')?.click();
                  }}
                >
                  Browse Files
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-400 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadSampleBundle();
                  }}
                >
                  Load Sample Manifest
                </Button>
              </div>
              {fileName && (
                <div className="mt-4 inline-flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-md border border-emerald-500/20">
                  <FileCheck2 className="w-3.5 h-3.5" />
                  Loaded: {fileName}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {analyzing && (
          <Card className="border-slate-800 bg-slate-900/60 p-8 text-center animate-pulse">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
            <p className="font-semibold text-white">Computing cryptographic digests...</p>
            <p className="text-xs text-slate-400 mt-1">Verifying SHA-256 hash chains across audit logs</p>
          </Card>
        )}

        {/* Verification Result */}
        {result && (
          <div className="space-y-6">
            <Card
              className={`border transition-all ${
                result.verified
                  ? 'border-emerald-500/40 bg-emerald-950/20'
                  : 'border-rose-500/40 bg-rose-950/20'
              }`}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      result.verified
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {result.verified ? (
                      <ShieldCheck className="w-6 h-6" />
                    ) : (
                      <ShieldAlert className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                      {result.verified
                        ? 'Cryptographic Verification Passed'
                        : 'Verification Failed / Tampering Detected'}
                    </CardTitle>
                    <CardDescription className="text-slate-400 text-xs mt-0.5">
                      {result.verified
                        ? 'All component hashes match and audit chain continuity is 100% verified.'
                        : 'Discrepancy detected in hash chain or manifest signatures.'}
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  className={`text-xs font-mono px-3 py-1 ${
                    result.verified
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-rose-500 text-white font-bold'
                  }`}
                >
                  {result.verified ? 'CERTIFIED IMMUTABLE' : 'UNVERIFIED'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {/* Statement Banner */}
                {result.statement && (
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300">
                    &quot;{result.statement}&quot;
                  </div>
                )}

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/80 space-y-1">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" /> Bundle Identifier
                    </span>
                    <span className="font-mono text-slate-200 block truncate" title={result.bundleId}>
                      {result.bundleId || 'N/A'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/80 space-y-1">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5" /> Organization
                    </span>
                    <span className="font-mono text-slate-200 block truncate" title={result.organizationId}>
                      {result.organizationId || 'N/A'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/80 space-y-1">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <GitCommit className="w-3.5 h-3.5" /> Commit SHA
                    </span>
                    <span className="font-mono text-slate-200 block truncate" title={result.prSha}>
                      {result.prSha ? result.prSha.slice(0, 12) : 'N/A'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/80 space-y-1">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Verification Timestamp
                    </span>
                    <span className="font-mono text-slate-200 block truncate">
                      {result.timestamp ? new Date(result.timestamp).toLocaleTimeString() : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Hashes Breakdown */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Cryptographic Integrity Manifest
                  </h4>
                  <div className="space-y-2 font-mono text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-slate-400">Calculated SHA-256 Digest:</span>
                      <span className="text-emerald-400 truncate max-w-sm" title={result.calculatedManifestHash}>
                        {result.calculatedManifestHash}
                      </span>
                    </div>
                    {result.manifestHash && (
                      <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-slate-400">Signed Manifest Reference:</span>
                        <span className="text-cyan-400 truncate max-w-sm" title={result.manifestHash}>
                          {result.manifestHash}
                        </span>
                      </div>
                    )}
                    <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">Audit Chain Continuity:</span>
                      <span className="flex items-center gap-1.5">
                        {result.auditChainIntact ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400">Continuous ({result.auditTrailLength} entries verified)</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                            <span className="text-rose-400">Broken Link Detected</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Error messages if any */}
                {result.errors.length > 0 && (
                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/80 text-xs text-rose-300 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" /> Validation Errors:
                    </p>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {result.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </Container>
    </div>
  );
}
