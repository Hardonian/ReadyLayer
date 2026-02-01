# ReadyLayer Visual Assets

This directory contains optimized visual assets for the ReadyLayer application.

## Asset Generation Guidelines

### Style Bible

**Color Palette (derived from globals.css):**
- Primary: `#135bec` (HSL 217 91% 60%) - Stitch blue
- Success: `#22c55e` (HSL 142 71% 45%) - Green
- Warning: `#f59e0b` (HSL 38 92% 50%) - Amber
- Danger: `#ef4444` (HSL 0 84.2% 60.2%) - Red
- Surface Light: `#ffffff` (white)
- Surface Dark: `#0a0a0c` (near black)
- Text Muted: `#6b7280` (gray)

**Visual Style:**
- Modern flat illustration style
- Clean lines with 1-2px stroke weight
- Subtle shadows: `0 4px 6px -1px rgba(0, 0, 0, 0.1)`
- Border radius: 8-12px matching UI components
- Minimal grain/noise texture for depth
- Tech-focused but friendly and approachable
- Dark mode variants: adjust brightness -10%, add subtle glow effects

**Typography:**
- Use Inter/Space Grotesk font family references
- Monospace for code elements: JetBrains Mono

---

## Asset Manifest

### Tier 1: Critical Assets

#### 1. Hero Illustration
- **Filename:** `hero-governance.webp`
- **Dimensions:** 800x600px (1x), 1600x1200px (2x)
- **Aspect Ratio:** 4:3
- **Alt Text:** "ReadyLayer AI code governance visualization"
- **Usage:** `components/landing/HeroProof.tsx`
- **Purpose:** Primary visual anchor for landing page
- **Budget:** < 200KB (webp)

**Generation Recipe:**
```
Modern flat illustration showing AI-powered code governance concept. 
Central composition: code editor window with syntax-highlighted code 
on left, flowing through a shield/badge icon in center, emerging as 
checked/approved code on right. Floating elements: git branch icons, 
PR symbols, checkmarks. Color palette: primary blue (#135bec), white 
background, subtle gray accents. Clean 2px line art style, minimal 
shadows, rounded corners (12px radius feel). Professional, trustworthy, 
developer-focused aesthetic. No text. Transparent or white background.
```

---

#### 2. Empty State - No Repositories
- **Filename:** `empty-repo.webp`
- **Dimensions:** 400x300px (1x), 800x600px (2x)
- **Aspect Ratio:** 4:3
- **Alt Text:** ""
- **Usage:** Dashboard empty states
- **Purpose:** Visual for "Connect your first repository"
- **Budget:** < 50KB

**Generation Recipe:**
```
Minimal flat illustration of empty repository state. Single floating 
Git branch icon with dotted connection lines extending to empty space. 
Subtle question mark or "?" floating nearby. Soft gray tones with 
primary blue (#135bec) accent on the branch icon. Clean background 
matching surface-muted color. Friendly, inviting, not alarming. 
Decorative only - no text elements.
```

---

#### 3. Empty State - No Reviews
- **Filename:** `empty-reviews.webp`
- **Dimensions:** 400x300px (1x), 800x600px (2x)
- **Aspect Ratio:** 4:3
- **Alt Text:** ""
- **Usage:** Reviews section empty state
- **Purpose:** Visual for "No reviews yet"
- **Budget:** < 50KB

**Generation Recipe:**
```
Minimal flat illustration of empty document review state. Document 
icon with magnifying glass floating above it, both with soft gray 
tones. Primary blue (#135bec) accent on magnifying glass handle. 
Subtle dashed lines suggesting "searching." Clean, minimal, matches 
surface-muted background. Decorative illustration.
```

---

#### 4. Empty State - No Policies
- **Filename:** `empty-policies.webp`
- **Dimensions:** 400x300px (1x), 800x600px (2x)
- **Aspect Ratio:** 4:3
- **Alt Text:** ""
- **Usage:** Policies page empty state
- **Purpose:** Visual for "Create your first policy"
- **Budget:** < 50KB

