/**
 * ReadyLayer Design Token System
 * 
 * CENTRALIZED, ENFORCEABLE, CONSISTENT
 * 
 * This document defines the canonical design tokens for the ReadyLayer visual system.
 * All components must reference these tokens - no hardcoded values.
 * 
 * ============================================================================
 * PHILOSOPHY
 * ============================================================================
 * 
 * 1. SEMANTIC NAMING - Tokens describe purpose, not appearance
 *    GOOD: --text-muted, --surface-raised
 *    BAD: --gray-500, --blue-600
 * 
 * 2. CENTRALIZED DEFINITION - All visual values live in globals.css :root
 *    Components reference tokens, never hardcode values
 * 
 * 3. THEME-AWARE - Light, dark, and high-contrast modes tuned separately
 *    Colors are NOT simply inverted - carefully crafted for each mode
 * 
 * 4. COMPOSITION - Build complex values from simple tokens
 *    Example: focus ring = ring token + ring-offset token + surface token
 * 
 * ============================================================================
 * COLOR TOKENS
 * ============================================================================
 * 
 * SURFACES (Elevation-based)
 * --surface          Base app background (white / dark #0a0a0c)
 * --surface-muted    Secondary surfaces, nav backgrounds
 * --surface-raised   Cards, elevated panels
 * --surface-overlay  Modals, popovers, dropdowns
 * --surface-hover    Interactive hover states
 * --surface-dark     Code/terminal backgrounds
 * --surface-code     Code block backgrounds
 * 
 * TEXT (Hierarchy-based)
 * --text             Primary text (near-black / near-white)
 * --text-muted       Secondary text (medium gray)
 * --text-subtle      Tertiary/meta text (lighter gray)
 * --text-inverse     Text on accent/brand surfaces
 * 
 * BORDERS
 * --border           Default borders (subtle)
 * --border-strong    Emphasis borders
 * --ring             Focus ring color
 * 
 * PRIMARY/BRAND
 * --primary          Primary action color (Stitch blue)
 * --primary-light    Lighter variant
 * --primary-dark     Darker variant
 * --primary-foreground Text on primary surfaces
 * 
 * STATUS COLORS (WCAG AA compliant)
 * --success          Success/positive states
 * --warning          Warning/caution states
 * --danger           Error/destructive states
 * --info             Informational states
 * 
 * Each status color has:
 *    - DEFAULT: The main color
 *    - foreground: Text color on top of the status color
 *    - muted: Background tint for subtle usage
 * 
 * ============================================================================
 * TYPOGRAPHY TOKENS
 * ============================================================================
 * 
 * FONTS (CSS custom properties)
 * --font-body        Primary typeface (Inter + Noto Sans)
 * --font-display     Headings typeface (Space Grotesk)
 * --font-mono        Code typeface (JetBrains Mono)
 * 
 * FONT SIZES (Tailwind utilities reference these)
 * text-xs            12px
 * text-sm            14px
 * text-base          16px
 * text-lg            18px
 * text-xl            20px
 * text-2xl           24px
 * text-3xl           30px
 * text-4xl           36px
 * text-5xl           48px
 * 
 * ============================================================================
 * SPACING SCALE (Tailwind)
 * ============================================================================
 * 
 * 0   0px         4 1rem       8 2rem
 * 1 0.25rem (4px) 5 1.25rem   10 2.5rem
 * 2 0.5rem (8px)  6 1.5rem    12 3rem
 * 3 0.75rem (12px) 7 1.75rem  16 4rem
 * 
 * ============================================================================
 * BORDER RADIUS
 * ============================================================================
 * 
 * --radius-sm   0.25rem   Small (tags, badges)
 * --radius-md   0.5rem    Medium (buttons, inputs) - DEFAULT
 * --radius-lg   0.75rem   Large (cards, modals)
 * 
 * ============================================================================
 * SHADOWS
 * ============================================================================
 * 
 * --shadow-surface-raised   Cards, panels
 * --shadow-surface-overlay  Modals, dropdowns
 * --shadow-glow             Primary glow effects
 * --shadow-glow-green       Success glow effects
 * --shadow-code-preview     Code blocks
 * 
 * ============================================================================
 * PROVIDER/BRAND COLORS
 * ============================================================================
 * 
 * These are brand-specific colors for third-party integrations.
 * They live here for consistency but are NOT part of the core palette.
 * 
 * Provider colors should be used via the --provider-* tokens:
 * --provider-github      #238636
 * --provider-gitlab     #fc6d26
 * --provider-bitbucket  #0052CC
 * --provider-google      #4285F4
 * 
 * ============================================================================
 * HOW TO EXTEND THE SYSTEM
 * ============================================================================
 * 
 * ADDING A NEW COLOR:
 * 1. Add the HSL value to :root in globals.css
 * 2. Add a corresponding color token in tailwind.config.ts
 * 3. Reference ONLY the token in components
 * 
 * Example:
 *    /* globals.css :root */
 *    --accent-secondary: 260 70% 55%;
 *    
 *    /* tailwind.config.ts */
 *    accentSecondary: 'hsl(var(--accent-secondary))',
 *    
 *    /* Component */
 *    className="bg-accent-secondary"
 * 
 * ADDING A NEW COMPONENT VARIANT:
 * 1. Define the variant class in tailwind.config.ts or component
 * 2. Use composition of existing tokens
 * 
 * DO NOT:
 * - Add new colors without updating tokens
 * - Use hex values directly in components
 * - Create duplicate tokens for the same purpose
 * 
 * ============================================================================
 * WHAT NOT TO CHANGE CASUALLY
 * ============================================================================
 * 
 * Core palette values require design review because:
 * - They affect accessibility (WCAG AA compliance)
 * - They establish brand recognition
 * - They create visual consistency across the app
 * 
 * Changes to these require:
 * 1. Design review and approval
 * 2. Accessibility verification (contrast ratios)
 * 3. Update to this documentation
 * 4. Update to globals.css :root
 * 5. Propagation through tailwind.config.ts
 * 
 * ============================================================================
 * ACCESSIBILITY NOTES
 * ============================================================================
 * 
 * All text/background combinations meet WCAG AA:
 * - --text on --surface: 4.9:1 minimum
 * - --text-muted on --surface: 3:1 minimum
 * - --primary-foreground on --primary: 4.5:1 minimum
 * - Status colors on white: 3:1 minimum
 * 
 * Focus rings use --ring which meets 3:1 contrast minimum.
 * 
 * High contrast mode (.hc class) increases all ratios to 7:1 (AAA).
 */
