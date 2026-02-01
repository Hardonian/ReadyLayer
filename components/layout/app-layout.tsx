'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { fadeIn } from '@/lib/design/motion'
import { Github, LogOut } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { MobileNav } from './mobile-nav'
import { NavLink } from './nav-link'
import { RuntimeTopNotice } from '@/components/layout/runtime-top-notice'
import { Footer } from '@/components/layout/footer'
import { NAV_ITEMS, PUBLIC_NAV_ITEMS } from '@/lib/navigation'
import { isPublicRoute } from '@/lib/access-control'

export function AppLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  const pathname = usePathname()
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    const supabase = createSupabaseClient()
    
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch {
        // Silently handle auth errors - user will see sign-in prompt
      } finally {
        setLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Track scroll position for nav shadow
  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSignOut = async () => {
    try {
      const supabase = createSupabaseClient()
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (error) {
      // If sign-out fails, still redirect (session may be invalid)
      console.error('Sign out error:', error)
      window.location.href = '/'
    }
  }

  const logoHref = user ? '/dashboard' : isPublicRoute(pathname ?? '/') ? '/' : '/dashboard'

  // Don't show nav on auth pages or landing page
  const showNav = !pathname?.startsWith('/auth') && pathname !== '/'

  return (
    <div className="min-h-screen flex flex-col">
      <RuntimeTopNotice />
      {showNav && (
        <motion.nav
          className={cn(
            'sticky top-0 z-40 border-b border-border/20 backdrop-blur-custom bg-surface/95 dark:bg-surface/90 transition-all duration-300',
            scrolled && 'shadow-surface-raised'
          )}
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          role="navigation"
          aria-label="Main navigation"
        >
          <Container>
            <div className="flex h-16 items-center justify-between gap-4">
              {/* Logo and Desktop Nav */}
              <div className="flex items-center gap-8 flex-1 min-w-0">
                <Link
                  href={logoHref}
                  className="flex items-center flex-shrink-0"
                  aria-label="ReadyLayer Home"
                >
                  <picture>
                    <source srcSet="/logo-header.webp" type="image/webp" />
                    <Image
                      src="/logo-header.png"
                      alt="ReadyLayer"
                      width={140}
                      height={28}
                      priority
                      className="h-7 w-auto dark:invert"
                    />
                  </picture>
                </Link>

                {/* Desktop Navigation */}
                <ul className="hidden md:flex items-center gap-1 list-none">
                  {(user ? NAV_ITEMS : PUBLIC_NAV_ITEMS).map((item) => (
                    <li key={item.href}>
                      <NavLink href={item.href} label={item.label} variant="desktop" />
                    </li>
                  ))}
                </ul>

                {/* Mobile Menu Toggle */}
                <MobileNav navItems={user ? NAV_ITEMS : PUBLIC_NAV_ITEMS} homeHref={logoHref} />
              </div>

              {/* Right Actions */}
              {!loading && (
                <div className="flex items-center gap-3 flex-shrink-0">
                  <ThemeToggle />
                  {user ? (
                    <>
                      <span className="text-sm font-display font-medium text-text-muted hidden sm:inline truncate max-w-xs">
                        {user.user_metadata?.full_name || user.email}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSignOut}
                        aria-label="Sign out"
                        className="flex-shrink-0"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button asChild variant="default" size="sm" className="flex-shrink-0">
                      <Link href="/auth/signin">
                        <Github className="h-4 w-4 mr-2" />
                        Sign in
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Container>
        </motion.nav>
      )}
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
