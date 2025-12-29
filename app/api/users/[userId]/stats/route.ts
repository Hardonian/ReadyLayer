import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const stats = await prisma.userStats.findUnique({
      where: { userId: params.userId },
    })

    if (!stats) {
      return NextResponse.json(
        { error: 'Stats not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
