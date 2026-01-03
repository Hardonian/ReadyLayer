'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { AlertTriangle, ExternalLink, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export interface FailureExplanation {
  code: string
  title: string
  description: string
  fixes: Array<{
    step: string
    action: string
    link?: string
  }>
}

interface FailureExplainerProps {
  failure: {
    code?: string
    message?: string
    stage?: 'review_guard' | 'test_engine' | 'doc_sync'
  }
  explanations?: FailureExplanation[]
}

const commonFailures: FailureExplanation[] = [
  {
    code: 'MISSING_PERMISSIONS',
    title: 'Missing Git Provider Permissions',
    description: 'ReadyLayer needs access to your repository to post status checks.',
    fixes: [
      {
        step: '1',
        action: 'Go to your Git provider settings',
        link: '/dashboard/repos/connect',
      },
      {
        step: '2',
        action: 'Re-authorize ReadyLayer with required permissions',
      },
      {
        step: '3',
        action: 'Ensure "Checks" and "Statuses" permissions are granted',
      },
    ],
  },
  {
    code: 'PROVIDER_DISCONNECTED',
    title: 'Git Provider Disconnected',
    description: 'Your Git provider integration has been disconnected or expired.',
    fixes: [
      {
        step: '1',
        action: 'Check your installation status',
        link: '/dashboard/repos',
      },
      {
        step: '2',
        action: 'Reconnect your Git provider',
        link: '/dashboard/repos/connect',
      },
      {
        step: '3',
        action: 'Verify the connection is active',
      },
    ],
  },
  {
    code: 'TEST_COMMAND_FAILED',
    title: 'Test Execution Failed',
    description: 'The test command in your repository failed to execute.',
    fixes: [
      {
        step: '1',
        action: 'Check your test configuration in .readylayer.yml',
      },
      {
        step: '2',
        action: 'Verify tests run successfully locally',
      },
      {
        step: '3',
        action: 'Check test logs for specific errors',
      },
    ],
  },
  {
    code: 'REVIEW_GUARD_FAILED',
    title: 'Review Guard Stage Failed',
    description: 'The Review Guard stage encountered an error during execution.',
    fixes: [
      {
        step: '1',
        action: 'Check the run details for specific error messages',
      },
      {
        step: '2',
        action: 'Verify your code files are accessible',
      },
      {
        step: '3',
        action: 'Try running again - this may be a transient error',
      },
    ],
  },
  {
    code: 'DOC_SYNC_DRIFT',
    title: 'Documentation Drift Detected',
    description: 'Your API documentation is out of sync with your code.',
    fixes: [
      {
        step: '1',
        action: 'Review the drift details in the run output',
      },
      {
        step: '2',
        action: 'Update your OpenAPI spec or documentation',
      },
      {
        step: '3',
        action: 'Re-run the pipeline to verify sync',
      },
    ],
  },
]

export function FailureExplainer({ failure, explanations = commonFailures }: FailureExplainerProps) {
  // Find matching explanation
  const explanation = explanations.find(e => e.code === failure.code) || 
    (failure.stage === 'review_guard' ? explanations.find(e => e.code === 'REVIEW_GUARD_FAILED') :
     failure.stage === 'test_engine' ? explanations.find(e => e.code === 'TEST_COMMAND_FAILED') :
     failure.stage === 'doc_sync' ? explanations.find(e => e.code === 'DOC_SYNC_DRIFT') :
     null);

  if (!explanation) {
    // Generic failure explanation
    return (
      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <CardTitle>What Happened?</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {failure.message || 'The run encountered an error. Check the run details for more information.'}
          </p>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium">Check run details:</span> Review the full error message and stage outputs
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium">Try again:</span> Many errors are transient and resolve on retry
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium">Contact support:</span> If the issue persists,{' '}
                <a href="mailto:support@readylayer.dev" className="text-primary hover:underline">
                  reach out for help
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-yellow-500/20 bg-yellow-500/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <CardTitle>{explanation.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {explanation.description}
        </p>
        <div className="space-y-3">
          <div className="font-medium text-sm">How to fix:</div>
          {explanation.fixes.map((fix) => (
            <div key={fix.step} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                {fix.step}
              </div>
              <div className="flex-1">
                {fix.link ? (
                  <Link
                    href={fix.link}
                    className="text-sm hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {fix.action}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <div className="text-sm">{fix.action}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
