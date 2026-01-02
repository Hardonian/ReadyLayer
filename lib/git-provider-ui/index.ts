/**
 * Git Provider UI Adapter
 * 
 * Provides transposable UI components that adapt to different Git providers
 * (GitHub, GitLab, Bitbucket) for seamless integration into their workflows
 */

export type GitProvider = 'github' | 'gitlab' | 'bitbucket' | 'generic'

export interface GitProviderTheme {
  provider: GitProvider
  colors: {
    primary: string
    secondary: string
    success: string
    warning: string
    danger: string
    background: string
    border: string
  }
  spacing: {
    small: string
    medium: string
    large: string
  }
  typography: {
    fontFamily: string
    fontSize: {
      small: string
      medium: string
      large: string
    }
  }
}

export interface GitProviderUIConfig {
  provider: GitProvider
  theme: GitProviderTheme
  integration: {
    prCheckStyle: 'github' | 'gitlab' | 'bitbucket'
    commentStyle: 'github' | 'gitlab' | 'bitbucket'
    statusCheckStyle: 'github' | 'gitlab' | 'bitbucket'
  }
  workflow: {
    showInPR: boolean
    showInMR: boolean
    showInCommit: boolean
    embedInProviderUI: boolean
  }
}

/**
 * Detect Git provider from repository
 */
export function detectGitProvider(repository: {
  provider?: string
  url?: string
}): GitProvider {
  if (repository.provider) {
    const provider = repository.provider.toLowerCase()
    if (provider === 'github') return 'github'
    if (provider === 'gitlab') return 'gitlab'
    if (provider === 'bitbucket') return 'bitbucket'
  }

  if (repository.url) {
    if (repository.url.includes('github.com')) return 'github'
    if (repository.url.includes('gitlab.com') || repository.url.includes('gitlab')) return 'gitlab'
    if (repository.url.includes('bitbucket.org') || repository.url.includes('bitbucket')) return 'bitbucket'
  }

  return 'generic'
}

/**
 * Get Git provider UI configuration
 */
export function getGitProviderUIConfig(provider: GitProvider): GitProviderUIConfig {
  const baseConfig: GitProviderUIConfig = {
    provider,
    theme: getProviderTheme(provider),
    integration: {
      prCheckStyle: provider === 'github' ? 'github' : provider === 'gitlab' ? 'gitlab' : 'bitbucket',
      commentStyle: provider === 'github' ? 'github' : provider === 'gitlab' ? 'gitlab' : 'bitbucket',
      statusCheckStyle: provider === 'github' ? 'github' : provider === 'gitlab' ? 'gitlab' : 'bitbucket',
    },
    workflow: {
      showInPR: true,
      showInMR: true,
      showInCommit: true,
      embedInProviderUI: true,
    },
  }

  return baseConfig
}

/**
 * Get provider-specific theme
 */
function getProviderTheme(provider: GitProvider): GitProviderTheme {
  switch (provider) {
    case 'github':
      return {
        provider: 'github',
        colors: {
          primary: '#0969da',
          secondary: '#656d76',
          success: '#1a7f37',
          warning: '#9a6700',
          danger: '#cf222e',
          background: '#ffffff',
          border: '#d1d9e0',
        },
        spacing: {
          small: '4px',
          medium: '8px',
          large: '16px',
        },
        typography: {
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
          fontSize: {
            small: '12px',
            medium: '14px',
            large: '16px',
          },
        },
      }

    case 'gitlab':
      return {
        provider: 'gitlab',
        colors: {
          primary: '#fc6d26',
          secondary: '#868686',
          success: '#108548',
          warning: '#c17a11',
          danger: '#d01a1a',
          background: '#ffffff',
          border: '#e5e5e5',
        },
        spacing: {
          small: '4px',
          medium: '8px',
          large: '16px',
        },
        typography: {
          fontFamily: '"Roboto", -apple-system, BlinkMacSystemFont, sans-serif',
          fontSize: {
            small: '12px',
            medium: '14px',
            large: '16px',
          },
        },
      }

    case 'bitbucket':
      return {
        provider: 'bitbucket',
        colors: {
          primary: '#0052cc',
          secondary: '#6b778c',
          success: '#00875a',
          warning: '#ffab00',
          danger: '#de350b',
          background: '#ffffff',
          border: '#dfe1e6',
        },
        spacing: {
          small: '4px',
          medium: '8px',
          large: '16px',
        },
        typography: {
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: {
            small: '12px',
            medium: '14px',
            large: '16px',
          },
        },
      }

    default:
      return {
        provider: 'generic',
        colors: {
          primary: '#6366f1',
          secondary: '#64748b',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          background: '#ffffff',
          border: '#e2e8f0',
        },
        spacing: {
          small: '4px',
          medium: '8px',
          large: '16px',
        },
        typography: {
          fontFamily: 'system-ui, sans-serif',
          fontSize: {
            small: '12px',
            medium: '14px',
            large: '16px',
          },
        },
      }
  }
}

