'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { NavLink } from './nav-link'
import type { NavItem } from '@/lib/navigation'

interface MobileNavProps {
  navItems: NavItem[]
  homeHref?: string
}

export function MobileNav({ navItems, homeHref = '/dashboard' }: MobileNavProps): React.JSX.Element {
  const [isOpen, setIsOpen] = React.useState(false)
  const pathname = usePathname()
  const menuRef = React.useRef<HTMLDivElement>(null)
  const toggleButtonRef = React.useRef<HTMLButtonElement>(null)

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
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`
      }
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [isOpen])

  // Handle ESC key to close menu
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closeMenu()
        // Return focus to toggle button
        toggleButtonRef.current?.focus()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }

    return undefined
  }, [isOpen, closeMenu])

  // Focus trap: trap focus within menu when open
  React.useEffect(() => {
    const menuElement = menuRef.current
    if (!isOpen || !menuElement) return

    const focusableElements = menuElement.querySelectorAll<HTMLElement>(
      'a, button, [tabindex]:not([tabindex="-1"])'
    )

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    menuElement.addEventListener('keydown', handleKeyDown)
    // Auto-focus the first link when menu opens
    firstElement.focus()

    return () => menuElement.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <div className="md:hidden">
      {/* Menu Toggle Button */}
      <Button
        ref={toggleButtonRef}
        variant="ghost"
        size="icon"
        onClick={toggleMenu}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        aria-controls="mobile-nav-menu"
        className="relative"
      >
        <motion.div
          initial={false}
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {isOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </motion.div>
      </Button>

      {/* Mobile Menu Overlay */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 cursor-pointer hover:bg-black/50 transition-colors"
              onClick={closeMenu}
              aria-hidden="true"
            />

            {/* Menu Panel */}
            <motion.nav
              ref={menuRef}
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
                <Link
                  href={homeHref}
                  className="flex items-center"
                  aria-label="ReadyLayer Home"
                  onClick={closeMenu}
                >
                  <picture>
                    <source srcSet="/logo-header.webp" type="image/webp" />
                    <Image
                      src="/logo-header.png"
                      alt="ReadyLayer"
                      width={120}
                      height={24}
                      priority
                      className="h-6 w-auto dark:invert"
                    />
                  </picture>
                </Link>
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
                <motion.ul
                  className="space-y-1 px-2 list-none"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.05,
                        delayChildren: 0.1,
                      },
                    },
                  }}
                  initial="hidden"
                  animate="visible"
                >
                  {navItems.map((item) => (
                    <motion.li
                      key={item.href}
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: { opacity: 1, x: 0 },
                      }}
                    >
                      <NavLink
                        href={item.href}
                        label={item.label}
                        onClick={closeMenu}
                        variant="mobile"
                      />
                    </motion.li>
                  ))}
                </motion.ul>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
