'use client'

import React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

export interface OptimizedImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  priority?: boolean
  loading?: 'lazy' | 'eager'
  sizes?: string
  quality?: number
}

/**
 * Optimized Image Component
 *
 * Principles:
 * - Uses Next.js Image for automatic optimization
 * - Explicit width/height to prevent CLS
 * - Lazy loading by default (non-critical images)
 * - WebP/AVIF formats via Next.js image config
 * - Proper sizes attribute for responsive images
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  loading = 'lazy',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  quality = 80,
}: OptimizedImageProps): React.JSX.Element {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn('max-w-full h-auto', className)}
      priority={priority}
      loading={loading}
      sizes={sizes}
      quality={quality}
      decoding="async"
    />
  )
}

/**
 * Responsive Image with srcset support for custom domains
 * Use this when images are served from external sources or /public
 */
export function ResponsiveImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  loading = 'lazy',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
}: Omit<OptimizedImageProps, 'quality'>): React.JSX.Element {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      loading={loading}
      sizes={sizes}
    />
  )
}

/**
 * Decorative Image
 * For purely decorative images that should be ignored by screen readers
 */
export function DecorativeImage({
  src,
  width,
  height,
  className,
  priority = false,
  loading = 'lazy',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
}: Omit<OptimizedImageProps, 'alt'>): React.JSX.Element {
  return (
    <OptimizedImage
      src={src}
      alt=""
      width={width}
      height={height}
      className={className}
      priority={priority}
      loading={loading}
      sizes={sizes}
    />
  )
}

/**
 * Empty State Illustration
 * Pre-configured for empty state images (decorative)
 */
export function EmptyStateIllustration({
  src,
  width = 400,
  height = 300,
  className,
}: {
  src: string
  width?: number
  height?: number
  className?: string
}): React.JSX.Element {
  return (
    <DecorativeImage
      src={src}
      width={width}
      height={height}
      className={cn('mb-6 opacity-90', className)}
      loading="lazy"
    />
  )
}

/**
 * Error State Illustration
 * Pre-configured for error state images (informative, has alt text)
 */
export function ErrorStateIllustration({
  src,
  alt,
  width = 400,
  height = 320,
  className,
}: {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
}): React.JSX.Element {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn('mb-6', className)}
      loading="eager"
    />
  )
}

/**
 * Hero Image
 * Pre-configured for hero section images
 */
export function HeroImage({
  src,
  alt,
  width = 800,
  height = 600,
  className,
  priority = true,
}: {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}): React.JSX.Element {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn('w-full h-auto rounded-xl shadow-lg', className)}
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
      sizes="(max-width: 768px) 100vw, 50vw"
    />
  )
}

/**
 * Feature Icon Illustration
 * Small illustrations for feature cards
 */
export function FeatureIllustration({
  src,
  alt,
  width = 240,
  height = 180,
  className,
}: {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
}): React.JSX.Element {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn('w-full h-auto rounded-lg mb-4', className)}
      loading="lazy"
      sizes="(max-width: 768px) 50vw, 25vw"
    />
  )
}
