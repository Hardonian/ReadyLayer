/**
 * Navigation configuration and types
 * Centralized nav structure for consistency and maintainability
 */

export interface NavItem {
  href: string
  label: string
  icon?: React.ReactNode
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/live', label: 'Live Ops' },
  { href: '/dashboard/prs', label: 'PRs' },
  { href: '/dashboard/runs', label: 'Runs' },
  { href: '/dashboard/findings', label: 'Findings' },
  { href: '/dashboard/policies', label: 'Policies' },
  { href: '/dashboard/audit', label: 'Audit' },
  { href: '/dashboard/billing', label: 'Billing' },
  { href: '/dashboard/settings', label: 'Settings' },
  { href: '/help', label: 'Help' },
]
