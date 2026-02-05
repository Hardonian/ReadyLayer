'use client'

import * as React from 'react'
import Image from 'next/image'
import { useTheme } from 'next-themes'

export interface LogoProps {
  variant?: 'full' | 'mark' | 'word'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Logo component with support for light/dark mode
 * Variants: full (wordmark + mark), mark (symbol only), word (text only)
 */
export function Logo({
  variant = 'full',
  size = 'md',
  className = '',
}: LogoProps): React.JSX.Element {
  const { theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Size mappings for each variant
  const sizeMap = {
    sm: { full: { w: 100, h: 20 }, mark: { w: 24, h: 24 }, word: { w: 80, h: 16 } },
    md: { full: { w: 140, h: 28 }, mark: { w: 32, h: 32 }, word: { w: 110, h: 22 } },
    lg: { full: { w: 200, h: 40 }, mark: { w: 48, h: 48 }, word: { w: 160, h: 32 } },
  }

  const dimensions = sizeMap[size][variant]

  // Only render after hydration to avoid theme mismatch
  if (!mounted) {
    return <div className={`bg-surface-muted rounded ${className}`} style={{ width: dimensions.w, height: dimensions.h }} />
  }

  const isDark = theme === 'dark'

  return (
    <picture className="block max-w-full overflow-visible">
      {variant === 'full' && (
        <>
          <source
            srcSet={isDark ? '/logo-header-dark.webp' : '/logo-header.webp'}
            type="image/webp"
          />
          <Image
            src={isDark ? '/logo-header-dark.png' : '/logo-header.png'}
            alt="ReadyLayer"
            width={dimensions.w}
            height={dimensions.h}
            className={`h-auto max-w-full w-auto ${className}`}
            priority
          />
        </>
      )}
      {variant === 'mark' && (
        <>
          <source srcSet="/logo-mark.svg" type="image/svg+xml" />
          <Image
            src="/logo-mark.svg"
            alt="ReadyLayer"
            width={dimensions.w}
            height={dimensions.h}
            className={`h-auto max-w-full w-auto ${isDark ? 'invert' : ''} ${className}`}
            priority
          />
        </>
      )}
      {variant === 'word' && (
        <>
          <source srcSet="/logo-header.webp" type="image/webp" />
          <Image
            src="/logo-header.png"
            alt="ReadyLayer"
            width={dimensions.w}
            height={dimensions.h}
            className={`h-auto max-w-full w-auto ${isDark ? 'invert' : ''} ${className}`}
            priority
          />
        </>
      )}
    </picture>
  )
}

/**
 * Convenience exports for specific variants
 */
export function LogoFull(props: Omit<LogoProps, 'variant'>): React.JSX.Element {
  return <Logo {...props} variant="full" />
}

export function LogoMark(props: Omit<LogoProps, 'variant'>): React.JSX.Element {
  return <Logo {...props} variant="mark" />
}

export function LogoWord(props: Omit<LogoProps, 'variant'>): React.JSX.Element {
  return <Logo {...props} variant="word" />
}
