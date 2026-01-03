/**
 * Platform-Specific Theme Configuration
 * 
 * Adapts ReadyLayer UI to match GitHub, GitLab, and Bitbucket design languages
 */

export type GitProvider = 'github' | 'gitlab' | 'bitbucket'

export interface PlatformTheme {
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: string
    textMuted: string
    border: string
    success: string
    warning: string
    error: string
  }
  fonts: {
    sans: string[]
    mono: string[]
  }
  spacing: {
    unit: number
  }
  borderRadius: {
    sm: string
    md: string
    lg: string
  }
}

export const platformThemes: Record<GitProvider, PlatformTheme> = {
  github: {
    name: 'GitHub',
    colors: {
      primary: '#238636',
      secondary: '#0969da',
      accent: '#8250df',
      background: '#ffffff',
      surface: '#f6f8fa',
      text: '#24292f',
      textMuted: '#57606a',
      border: '#d0d7de',
      success: '#1a7f37',
      warning: '#9a6700',
      error: '#cf222e',
    },
    fonts: {
      sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
      mono: ['SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', 'monospace'],
    },
    spacing: {
      unit: 4,
    },
    borderRadius: {
      sm: '6px',
      md: '8px',
      lg: '12px',
    },
  },
  gitlab: {
    name: 'GitLab',
    colors: {
      primary: '#fc6d26',
      secondary: '#292961',
      accent: '#5e5ce6',
      background: '#ffffff',
      surface: '#fafafa',
      text: '#303030',
      textMuted: '#868686',
      border: '#e0e0e0',
      success: '#108548',
      warning: '#c17a00',
      error: '#d01a1a',
    },
    fonts: {
      sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      mono: ['Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'monospace'],
    },
    spacing: {
      unit: 4,
    },
    borderRadius: {
      sm: '4px',
      md: '6px',
      lg: '8px',
    },
  },
  bitbucket: {
    name: 'Bitbucket',
    colors: {
      primary: '#0052cc',
      secondary: '#172b4d',
      accent: '#0065ff',
      background: '#ffffff',
      surface: '#f4f5f7',
      text: '#172b4d',
      textMuted: '#5e6c84',
      border: '#dfe1e6',
      success: '#00875a',
      warning: '#ff991f',
      error: '#de350b',
    },
    fonts: {
      sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
      mono: ['Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'monospace'],
    },
    spacing: {
      unit: 4,
    },
    borderRadius: {
      sm: '3px',
      md: '4px',
      lg: '6px',
    },
  },
}

/**
 * Get platform theme based on repository provider
 */
export function getPlatformTheme(provider: GitProvider | string): PlatformTheme {
  const normalizedProvider = provider.toLowerCase() as GitProvider
  return platformThemes[normalizedProvider] || platformThemes.github
}

/**
 * Apply platform-specific CSS variables
 */
export function applyPlatformTheme(theme: PlatformTheme): string {
  return `
    --platform-primary: ${theme.colors.primary};
    --platform-secondary: ${theme.colors.secondary};
    --platform-accent: ${theme.colors.accent};
    --platform-background: ${theme.colors.background};
    --platform-surface: ${theme.colors.surface};
    --platform-text: ${theme.colors.text};
    --platform-text-muted: ${theme.colors.textMuted};
    --platform-border: ${theme.colors.border};
    --platform-success: ${theme.colors.success};
    --platform-warning: ${theme.colors.warning};
    --platform-error: ${theme.colors.error};
    --platform-font-sans: ${theme.fonts.sans.join(', ')};
    --platform-font-mono: ${theme.fonts.mono.join(', ')};
    --platform-spacing-unit: ${theme.spacing.unit}px;
    --platform-radius-sm: ${theme.borderRadius.sm};
    --platform-radius-md: ${theme.borderRadius.md};
    --platform-radius-lg: ${theme.borderRadius.lg};
  `
}
