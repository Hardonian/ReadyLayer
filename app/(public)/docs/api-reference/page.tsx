'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function APIReferencePage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">API Reference</h1>
          <p className="mt-2 text-lg text-slate-600">
            Complete REST API documentation for ReadyLayer. Programmatically submit code reviews and manage your workspace.
          </p>
        </div>

        {/* Quick Navigation */}
        <div className="mb-8 flex gap-4 border-b border-slate-200">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'authentication', label: 'Authentication' },
            { id: 'reviews', label: 'Reviews' },
            { id: 'errors', label: 'Errors' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium transition ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left: Documentation */}
          <div className="lg:col-span-2">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">Getting Started</h2>
                  <div className="rounded-lg bg-white p-6 border border-slate-200">
                    <p className="text-slate-600">
                      The ReadyLayer API allows you to programmatically submit code reviews, retrieve results, and manage your organization settings.
                    </p>
                    <p className="mt-4 text-slate-600">
                      <strong>Base URL:</strong> <code className="bg-slate-100 px-2 py-1 rounded">https://api.ready-layer.com/v1</code>
                    </p>
                    <p className="mt-2 text-slate-600">
                      <strong>Authentication:</strong> Bearer token via Authorization header
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">Quick Example</h2>
                  <div className="rounded-lg bg-slate-900 p-6 text-slate-100 overflow-x-auto">
                    <pre><code>{`curl -X POST https://api.ready-layer.com/v1/reviews \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "repositoryId": "github_123",
    "prNumber": 42,
    "prSha": "abc123def456",
    "files": [
      {
        "path": "src/app.ts",
        "content": "const x = 1;"
      }
    ]
  }'`}</code></pre>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'authentication' && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">Authentication</h2>
                  <div className="rounded-lg bg-white p-6 border border-slate-200 space-y-4">
                    <div>
                      <h3 className="font-semibold text-slate-900">Bearer Token</h3>
                      <p className="mt-2 text-slate-600">
                        Include your API token in the Authorization header:
                      </p>
                      <code className="block mt-2 bg-slate-100 p-3 rounded text-sm">
                        Authorization: Bearer sk_live_1234567890abcdef
                      </code>
                    </div>

                    <div className="pt-4 border-t">
                      <h3 className="font-semibold text-slate-900">Getting Your Token</h3>
                      <p className="mt-2 text-slate-600">
                        Visit your <Link href="/dashboard/settings" className="text-blue-600 hover:underline">account settings</Link> to generate an API token.
                      </p>
                    </div>

                    <div className="pt-4 border-t">
                      <h3 className="font-semibold text-slate-900">Rate Limiting</h3>
                      <p className="mt-2 text-slate-600">
                        API requests are rate-limited to 100 requests per minute per token. Rate limit information is included in response headers:
                      </p>
                      <code className="block mt-2 bg-slate-100 p-3 rounded text-sm">
                        X-RateLimit-Limit: 100
                        <br />
                        X-RateLimit-Remaining: 75
                        <br />
                        X-RateLimit-Reset: 1234567890
                      </code>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">Reviews API</h2>

                  <div className="space-y-6">
                    {/* POST /reviews */}
                    <div className="rounded-lg bg-white p-6 border border-slate-200">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded text-sm font-semibold">
                          POST
                        </span>
                        <code className="text-slate-600">/reviews</code>
                      </div>

                      <p className="text-slate-600 mb-4">
                        Submit a code for review. Returns a review ID immediately; analysis happens asynchronously.
                      </p>

                      <div className="mb-4">
                        <h4 className="font-semibold text-slate-900 mb-2">Request Body</h4>
                        <div className="bg-slate-50 p-3 rounded text-sm overflow-x-auto">
                          <pre>{`{
  "repositoryId": "string", // Required: Provider-specific ID
  "prNumber": number,        // Required: Pull request number
  "prSha": "string",         // Required: Commit SHA
  "prTitle": "string",       // Optional: PR title
  "files": [                 // Required: Code files
    {
      "path": "string",
      "content": "string",
      "beforeContent": "string" // Optional: for diffs
    }
  ]
}`}</pre>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-semibold text-slate-900 mb-2">Response</h4>
                        <div className="bg-slate-50 p-3 rounded text-sm overflow-x-auto">
                          <pre>{`{
  "id": "review_abc123",
  "status": "pending",
  "createdAt": "2024-01-15T12:00:00Z",
  "estimatedCompletionTime": "2024-01-15T12:05:00Z"
}`}</pre>
                        </div>
                      </div>
                    </div>

                    {/* GET /reviews/:id */}
                    <div className="rounded-lg bg-white p-6 border border-slate-200">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm font-semibold">
                          GET
                        </span>
                        <code className="text-slate-600">/reviews/:id</code>
                      </div>

                      <p className="text-slate-600 mb-4">
                        Get review results including all findings.
                      </p>

                      <div className="mb-4">
                        <h4 className="font-semibold text-slate-900 mb-2">Response</h4>
                        <div className="bg-slate-50 p-3 rounded text-sm overflow-x-auto">
                          <pre>{`{
  "id": "review_abc123",
  "status": "completed",
  "summary": {
    "total": 5,
    "critical": 1,
    "high": 2,
    "medium": 2,
    "low": 0
  },
  "findings": [
    {
      "id": "finding_123",
      "ruleId": "security.sql-injection",
      "severity": "critical",
      "file": "src/api.ts",
      "line": 45,
      "message": "Potential SQL injection",
      "remediation": "Use parameterized queries"
    }
  ],
  "isBlocked": true,
  "blockedReason": "Critical security issues found"
}`}</pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'errors' && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">Error Handling</h2>

                  <div className="rounded-lg bg-white p-6 border border-slate-200 space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block bg-red-100 text-red-800 px-3 py-1 rounded text-sm font-semibold">
                          400
                        </span>
                        <span className="font-semibold text-slate-900">Bad Request</span>
                      </div>
                      <p className="text-slate-600">Invalid request parameters or malformed JSON.</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block bg-red-100 text-red-800 px-3 py-1 rounded text-sm font-semibold">
                          401
                        </span>
                        <span className="font-semibold text-slate-900">Unauthorized</span>
                      </div>
                      <p className="text-slate-600">Missing or invalid authentication token.</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-sm font-semibold">
                          429
                        </span>
                        <span className="font-semibold text-slate-900">Rate Limited</span>
                      </div>
                      <p className="text-slate-600">Rate limit exceeded. Retry after X seconds.</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block bg-red-100 text-red-800 px-3 py-1 rounded text-sm font-semibold">
                          500
                        </span>
                        <span className="font-semibold text-slate-900">Server Error</span>
                      </div>
                      <p className="text-slate-600">Internal server error. Retry with exponential backoff.</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-lg bg-blue-50 p-4 border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-2">Error Response Format</h3>
                    <div className="bg-white p-3 rounded text-sm overflow-x-auto">
                      <pre className="text-slate-600">{`{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Missing required field: prNumber",
    "details": {
      "field": "prNumber"
    }
  }
}`}</pre>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>

          {/* Right: SDK/Tools */}
          <div className="lg:col-span-1">
            <div className="space-y-6 sticky top-8">
              {/* SDKs */}
              <div className="rounded-lg bg-white p-6 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">Official SDKs</h3>
                <div className="space-y-3">
                  {[
                    { name: 'JavaScript', href: 'https://npm.js/readylayer' },
                    { name: 'Python', href: 'https://pypi.org/readylayer' },
                    { name: 'Go', href: 'https://pkg.go.dev/readylayer' },
                  ].map((sdk) => (
                    <Link
                      key={sdk.name}
                      href={sdk.href}
                      className="block p-3 bg-slate-50 rounded hover:bg-slate-100 transition"
                    >
                      <span className="font-medium text-slate-900">{sdk.name}</span>
                      <p className="text-sm text-slate-600">View on registry</p>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Resources */}
              <div className="rounded-lg bg-white p-6 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">Resources</h3>
                <ul className="space-y-2 text-sm">
                  {[
                    { name: 'OpenAPI Spec', href: '/openapi.json' },
                    { name: 'GitHub Examples', href: 'https://github.com/readylayer/examples' },
                    { name: 'Webhooks', href: '/docs/webhooks' },
                    { name: 'Status', href: 'https://status.ready-layer.com' },
                  ].map((link) => (
                    <li key={link.name}>
                      <Link href={link.href} className="text-blue-600 hover:underline">
                        {link.name} →
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
