import { prisma } from '@/lib/prisma'
import type { Decimal } from '@prisma/client/runtime/library'
import { logger } from '@/lib/logger'

export class GamificationService {
  /**
   * Process code review activity and update gamification
   */
  async processCodeReviewActivity(
    userId: string,
    _stats: {
      issuesCaught: number
      securityIssuesCaught: number
      prsReviewed: number
    }
  ): Promise<void> {
    try {
      // Update streak
      await this.updateStreak(userId, 'code_review')

      // Check for badge eligibility
      await this.checkAndAwardBadges(userId, _stats)

      // Update leaderboards
      await this.updateCodeReviewLeaderboards(userId, _stats)

      logger.info({ userId, stats: _stats }, 'Gamification updated for code review')
    } catch (error) {
      logger.error({ error, userId }, 'Error processing code review gamification')
      // Don't throw - gamification failures shouldn't break reviews
    }
  }

  /**
   * Check and award badges based on code review stats
   */
  async checkAndAwardBadges(
    userId: string,
    _stats: {
      issuesCaught: number
      securityIssuesCaught: number
      prsReviewed: number
    }
  ): Promise<void> {
    const userStats = await prisma.userStats.findUnique({
      where: { userId },
    })

    if (!userStats) return

    // Get all badges related to code review
    const codeReviewBadges = await prisma.badge.findMany({
      where: {
        category: {
          in: ['security', 'quality', 'collaboration'],
        },
      },
    })

    for (const badge of codeReviewBadges) {
      const isEligible = this.evaluateCriteria(
        badge.criteria as Record<string, unknown>,
        userStats
      )

      if (isEligible) {
        await this.awardBadge(userId, badge.id)
      }
    }
  }

  /**
   * Update code review leaderboards
   */
  async updateCodeReviewLeaderboards(
    userId: string,
    stats: {
      issuesCaught: number
      securityIssuesCaught: number
      prsReviewed: number
    }
  ): Promise<void> {
    // Update security leaderboard
    const securityLeaderboard = await this.getOrCreateLeaderboard(
      'security',
      'global',
      'all-time'
    )
    if (securityLeaderboard) {
      await this.updateLeaderboard(
        securityLeaderboard.id,
        userId,
        stats.securityIssuesCaught
      )
    }

    // Update quality leaderboard
    const qualityLeaderboard = await this.getOrCreateLeaderboard(
      'quality',
      'global',
      'all-time'
    )
    if (qualityLeaderboard) {
      await this.updateLeaderboard(qualityLeaderboard.id, userId, stats.issuesCaught)
    }
  }

  /**
   * Get or create a leaderboard
   */
  async getOrCreateLeaderboard(
    type: string,
    scope: string,
    period: string
  ): Promise<{ id: string } | null> {
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1) // Start of month
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0) // End of month

    if (period === 'all-time') {
      periodStart.setFullYear(2000) // Very early date
      periodEnd.setFullYear(2100) // Very far future
    }

    const leaderboard = await prisma.leaderboard.findFirst({
      where: {
        type,
        scope,
        period,
        periodStart: { lte: now },
        periodEnd: { gte: now },
      },
    })

    if (leaderboard) {
      return { id: leaderboard.id }
    }

    // Create new leaderboard
    const newLeaderboard = await prisma.leaderboard.create({
      data: {
        type,
        scope,
        period,
        scopeId: null,
        periodStart,
        periodEnd,
      },
    })

    return { id: newLeaderboard.id }
  }
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
    // Use transaction for atomic leaderboard update
    await prisma.$transaction(async (tx) => {
      const leaderboard = await tx.leaderboard.findUnique({
        where: { id: leaderboardId },
        include: {
          rankings: {
            orderBy: { score: 'desc' },
          },
        },
      })

      if (!leaderboard) return

      const existingRanking = leaderboard.rankings.find(
        (r: { userId: string }) => r.userId === userId
      )
      type Ranking = { userId: string; score: number | Decimal }
      const newRankings: Array<{ userId: string; score: number }> = existingRanking
        ? leaderboard.rankings.map((r: Ranking) =>
            r.userId === userId
              ? { userId: r.userId, score }
              : {
                  userId: r.userId,
                  score: typeof r.score === 'number' ? r.score : Number(r.score),
                }
          )
        : [
            ...leaderboard.rankings.map((r: Ranking) => ({
              userId: r.userId,
              score: typeof r.score === 'number' ? r.score : Number(r.score),
            })),
            { userId, score },
          ]

      newRankings.sort((a: { score: number }, b: { score: number }) => b.score - a.score)

      // Update all rankings atomically
      for (let i = 0; i < newRankings.length; i++) {
        const ranking = newRankings[i]
        await tx.leaderboardRanking.upsert({
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
    })
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
