import { z } from 'zod'

export const badgeSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(['security', 'quality', 'testing', 'documentation', 'collaboration']),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum', 'diamond']),
  icon: z.string().optional(),
  color: z.string().optional(),
  criteria: z.record(z.unknown()),
})

export const achievementSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  icon: z.string().optional(),
  criteria: z.record(z.unknown()),
  rewardPoints: z.number().int().min(0).default(0),
})

export const kudosSchema = z.object({
  toUserId: z.string().min(1),
  type: z.enum(['great_catch', 'helpful_fix', 'perfect_pr', 'team_player', 'knowledge_share', 'quality_work']),
  message: z.string().optional(),
  contextType: z.string().optional(),
  contextId: z.string().optional(),
})

export const insightSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  category: z.enum(['security', 'quality', 'testing', 'documentation']),
  tags: z.array(z.string()).default([]),
})

export const challengeSchema = z.object({
  teamId: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(['zero_issues', 'coverage', 'security', 'documentation']),
  goal: z.record(z.unknown()),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
})