/**
 * Get provider-specific status check badge style
 */
export function getStatusCheckBadgeStyle(
  provider: GitProvider,
  status: 'success' | 'failure' | 'pending' | 'error'
): {
  className: string
  icon: string
  color: string
} {
  const styles = {
    github: {
      success: { className: 'bg-green-50 text-green-800 border-green-200', icon: '✓', color: '#1a7f37' },
      failure: { className: 'bg-red-50 text-red-800 border-red-200', icon: '✗', color: '#cf222e' },
      pending: { className: 'bg-yellow-50 text-yellow-800 border-yellow-200', icon: '○', color: '#9a6700' },
      error: { className: 'bg-red-50 text-red-800 border-red-200', icon: '⚠', color: '#cf222e' },
    },
    gitlab: {
      success: { className: 'bg-green-50 text-green-800 border-green-200', icon: '✓', color: '#108548' },
      failure: { className: 'bg-red-50 text-red-800 border-red-200', icon: '✗', color: '#d01a1a' },
      pending: { className: 'bg-yellow-50 text-yellow-800 border-yellow-200', icon: '○', color: '#c17a11' },
      error: { className: 'bg-red-50 text-red-800 border-red-200', icon: '⚠', color: '#d01a1a' },
    },
    bitbucket: {
      success: { className: 'bg-green-50 text-green-800 border-green-200', icon: '✓', color: '#00875a' },
      failure: { className: 'bg-red-50 text-red-800 border-red-200', icon: '✗', color: '#de350b' },
      pending: { className: 'bg-yellow-50 text-yellow-800 border-yellow-200', icon: '○', color: '#ffab00' },
      error: { className: 'bg-red-50 text-red-800 border-red-200', icon: '⚠', color: '#de350b' },
    },
    generic: {
      success: { className: 'bg-green-50 text-green-800 border-green-200', icon: '✓', color: '#10b981' },
      failure: { className: 'bg-red-50 text-red-800 border-red-200', icon: '✗', color: '#ef4444' },
      pending: { className: 'bg-yellow-50 text-yellow-800 border-yellow-200', icon: '○', color: '#f59e0b' },
      error: { className: 'bg-red-50 text-red-800 border-red-200', icon: '⚠', color: '#ef4444' },
    },
  }

  return styles[provider][status]
}

/**
 * Get provider-specific PR/MR comment format
 */
export function formatProviderComment(
  provider: GitProvider,
  content: {
    title: string
    body: string
    issues?: Array<{ severity: string; message: string }>
    score?: number
  }
): string {
  const emoji = provider === 'github' ? '🔍' : provider === 'gitlab' ? '🔒' : '✅'
  
  let comment = `${emoji} **${content.title}**\n\n`
  comment += `${content.body}\n\n`

  if (content.score !== undefined) {
    const scoreEmoji = content.score >= 80 ? '✅' : content.score >= 60 ? '⚠️' : '❌'
    comment += `**Policy Score**: ${scoreEmoji} ${content.score.toFixed(1)}/100\n\n`
  }

  if (content.issues && content.issues.length > 0) {
    comment += '### Issues Found\n\n'
    content.issues.slice(0, 10).forEach((issue) => {
      const severityEmoji = issue.severity === 'critical' ? '🔴' :
                           issue.severity === 'high' ? '🟠' :
                           issue.severity === 'medium' ? '🟡' : '🟢'
      comment += `${severityEmoji} **${issue.severity.toUpperCase()}**: ${issue.message}\n`
    })
    if (content.issues.length > 10) {
      comment += `\n*... and ${content.issues.length - 10} more issues*\n`
    }
  }

  return comment
}

/**
 * Get provider-specific status check description
 */
export function getStatusCheckDescription(
  _provider: GitProvider,
  result: {
    blocked: boolean
    score: number
    issuesCount: number
  }
): string {
  if (result.blocked) {
    return `Policy check failed: ${result.issuesCount} issue(s) found. Score: ${result.score.toFixed(1)}/100`
  }

  return `Policy check passed. Score: ${result.score.toFixed(1)}/100`
}
