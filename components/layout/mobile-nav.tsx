'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface MobileNavProps {
  navItems: Array<{ href: string; label: string }>
}

export function MobileNav({ navItems }: MobileNavProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const pathname = usePathname()

  const toggleMenu = React.useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const closeMenu = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  // Close menu on route change
  React.useEffect(() => {
    closeMenu()
  }, [pathname, closeMenu])

  // Prevent body scroll when menu is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <div className="md:hidden">
      {/* Menu Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMenu}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        aria-controls="mobile-nav-menu"
      >
        {isOpen ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Menu className="h-5 w-5" aria-hidden="true" />
        )}
      </Button>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={closeMenu}
              aria-hidden="true"
            />

            {/* Menu Panel */}
            <motion.nav
              id="mobile-nav-menu"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-surface border-r border-border-subtle z-50 flex flex-col"
              role="navigation"
              aria-label="Mobile navigation"
            >
              {/* Menu Header */}
              <div className="flex items-center justify-between p-4 border-b border-border-subtle">
                <span className="text-xl font-bold">ReadyLayer</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeMenu}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-1 px-2">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={closeMenu}
                          className={cn(
                            'block px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'text-text-muted hover:bg-surface-hover hover:text-text-primary'
                          )}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          {item.label}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
