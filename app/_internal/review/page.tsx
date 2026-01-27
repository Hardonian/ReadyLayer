import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getSupabaseUserId } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import ReviewClient from './review-client'

export const metadata: Metadata = {
  title: 'Internal Review',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      'max-snippet': 0,
      'max-image-preview': 'none',
      'max-video-preview': 0,
    },
  },
}

function isInternalReviewEnabled(): boolean {
  // Explicitly disabled in production unless enabled for controlled access.
  if (process.env.VERCEL_ENV === 'preview') return true
  if (process.env.NODE_ENV !== 'production') return true
  return process.env.INTERNAL_REVIEW_ENABLED === 'true'
}

export default async function InternalReviewPage(): Promise<React.JSX.Element> {
  if (!isInternalReviewEnabled()) {
    notFound()
  }

  const userId = await getSupabaseUserId()
  if (!userId) {
    redirect('/auth/signin?callbackUrl=/_internal/review')
  }

  // Restrict access to org owners only (write-capable by policy).
  const ownerMembership = await prisma.organizationMember.findFirst({
    where: { userId, role: 'owner' },
    select: { organizationId: true },
  })
  if (!ownerMembership) {
    notFound()
  }

  return <ReviewClient />
}

