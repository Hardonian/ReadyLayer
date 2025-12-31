import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // SURFACE TOKENS - Layered elevation system
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          muted: 'hsl(var(--surface-muted))',
          raised: 'hsl(var(--surface-raised))',
          overlay: 'hsl(var(--surface-overlay))',
          hover: 'hsl(var(--surface-hover))',
        },
        
        // TEXT TOKENS - Clear hierarchy
        text: {
          primary: 'hsl(var(--text))',
          muted: 'hsl(var(--text-muted))',
          subtle: 'hsl(var(--text-subtle))',
          inverse: 'hsl(var(--text-inverse))',
        },
        
        // BORDER TOKENS
        border: {
          DEFAULT: 'hsl(var(--border))',
          subtle: 'hsl(var(--border))',
          strong: 'hsl(var(--border-strong))',
        },
        
        // RING TOKEN
        ring: {
          DEFAULT: 'hsl(var(--ring))',
          focus: 'hsl(var(--ring))',
        },
        
        // ACCENT / BRAND TOKENS
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          hover: 'hsl(var(--accent-hover))',
          muted: 'hsl(var(--accent-muted))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        
        // STATUS TOKENS
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          muted: 'hsl(var(--success-muted))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
          muted: 'hsl(var(--warning-muted))',
        },
        danger: {
          DEFAULT: 'hsl(var(--danger))',
          foreground: 'hsl(var(--danger-foreground))',
          muted: 'hsl(var(--danger-muted))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
          muted: 'hsl(var(--info-muted))',
        },
        
        // LEGACY COMPATIBILITY - Map to semantic tokens
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        input: 'hsl(var(--input))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        
        // Gamification colors (kept as-is for now)
        bronze: '#CD7F32',
        silver: '#C0C0C0',
        gold: '#FFD700',
        platinum: '#E5E4E2',
        diamond: '#B9F2FF',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        DEFAULT: 'var(--radius)',
      },
      boxShadow: {
        'surface-flat': 'none',
        'surface-raised': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'surface-overlay': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
