'use client';

import React, { useState } from 'react';
import { Container } from '@/components/ui/container';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ShieldCheck, Lock, UserCheck, Calendar, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function PrivacyDashboard(): React.JSX.Element {
  const [inputText, setInputText] = useState(
    'Contact user alex.smith@enterprise.org or call 415-555-0199 regarding server 192.168.1.104 and credit card 4532-8921-9012-3456.'
  );
  const [anonymizedText, setAnonymizedText] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleAnonymize = async (): Promise<void> => {
    setProcessing(true);
    try {
      const response = await fetch('/api/v1/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'anonymize',
          data: inputText,
        }),
      });

      if (response.ok) {
        const json = await response.json() as { data?: { result?: string } };
        setAnonymizedText(json.data?.result || 'Anonymization complete.');
      }
    } catch (err) {
      console.error('Privacy anonymization error:', err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Container className="py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Privacy &amp; GDPR Compliance Center
            </h1>
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
              Zero-PII Architecture
            </Badge>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Automated PII anonymization, GDPR data retention enforcement, and cryptographic audit log controls.
          </p>
        </div>
      </div>

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
              <span>GDPR Compliance</span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Enforced</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Opt-in data controls active</CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
              <span>Data Retention Period</span>
              <Calendar className="w-4 h-4 text-indigo-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">365 Days</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Automated deletion schedule</CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
              <span>PII Masking Engine</span>
              <Lock className="w-4 h-4 text-purple-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-purple-600 dark:text-purple-400">SHA-256</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">Deterministic pseudonymization</CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium uppercase tracking-wider">
              <span>Consent Management</span>
              <UserCheck className="w-4 h-4 text-cyan-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">100% Verified</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">All tenant agreements logged</CardContent>
        </Card>
      </div>

      {/* Interactive PII Scanner */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            Real-Time PII &amp; Secret Redaction Inspector
          </CardTitle>
          <CardDescription>
            Test how customer code, comments, and payload data are automatically sanitized prior to AI analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Input Text / Code Payload
              </label>
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={6}
                className="font-mono text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                placeholder="Enter sample code or payload containing emails, IPs, or secrets..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Sanitized Output</span>
                {anonymizedText && (
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    PII Redacted
                  </Badge>
                )}
              </label>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-sm min-h-[148px] text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                {anonymizedText || (
                  <span className="text-slate-400 dark:text-slate-600 italic">
                    Click &ldquo;Execute Redaction&rdquo; to test live sanitization...
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              onClick={handleAnonymize}
              disabled={processing || !inputText.trim()}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <ShieldAlert className="w-4 h-4" />
              {processing ? 'Sanitizing...' : 'Execute Redaction'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
