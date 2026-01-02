# Policy UI Git Provider Adaptation

## Overview

The Policy UI has been enhanced to adapt to Git provider styling (GitHub, GitLab, Bitbucket). All policy-related pages now detect the Git provider from repository metadata and apply provider-specific theming, colors, and styling.

## Implementation

### Updated Pages

1. **Policy Detail Page** (`app/dashboard/policies/[packId]/page.tsx`)
   - Detects provider from repository metadata
   - Applies provider-specific colors to icons and badges
   - Shows provider name badge (GitHub/GitLab/Bitbucket)
   - Uses provider theme colors for status indicators

2. **Policies List Page** (`app/dashboard/policies/page.tsx`)
   - Shows provider badges for repository-level policies
   - Applies provider-specific border colors to policy cards
   - Displays provider name in policy cards
   - Uses provider colors for icons

3. **New Policy Page** (`app/dashboard/policies/new/page.tsx`)
   - Uses provider theme for primary icon color
   - Adapts to provider when repository is selected

4. **Waivers Page** (`app/dashboard/waivers/page.tsx`)
   - Applies provider theme colors
   - Provider-aware styling

### Provider-Specific Adaptations

#### GitHub
- Primary color: `#0969da`
- Border color: `#0969da40` (with opacity)
- Badge background: `#0969da15` (with opacity)
- Badge text: `#0969da`

#### GitLab
- Primary color: `#fc6d26`
- Border color: `#fc6d2640`
- Badge background: `#fc6d2615`
- Badge text: `#fc6d26`

#### Bitbucket
- Primary color: `#0052cc`
- Border color: `#0052cc40`
- Badge background: `#0052cc15`
- Badge text: `#0052cc`

### Features

1. **Automatic Provider Detection**
   - Detects provider from repository `provider` field or URL
   - Falls back to generic styling if provider cannot be determined

2. **Dynamic Theming**
   - Icons use provider primary color
   - Badges use provider colors with appropriate opacity
   - Cards show provider-specific border colors

3. **Provider Badges**
   - Repository-level policies show provider name badge
   - Organization-level policies show generic "Organization" badge

4. **Consistent Styling**
   - All policy UI components use the same provider detection logic
   - Theme colors are applied consistently across pages

### Usage

The provider adaptation happens automatically:

1. When a policy is associated with a repository, the UI detects the provider
2. Provider-specific colors and styling are applied
3. Badges and icons reflect the provider theme
4. Cards and borders use provider colors

### Integration with Git Provider UI Library

The Policy UI uses the `useGitProvider` hook from `lib/git-provider-ui/hooks`:

```typescript
import { useGitProvider } from '@/lib/git-provider-ui/hooks'

const { provider, theme } = useGitProvider({
  repository: {
    provider: 'github',
    url: 'https://github.com/owner/repo'
  }
})
```

### Visual Examples

#### Policy Detail Page
- Shield icon uses provider primary color
- Repository badge shows provider name with provider color
- Status badges use provider colors for block/warn/allow actions

#### Policies List Page
- Policy cards have provider-colored borders for repository policies
- Provider badge shows GitHub/GitLab/Bitbucket with provider color
- Icons use provider primary color

### Future Enhancements

1. **Provider-Specific Icons**: Use provider logos instead of generic icons
2. **Provider-Specific Layouts**: Adapt layout to match provider UI patterns
3. **Provider-Specific Typography**: Use provider font families
4. **Dark Mode Support**: Provider-specific dark mode colors
5. **Provider-Specific Animations**: Match provider UI animation styles

## Files Modified

- `app/dashboard/policies/[packId]/page.tsx`
- `app/dashboard/policies/page.tsx`
- `app/dashboard/policies/new/page.tsx`
- `app/dashboard/waivers/page.tsx`

## Notes

- Provider detection is cached per repository
- Falls back gracefully to generic styling if provider cannot be detected
- All components maintain backward compatibility
- Type-safe with full TypeScript support
