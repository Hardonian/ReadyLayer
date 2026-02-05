import type { Config } from "tailwindcss/types/config";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // TEXT TOKENS - Clear hierarchy
        text: {
          primary: "hsl(var(--text))",
          muted: "hsl(var(--text-muted))",
          subtle: "hsl(var(--text-subtle))",
          inverse: "hsl(var(--text-inverse))",
        },

        // BORDER TOKENS
        border: {
          DEFAULT: "hsl(var(--border))",
          subtle: "hsl(var(--border))",
          strong: "hsl(var(--border-strong))",
        },

        // RING TOKEN
        ring: {
          DEFAULT: "hsl(var(--ring))",
          focus: "hsl(var(--ring))",
        },

        // ACCENT / BRAND TOKENS - Stitch-inspired primary colors
        accent: {
          DEFAULT: "hsl(var(--accent))",
          hover: "hsl(var(--accent-hover))",
          muted: "hsl(var(--accent-muted))",
          foreground: "hsl(var(--accent-foreground))",
        },

        // STITCH BRAND COLORS - Additional primary variants from Stitch export
        primary: {
          DEFAULT: "hsl(var(--primary))",
          light: "hsl(var(--primary-light))",
          dark: "hsl(var(--primary-dark))",
          foreground: "hsl(var(--primary-foreground))",
        },

        // STITCH SURFACE SYSTEM - Enhanced surface tokens
        surface: {
          DEFAULT: "hsl(var(--surface))",
          muted: "hsl(var(--surface-muted))",
          raised: "hsl(var(--surface-raised))",
          overlay: "hsl(var(--surface-overlay))",
          hover: "hsl(var(--surface-hover))",
          dark: "hsl(var(--surface-dark))", // For dark mode cards/panels
          code: "hsl(var(--surface-code))", // For terminal/code backgrounds
        },

        // STATUS TOKENS
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          muted: "hsl(var(--success-muted))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          muted: "hsl(var(--warning-muted))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))",
          muted: "hsl(var(--danger-muted))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          muted: "hsl(var(--info-muted))",
        },

        // LEGACY COMPATIBILITY - Map to semantic tokens
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        input: "hsl(var(--input))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // Gamification colors (kept as-is for now)
        bronze: "#CD7F32",
        silver: "#C0C0C0",
        gold: "#FFD700",
        platinum: "#E5E4E2",
        diamond: "#B9F2FF",

        // PROVIDER TOKENS - Brand colors for third-party integrations
        // Use these for GitHub/GitLab/Bitbucket OAuth buttons and badges
        provider: {
          github: "hsl(var(--provider-github))",
          gitlab: "hsl(var(--provider-gitlab))",
          bitbucket: "hsl(var(--provider-bitbucket))",
          google: "hsl(var(--provider-google))",
        },

        // CHART COLORS - Pre-configured palette for data visualization
        // WCAG AA compliant when used on white backgrounds
        chart: {
          primary: "#4F46E5",    // Indigo
          success: "#10B981",    // Emerald
          warning: "#F59E0B",    // Amber
          danger: "#EF4444",     // Red
          default: "#4F46E5",    // Alias for primary
        },
      },
      fontFamily: {
        // Typography system - using CSS custom properties
        display: ['var(--font-display)', 'Inter', 'sans-serif'],
        body: ['var(--font-body)', 'Noto Sans', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        DEFAULT: 'var(--radius)',
      },
      boxShadow: {
        'surface-flat': 'none',
        'surface-raised': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'surface-overlay': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'glow': '0 0 40px -10px rgba(29, 100, 237, 0.3)',
        'glow-green': '0 0 40px -10px rgba(19, 236, 91, 0.3)',
        'code-preview': '0 4px 20px -4px rgba(0, 0, 0, 0.3)',
        // Provider-specific shadows for OAuth buttons
        'provider-github': '0 1px 3px 0 rgb(35 134 54 / 0.3)',
        'provider-gitlab': '0 1px 3px 0 rgb(252 109 38 / 0.3)',
        'provider-bitbucket': '0 1px 3px 0 rgb(0 82 204 / 0.3)',
      },
      animation: {
        // Stitch animation patterns
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'code-glow': 'codeGlow 4s ease-in-out infinite',
        'blob': 'blob 7s infinite',
      },
      keyframes: {
        // Stitch keyframes
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        codeGlow: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.05)' },
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