**Generation Recipe:**
```
Minimal flat illustration of empty policy state. Shield icon with 
dotted outline (suggesting incomplete/unfilled) floating center. 
Small gear icons floating nearby. Soft gray tones with primary blue 
(#135bec) accent on shield border. Clean, minimal style. Background 
matches surface-muted. Decorative only.
```

---

#### 5. Empty State - No Runs
- **Filename:** `empty-runs.webp`
- **Dimensions:** 400x300px (1x), 800x600px (2x)
- **Aspect Ratio:** 4:3
- **Alt Text:** ""
- **Usage:** Pipeline runs empty state
- **Purpose:** Visual for "No runs yet"
- **Budget:** < 50KB

**Generation Recipe:**
```
Minimal flat illustration of empty pipeline state. Pipeline/workflow 
icon (horizontal line with circles) with dotted/disconnected segments. 
Soft gray tones with primary blue (#135bec) accent on connected 
segments. Suggests "waiting to start." Clean, minimal. Background 
matches surface-muted. Decorative illustration.
```

---

#### 6. Error State - General Error
- **Filename:** `error-general.webp`
- **Dimensions:** 400x320px (1x), 800x640px (2x)
- **Aspect Ratio:** 5:4
- **Alt Text:** "Error illustration"
- **Usage:** `components/ui/error-state.tsx`
- **Purpose:** Friendly error visualization
- **Budget:** < 60KB

**Generation Recipe:**
```
Friendly flat illustration for error state. Robot or computer mascot 
with puzzled/confused expression, looking at a broken gear or warning 
triangle. Use warning amber (#f59e0b) and danger red (#ef4444) accents 
sparingly. Keep it friendly, not scary. Soft gray and white tones 
dominant. Clean line art style. Background white/light surface. 
Conveys "something went wrong but we're on it" feeling.
```

---

#### 7. Error State - 404 Not Found
- **Filename:** `error-404.webp`
- **Dimensions:** 400x320px (1x), 800x640px (2x)
- **Aspect Ratio:** 5:4
- **Alt Text:** "Page not found illustration"
- **Usage:** 404 error pages
- **Purpose:** Friendly 404 visualization
- **Budget:** < 60KB

**Generation Recipe:**
```
Friendly flat illustration for 404 page. Mascot character looking 
around confused, searching for something. Magnifying glass nearby, 
empty page/document floating. Use primary blue (#135bec) and muted 
gray tones. Keep playful but professional. Clean line art. White 
background. Conveys "we couldn't find that page" feeling.
```

---

#### 8. Error State - Auth Error
- **Filename:** `error-auth.webp`
- **Dimensions:** 400x320px (1x), 800x640px (2x)
- **Aspect Ratio:** 5:4
- **Alt Text:** "Authentication error illustration"
- **Usage:** Auth error pages
- **Purpose:** Auth failure visualization
- **Budget:** < 60KB

**Generation Recipe:**
```
Friendly flat illustration for auth error. Shield icon with subtle 
X mark or lock with keyhole. Mascot character shrugging or showing 
key that's too big/small. Use danger red (#ef4444) sparingly for 
X mark only. Soft grays and primary blue dominant. Clean, minimal. 
White background. Conveys "can't authenticate" without being scary.
```

---

### Tier 2: Feature Illustrations

#### 9. Value Driver - Policy First
- **Filename:** `value-policy.webp`
- **Dimensions:** 240x180px (1x), 480x360px (2x)
- **Aspect Ratio:** 4:3
- **Alt Text:** ""
- **Usage:** ValueDrivers section
- **Purpose:** Visual for "Policy-first governance"
- **Budget:** < 30KB

**Generation Recipe:**
```
Small flat illustration: Shield icon protecting a code document. 
Shield has checkmark. Clean, minimal. Primary blue (#135bec) shield, 
gray document. 2px line weight. Decorative icon illustration.
```

---

#### 10. Value Driver - Composable Checks
- **Filename:** `value-composable.webp`
- **Dimensions:** 240x180px (1x), 480x360px (2x)
- **Aspect Ratio:** 4:3
- **Alt Text:** ""
- **Usage:** ValueDrivers section
- **Purpose:** Visual for "Composable checks"
- **Budget:** < 30KB

