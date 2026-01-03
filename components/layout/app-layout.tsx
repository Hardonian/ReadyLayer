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

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)

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

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/live', label: 'Live Ops' },
    { href: '/dashboard/prs', label: 'PRs' },
    { href: '/dashboard/runs', label: 'Runs' },
    { href: '/dashboard/findings', label: 'Findings' },
    { href: '/dashboard/policies', label: 'Policies' },
    { href: '/dashboard/audit', label: 'Audit' },
    { href: '/dashboard/settings', label: 'Settings' },
  ]

  // Don't show nav on auth pages or landing page
  const showNav = !pathname?.startsWith('/auth') && pathname !== '/'

  return (
    <div className="min-h-screen flex flex-col">
      {showNav && (
        <motion.nav
          className="border-b border-border-subtle bg-surface-muted/95 backdrop-blur supports-[backdrop-filter]:bg-surface-muted/60"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          role="navigation"
          aria-label="Main navigation"
        >
          <Container>
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-8 flex-1">
                <Link href="/dashboard" className="flex items-center" aria-label="ReadyLayer Home">
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
                <ul className="hidden md:flex items-center gap-6 list-none">
                  {navItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'text-sm font-medium transition-colors hover:text-text-primary',
                          pathname === item.href
                            ? 'text-text-primary'
                            : 'text-text-muted'
                        )}
                        aria-current={pathname === item.href ? 'page' : undefined}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <MobileNav navItems={navItems} />
              </div>
              {!loading && (
                <div className="flex items-center gap-4">
                  <ThemeToggle />
                  {user ? (
                    <>
                      <span className="text-sm text-muted-foreground hidden sm:inline">
                        {user.user_metadata?.full_name || user.email}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSignOut}
                        aria-label="Sign out"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button asChild variant="default" size="sm">
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
    </div>
  )
}
