# Git Provider UI Integration

## Overview

The UI has been made transposable and adaptive to Git provider workflows (GitHub, GitLab, Bitbucket). Components automatically detect the Git provider and adapt their styling, messaging, and behavior to match the provider's ecosystem.

## Implementation

### Core Components

1. **Git Provider UI Library** (`lib/git-provider-ui/`)
   - `index.ts`: Core detection and configuration
   - `hooks.ts`: React hooks for provider-aware UI
   - `comment-formatter.ts`: Provider-specific PR/MR comment formatting

2. **UI Components** (`components/git-provider/`)
   - `status-check-badge.tsx`: Provider-aware status badges
   - `policy-status-widget.tsx`: Adaptive policy status widget
   - `pr-integration.tsx`: PR/MR integration component

### Features

#### 1. Provider Detection
- Automatically detects Git provider from repository URL or provider field
- Supports GitHub, GitLab, Bitbucket, and generic fallback

#### 2. Adaptive Theming
- Provider-specific color schemes
- Typography matching provider styles
- Spacing and layout adaptations

#### 3. Comment Formatting
- GitHub-style markdown comments
- GitLab MR comment formatting
- Bitbucket PR comment formatting
- Provider-specific emoji and formatting

#### 4. Status Checks
- Provider-aware status check descriptions
- Adaptive badge styling
- Contextual messaging

### Integration Points

1. **Webhook Processor** (`workers/webhook-processor.ts`)
   - Uses provider-aware comment formatting
   - Generates provider-specific status check descriptions
   - Detects provider from repository metadata

2. **Repository Pages** (`app/dashboard/repos/[repoId]/`)
   - Policy widget adapts to provider
   - Uses provider-specific styling

3. **Policy Pages** (`app/dashboard/policies/`)
   - Provider-aware UI components
   - Adaptive theming based on repository provider

### Usage Examples

#### Provider Detection
```typescript
import { detectGitProvider } from '@/lib/git-provider-ui'

const provider = detectGitProvider({
  provider: 'github',
  url: 'https://github.com/owner/repo'
})
// Returns: 'github'
```

#### Provider-Aware Comment Formatting
```typescript
import { formatPolicyComment } from '@/lib/git-provider-ui/comment-formatter'

const comment = formatPolicyComment(
  {
    blocked: false,
    score: 85,
    rulesFired: ['security.sql-injection'],
    nonWaivedFindings: []
  },
  {
    provider: 'github',
    includeScore: true,
    includeIssues: true
  }
)
```

#### Provider-Aware Status Widget
```tsx
import { PolicyStatusWidget } from '@/components/git-provider'

<PolicyStatusWidget
  repository={{
    id: repo.id,
    provider: repo.provider,
    fullName: repo.fullName
  }}
  policyResult={{
    blocked: false,
    score: 85,
    rulesFired: [],
    issuesCount: 0
  }}
/>
```

### Provider-Specific Adaptations

#### GitHub
- Primary color: `#0969da`
- Uses GitHub-style markdown
- Status checks with GitHub formatting
- PR comment style

#### GitLab
- Primary color: `#fc6d26`
- GitLab MR comment formatting
- Merge request integration
- GitLab-specific status checks

#### Bitbucket
- Primary color: `#0052cc`
- Bitbucket PR comment style
- Pull request integration
- Bitbucket-specific UI elements

### Workflow Integration

The UI components integrate seamlessly into Git provider workflows:

1. **PR/MR Comments**: Automatically formatted for the provider
2. **Status Checks**: Provider-specific descriptions and styling
3. **Dashboard Widgets**: Adapt to provider theme
4. **Policy Pages**: Provider-aware components

### Future Enhancements

1. **GitLab API Integration**: Full GitLab API client
2. **Bitbucket API Integration**: Bitbucket API client
3. **Azure DevOps Support**: Add Azure DevOps provider
4. **Custom Themes**: Allow organizations to customize provider themes
5. **Embedded Widgets**: Provider-specific embedded widgets for PR/MR pages

## Files Modified/Created

### New Files
- `lib/git-provider-ui/index.ts`
- `lib/git-provider-ui/hooks.ts`
- `lib/git-provider-ui/comment-formatter.ts`
- `components/git-provider/status-check-badge.tsx`
- `components/git-provider/policy-status-widget.tsx`
- `components/git-provider/pr-integration.tsx`
- `components/git-provider/index.ts`
- `app/dashboard/repos/[repoId]/policy-widget.tsx`

### Modified Files
- `workers/webhook-processor.ts`: Integrated provider-aware comment formatting
- `app/dashboard/repos/[repoId]/page.tsx`: Added policy widget
- `app/dashboard/policies/[packId]/page.tsx`: Provider-aware theming

## Testing

To test provider adaptation:

1. Create repositories with different providers (GitHub, GitLab, Bitbucket)
2. Trigger policy evaluations
3. Verify PR/MR comments are formatted correctly for each provider
4. Check status checks use provider-specific descriptions
5. Verify UI components adapt their styling

## Notes

- All components gracefully fall back to generic styling if provider cannot be detected
- Provider detection is cached per repository
- Comments and status checks maintain backward compatibility
- UI components are fully typed and lint-compliant
