'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavLinkProps {
  href: string
  label: string
  onClick?: () => void
  variant?: 'desktop' | 'mobile'
}

export function NavLink({ href, label, onClick, variant = 'desktop' }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  if (variant === 'mobile') {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          'block px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-accent text-accent-foreground shadow-sm'
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
        'relative text-sm font-medium transition-colors duration-200 px-1 py-2',
        isActive
          ? 'text-text-primary'
          : 'text-text-muted hover:text-text-primary'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {label}
      {/* Animated underline for active state */}
      {isActive && (
        <span
          className="absolute bottom-0 left-1 right-1 h-0.5 bg-accent rounded-full"
          aria-hidden="true"
        />
      )}
    </Link>
  )
}
