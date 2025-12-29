import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const tier = searchParams.get('tier')

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (tier) where.tier = tier

    const badges = await prisma.badge.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ badges })
  } catch (error) {
    console.error('Error fetching badges:', error)
    return NextResponse.json(
      { error: 'Failed to fetch badges' },
      { status: 500 }
    )
  }
}
