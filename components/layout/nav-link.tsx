'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavLinkProps {
  href: string
  label: string
  onClick?: () => void
  variant?: 'desktop' | 'mobile'
}

export function NavLink({ href, label, onClick, variant = 'desktop' }: NavLinkProps): React.JSX.Element {
  const pathname = usePathname()
  const isActive = pathname === href

  if (variant === 'mobile') {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          'block px-4 py-3 rounded-xl text-sm font-display font-medium transition-all duration-200 tap-target',
          isActive
            ? 'bg-primary text-primary-foreground shadow-glow'
            : 'text-text-muted hover:bg-surface-hover hover:text-text-primary'
        )}
        aria-current={isActive ? 'page' : undefined}
      >
        {label}
      </Link>
    )
  }

  return (
    <Link
      href={href}
      className={cn(
        'relative text-sm font-display font-medium transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-surface-hover',
        isActive
          ? 'text-primary bg-primary/10 shadow-glow'
          : 'text-text-muted hover:text-text-primary'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {label}
      {/* Animated underline for active state */}
      {isActive && (
        <span
          className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full animate-pulse-slow"
          aria-hidden="true"
        />
      )}
    </Link>
  )
}
