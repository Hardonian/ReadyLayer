import { prisma } from '@/lib/prisma'
import type { Decimal } from '@prisma/client/runtime/library'

export class GamificationService {
  async checkBadgeEligibility(userId: string, badgeId: string): Promise<boolean> {
    const badge = await prisma.badge.findUnique({
      where: { id: badgeId },
    })

    if (!badge) return false

    const userStats = await prisma.userStats.findUnique({
      where: { userId },
    })

    if (!userStats) return false

    return this.evaluateCriteria(badge.criteria as Record<string, unknown>, userStats)
  }

  async awardBadge(userId: string, badgeId: string): Promise<void> {
    const existingBadge = await prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId,
          badgeId,
        },
      },
    })

    if (existingBadge) return

    await prisma.userBadge.create({
      data: {
        userId,
        badgeId,
        progress: 100,
      },
    })

    // Update user level/XP if needed
    await this.updateUserLevel(userId)
  }

  async updateBadgeProgress(userId: string, badgeId: string, progress: number): Promise<void> {
    await prisma.userBadge.upsert({
      where: {
        userId_badgeId: {
          userId,
          badgeId,
        },
      },
      create: {
        userId,
        badgeId,
        progress: Math.min(100, Math.max(0, progress)),
      },
      update: {
        progress: Math.min(100, Math.max(0, progress)),
      },
    })

    if (progress >= 100) {
      await this.awardBadge(userId, badgeId)
    }
  }

  async updateStreak(userId: string, type: string, activityDate: Date = new Date()): Promise<void> {
    const existingStreak = await prisma.userStreak.findUnique({
      where: {
        userId_type: {
          userId,
          type,
        },
      },
    })

    const today = new Date(activityDate)
    today.setHours(0, 0, 0, 0)

    if (!existingStreak) {
      await prisma.userStreak.create({
        data: {
          userId,
          type,
          currentStreak: 1,
          longestStreak: 1,
          lastActivityDate: today,
        },
      })

      await prisma.streakHistory.create({
        data: {
          userId,
          streakType: type,
          activityDate: today,
          completed: true,
        },
      })
      return
    }

    const lastActivity = existingStreak.lastActivityDate
      ? new Date(existingStreak.lastActivityDate)
      : null
    lastActivity?.setHours(0, 0, 0, 0)

    const daysDiff = lastActivity
      ? Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    let newStreak = existingStreak.currentStreak
    let newLongestStreak = existingStreak.longestStreak

    if (daysDiff === 1) {
      newStreak = existingStreak.currentStreak + 1
      newLongestStreak = Math.max(existingStreak.longestStreak, newStreak)
    } else if (daysDiff > 1) {
      newStreak = 1
    }

    await prisma.userStreak.update({
      where: {
        userId_type: {
          userId,
          type,
        },
      },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastActivityDate: today,
      },
    })

    await prisma.streakHistory.upsert({
      where: {
        userId_streakType_activityDate: {
          userId,
          streakType: type,
          activityDate: today,
        },
      },
      create: {
        userId,
        streakType: type,
        activityDate: today,
        completed: true,
      },
      update: {
        completed: true,
      },
    })
  }

  async updateLeaderboard(
    leaderboardId: string,
    userId: string,
    score: number
  ): Promise<void> {
    const leaderboard = await prisma.leaderboard.findUnique({
      where: { id: leaderboardId },
      include: {
        rankings: {
          orderBy: { score: 'desc' },
        },
      },
    })

    if (!leaderboard) return

    const existingRanking = leaderboard.rankings.find((r: { userId: string }) => r.userId === userId)
    type Ranking = { userId: string; score: number | Decimal }
    const newRankings: Array<{ userId: string; score: number }> = existingRanking
      ? leaderboard.rankings.map((r: Ranking) =>
          r.userId === userId ? { userId: r.userId, score } : { userId: r.userId, score: typeof r.score === 'number' ? r.score : Number(r.score) }
        )
      : [...leaderboard.rankings.map((r: Ranking) => ({ userId: r.userId, score: typeof r.score === 'number' ? r.score : Number(r.score) })), { userId, score }]

    newRankings.sort((a: { score: number }, b: { score: number }) => b.score - a.score)

    for (let i = 0; i < newRankings.length; i++) {
      const ranking = newRankings[i]
      await prisma.leaderboardRanking.upsert({
        where: {
          leaderboardId_userId: {
            leaderboardId,
            userId: ranking.userId,
          },
        },
        create: {
          leaderboardId,
          userId: ranking.userId,
          rank: i + 1,
          score: ranking.score,
        },
        update: {
          rank: i + 1,
          score: ranking.score,
        },
      })
    }
  }

  private evaluateCriteria(
    criteria: Record<string, unknown>,
    stats: {
      securityIssuesCaught: number
      issuesCaught: number
      testsGenerated: number
      qualityScore: number | string | Decimal | { toNumber(): number }
    }
  ): boolean {
    for (const [key, value] of Object.entries(criteria)) {
      switch (key) {
        case 'securityIssuesCaught':
          if (stats.securityIssuesCaught < (value as number)) return false
          break
        case 'issuesCaught':
          if (stats.issuesCaught < (value as number)) return false
          break
        case 'testsGenerated':
          if (stats.testsGenerated < (value as number)) return false
          break
        case 'qualityScore':
          if (Number(stats.qualityScore) < (value as number)) return false
          break
        default:
          break
      }
    }
    return true
  }

  private async updateUserLevel(userId: string): Promise<void> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    })

    if (!profile) return

    const newXP = profile.experiencePoints + 100
    const newLevel = Math.floor(newXP / 1000) + 1

    await prisma.userProfile.update({
      where: { userId },
      data: {
        experiencePoints: newXP,
        level: newLevel,
      },
    })
  }
}

export const gamificationService = new GamificationService()
