import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, teamId } = body

    const recommendations: Array<{
      type: string
      title: string
      description: string
      priority: 'high' | 'medium' | 'low'
    }> = []

    if (teamId) {
      const teamStats = await prisma.userStats.findMany({
        where: {
          user: {
            teamMembers: {
              some: { teamId },
            },
          },
        },
      })

      const avgQualityScore =
        teamStats.reduce((sum: number, stat: { qualityScore: number | string | { toNumber(): number } }) => {
          const score = typeof stat.qualityScore === 'number' ? stat.qualityScore : typeof stat.qualityScore === 'string' ? Number(stat.qualityScore) : stat.qualityScore.toNumber()
          return sum + score
        }, 0) /
        teamStats.length

      if (avgQualityScore < 85) {
        recommendations.push({
          type: 'team_quality',
          title: 'Improve Team Quality Score',
          description: 'Your team\'s average quality score is below 85%. Consider a team challenge.',
          priority: 'high',
        })
      }
    }

    const userStats = await prisma.userStats.findUnique({
      where: { userId },
    })

    if (userStats) {
      if (userStats.securityIssuesCaught === 0) {
        recommendations.push({
          type: 'security_review',
          title: 'Add Security Review',
          description: 'Consider adding security review for authentication-related code.',
          priority: 'medium',
        })
      }

      if (userStats.testsGenerated < 10) {
        recommendations.push({
          type: 'test_coverage',
          title: 'Increase Test Coverage',
          description: 'API endpoints often lack tests. Consider generating more tests.',
          priority: 'medium',
        })
      }
    }

    return NextResponse.json({ recommendations })
  } catch (error) {
    console.error('Error generating recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}
