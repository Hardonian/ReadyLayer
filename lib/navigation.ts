/**
 * Navigation configuration and types
 * Centralized nav structure for consistency and maintainability
 */

export interface NavItem {
  href: string
  label: string
  icon?: React.ReactNode
  children?: NavItem[]
}

/**
 * Authenticated user navigation
 * Shown when user is logged in
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/live', label: 'Live Ops' },
  { href: '/dashboard/prs', label: 'PRs' },
  { href: '/dashboard/runs', label: 'Runs' },
  { href: '/dashboard/findings', label: 'Findings' },
  { href: '/dashboard/policies', label: 'Policies' },
  { href: '/dashboard/audit', label: 'Audit' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/dashboard/billing', label: 'Billing' },
  { href: '/dashboard/settings', label: 'Settings' },
  { href: '/help', label: 'Help' },
]

/**
 * Public navigation for non-authenticated users
 * Shown when user is not logged in
 */
export const PUBLIC_NAV_ITEMS: NavItem[] = [
  { href: '/how-it-works', label: 'How it Works' },
  {
    href: '/features',
    label: 'Features',
    children: [
      { href: '/features/oss-maintainers', label: 'For OSS Maintainers' },
      { href: '/features/startup-ctos', label: 'For Startup CTOs' },
    ],
  },
  { href: '/pricing', label: 'Pricing' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/docs/api-reference', label: 'Docs' },
  { href: '/help', label: 'Help' },
]
