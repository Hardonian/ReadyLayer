'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Database,
  GitBranch,
  Shield,
  CheckCircle,
  ChevronRight,
  Zap,
  AlertCircle
} from 'lucide-react';

export function ConfigWizard(): React.JSX.Element {
  const [step, setStep] = React.useState(1);
  const [config, setConfig] = React.useState({
    database: 'sqlite',
    github: false,
    policies: true,
    notifications: false
  });
  const [isCompleting, setIsCompleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const steps = [
    { id: 1, title: 'Database', icon: Database, description: 'Choose your data store' },
    { id: 2, title: 'Git Integration', icon: GitBranch, description: 'Connect repositories' },
    { id: 3, title: 'Governance Rules', icon: Settings, description: 'Configure policies' },
    { id: 4, title: 'Security', icon: Shield, description: 'Setup access control' }
  ];

  const nextStep = () => setStep(Math.min(step + 1, steps.length));
  const prevStep = () => setStep(Math.max(step - 1, 1));

  const completeSetup = async () => {
    setIsCompleting(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/setup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Setup failed' } })) as { error?: { message?: string } };
        throw new Error(errorData.error?.message || `Setup failed with status ${response.status}`);
      }

      // Success - redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during setup';
      setError(errorMessage);
      console.error('Setup failed:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  config.database === 'sqlite' ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
                onClick={() => setConfig({ ...config, database: 'sqlite' })}
              >
                <CardContent className="p-4 text-center">
                  <Database className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-display font-semibold">SQLite</h3>
                  <p className="text-sm font-body text-text-muted">Local development, zero config</p>
                  <Badge variant="secondary" className="mt-2">Recommended</Badge>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  config.database === 'postgresql' ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
                onClick={() => setConfig({ ...config, database: 'postgresql' })}
              >
                <CardContent className="p-4 text-center">
                  <Database className="h-8 w-8 mx-auto mb-2 text-text-muted" />
                  <h3 className="font-display font-semibold">PostgreSQL</h3>
                  <p className="text-sm font-body text-text-muted">Production deployments</p>
                </CardContent>
              </Card>
            </div>

            <div className="bg-surface-muted rounded-lg p-4">
              <h4 className="font-display font-medium mb-2">Current Selection</h4>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="font-mono text-sm">{config.database.toUpperCase()}</span>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Connect GitHub Repository
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-display font-medium">Repository URL</label>
                  <Input
                    placeholder="https://github.com/username/repo"
                    className="font-mono"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="auto-sync"
                    className="rounded"
                    checked={config.github}
                    onChange={(e) => setConfig({ ...config, github: e.target.checked })}
                  />
                  <label htmlFor="auto-sync" className="text-sm font-body">
                    Enable automatic sync
                  </label>
                </div>
              </CardContent>
            </Card>

            <div className="bg-surface-muted rounded-lg p-4">
              <h4 className="font-display font-medium mb-2">Quick Setup Options</h4>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open('/api/v1/github/oauth/start')}
                >
                  <GitBranch className="h-4 w-4 mr-2" />
                  Connect GitHub Account
                </Button>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Governance Rules Engine
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-display font-medium">
                    Default Policy Template
                  </label>
                  <select className="w-full p-2 rounded-lg border border-border bg-surface font-mono">
                    <option value="security">Security First</option>
                    <option value="performance">Performance Optimized</option>
                    <option value="compliance">Compliance Focused</option>
                    <option value="custom">Custom Rules</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-display font-medium">
                    Rule Severity Level
                  </label>
                  <select className="w-full p-2 rounded-lg border border-border bg-surface font-mono">
                    <option value="strict">Strict - Block on warnings</option>
                    <option value="moderate">Moderate - Warn only</option>
                    <option value="lenient">Lenient - Info only</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="load-samples"
                    className="rounded"
                    checked={config.policies}
                    onChange={(e) => setConfig({ ...config, policies: e.target.checked })}
                  />
                  <label htmlFor="load-samples" className="text-sm font-body">
                    Load sample governance policies
                  </label>
                </div>
              </CardContent>
            </Card>

            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <h4 className="font-display font-medium mb-2">Preview</h4>
              <div className="space-y-2 text-sm font-mono">
                <div>✓ Code review enforced</div>
                <div>✓ Security scanning enabled</div>
                <div>✓ Test coverage required</div>
                <div>✓ Documentation sync active</div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-display font-medium">
                      Authentication Mode
                    </label>
                    <select className="w-full p-2 rounded-lg border border-border bg-surface font-mono">
                      <option value="jwt">JWT Tokens</option>
                      <option value="oauth">OAuth 2.0</option>
                      <option value="sso">SSO Integration</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-display font-medium">
                      Session Duration
                    </label>
                    <select className="w-full p-2 rounded-lg border border-border bg-surface font-mono">
                      <option value="1h">1 Hour</option>
                      <option value="24h">24 Hours</option>
                      <option value="7d">7 Days</option>
                      <option value="30d">30 Days</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="notifications"
                    className="rounded"
                    checked={config.notifications}
                    onChange={(e) => setConfig({ ...config, notifications: e.target.checked })}
                  />
                  <label htmlFor="notifications" className="text-sm font-body">
                    Enable security notifications
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="audit-logging"
                    className="rounded"
                    defaultChecked={true}
                  />
                  <label htmlFor="audit-logging" className="text-sm font-body">
                    Enable comprehensive audit logging
                  </label>
                </div>
              </CardContent>
            </Card>

            <div className="bg-surface-muted rounded-lg p-4">
              <h4 className="font-display font-medium mb-2">Security Summary</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm font-body">JWT-based authentication configured</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm font-body">Audit logging enabled</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm font-body">Rate limiting active</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="max-w-2xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-display font-bold">ReadyLayer Setup</h1>
            <Badge variant="outline">
              Step {step} of {steps.length}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {steps.map((s, _index) => (
              <div
                key={s.id}
                className={`flex-1 h-1 rounded ${
                  s.id <= step ? 'bg-primary' : 'bg-border'
                }`}
              />
            ))}
          </div>

          <div className="flex justify-between mt-4">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={step === 1}
              className="font-mono"
            >
              Previous
            </Button>

            <div className="flex items-center gap-2">
              {steps.map((s) => (
                <div
                  key={s.id}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono transition-colors ${
                    s.id === step
                      ? 'bg-primary text-primary-foreground'
                      : s.id < step
                        ? 'bg-success text-white'
                        : 'bg-border text-text-muted'
                  }`}
                >
                  {s.id}
                </div>
              ))}
            </div>

            {step < steps.length ? (
              <Button onClick={nextStep} className="font-mono" disabled={isCompleting}>
                Next Step
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={completeSetup} className="font-mono" disabled={isCompleting}>
                <Zap className="h-4 w-4 mr-2" />
                {isCompleting ? 'Completing...' : 'Complete Setup'}
              </Button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <h3 className="font-display font-semibold text-destructive mb-1">Setup Failed</h3>
                <p className="text-sm text-destructive/90">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setError(null)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            {React.createElement(steps[step - 1].icon, {
              className: "h-6 w-6 text-primary"
            })}
            <div>
              <h2 className="text-xl font-display font-semibold">
                {steps[step - 1].title}
              </h2>
              <p className="text-text-muted font-body">
                {steps[step - 1].description}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Step Content */}
        {renderStepContent()}
      </div>
    </div>
  );
}