**Generation Recipe:**
```
Small flat illustration: Three puzzle pieces or modular blocks 
connecting together to form complete solution. Primary blue 
(#135bec) and gray tones. Clean line art. Decorative icon.
```

---

#### 11. Value Driver - Documentation Alignment
- **Filename:** `value-docs.webp`
- **Dimensions:** 240x180px (1x), 480x360px (2x)
- **Aspect Ratio:** 4:3
- **Alt Text:** ""
- **Usage:** ValueDrivers section
- **Purpose:** Visual for "Documentation alignment"
- **Budget:** < 30KB

**Generation Recipe:**
```
Small flat illustration: Two documents with arrows/sync icon between 
them showing alignment. Primary blue (#135bec) arrows, gray documents. 
Clean, minimal line art. Decorative icon.
```

---

#### 12. Value Driver - Git Integration
- **Filename:** `value-git.webp`
- **Dimensions:** 240x180px (1x), 480x360px (2x)
- **Aspect Ratio:** 4:3
- **Alt Text:** ""
- **Usage:** ValueDrivers section
- **Purpose:** Visual for "Git-native integration"
- **Budget:** < 30KB

**Generation Recipe:**
```
Small flat illustration: Git branch diagram with merge flow. Branch 
lines connecting to central hub. Primary blue (#135bec) flow, gray 
branch points. Clean line art. Decorative icon.
```

---

## Generation Workflow

### Option 1: AI Image Generation (Recommended)
Use the generation recipes above with:
- **Midjourney:** Add `--style raw --s 50` for cleaner outputs
- **DALL-E 3:** Use as-is, specify "flat illustration, clean lines"
- **Stable Diffusion:** Use flat illustration LoRA

Export to:
1. PNG (source)
2. WebP (production, 80% quality)
3. Generate 2x versions for retina displays

### Option 2: Vector/Illustrator (Professional)
Create in Figma/Illustrator:
- Artboards at exact dimensions
- Export SVG + WebP
- Use color variables matching CSS custom properties

---

## Implementation Checklist

### Phase 1: Critical Assets
- [ ] `hero-governance.webp` (800x600, 1600x1200)
- [ ] `empty-repo.webp` (400x300, 800x600)
- [ ] `empty-reviews.webp` (400x300, 800x600)
- [ ] `empty-policies.webp` (400x300, 800x600)
- [ ] `empty-runs.webp` (400x300, 800x600)
- [ ] `error-general.webp` (400x320, 800x640)
- [ ] `error-404.webp` (400x320, 800x640)
- [ ] `error-auth.webp` (400x320, 800x640)

### Phase 2: Feature Assets
- [ ] `value-policy.webp` (240x180, 480x360)
- [ ] `value-composable.webp` (240x180, 480x360)
- [ ] `value-docs.webp` (240x180, 480x360)
- [ ] `value-git.webp` (240x180, 480x360)

### Dark Mode Variants (if needed)
Create `-dark.webp` versions for:
- [ ] Hero illustration (darker bg, subtle glow)
- [ ] Error illustrations (adjust contrast)

---

## File Naming Convention

```
{category}-{descriptor}-{size}.webp

Categories:
- hero: Main landing visuals
- empty: Empty state illustrations
- error: Error state illustrations
- value: Value proposition icons
- feature: Feature illustrations
- onboarding: Onboarding visuals

Sizes:
- 1x: Standard (as documented above)
- 2x: Retina (@2x suffix)

Examples:
- hero-governance.webp (800x600)
- hero-governance@2x.webp (1600x1200)
- empty-repo.webp (400x300)
- empty-repo@2x.webp (800x600)
```

---

## Performance Budgets

| Asset Type | Max Size (webp) | Target Size |
|------------|-----------------|-------------|
| Hero (1x) | 200KB | 150KB |
| Hero (2x) | 400KB | 300KB |
| Empty states | 60KB | 40KB |
| Error states | 60KB | 40KB |
| Value icons | 30KB | 20KB |

---

## Accessibility Notes

- All decorative images have empty `alt=""` attribute
- Informative images have descriptive alt text
- Error illustrations have alt text describing the error type
- Color contrast meets WCAG AA standards
- Animations respect `prefers-reduced-motion`

---

*Last updated: 2026-02-01*
