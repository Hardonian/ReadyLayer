-- ============================================
-- Supabase SQL Migration
-- Generated from Prisma Schema
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Core Tables
-- ============================================

-- User Table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- User Profile Table
CREATE TABLE IF NOT EXISTS "UserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "username" TEXT NOT NULL UNIQUE,
    "displayName" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "bannerUrl" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experiencePoints" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UserProfile_username_idx" ON "UserProfile"("username");
CREATE INDEX IF NOT EXISTS "UserProfile_userId_idx" ON "UserProfile"("userId");

-- User Stats Table
CREATE TABLE IF NOT EXISTS "UserStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "prsReviewed" INTEGER NOT NULL DEFAULT 0,
    "issuesCaught" INTEGER NOT NULL DEFAULT 0,
    "testsGenerated" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "securityIssuesCaught" INTEGER NOT NULL DEFAULT 0,
    "highIssuesCaught" INTEGER NOT NULL DEFAULT 0,
    "mediumIssuesCaught" INTEGER NOT NULL DEFAULT 0,
    "lowIssuesCaught" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UserStats_userId_idx" ON "UserStats"("userId");

-- Badge Definitions Table
CREATE TABLE IF NOT EXISTS "Badge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "criteria" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Badge_category_idx" ON "Badge"("category");
CREATE INDEX IF NOT EXISTS "Badge_tier_idx" ON "Badge"("tier");

-- User Badges Table
CREATE TABLE IF NOT EXISTS "UserBadge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 100,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserBadge_userId_badgeId_key" UNIQUE ("userId", "badgeId")
);

CREATE INDEX IF NOT EXISTS "UserBadge_userId_idx" ON "UserBadge"("userId");
CREATE INDEX IF NOT EXISTS "UserBadge_badgeId_idx" ON "UserBadge"("badgeId");

-- Achievement Definitions Table
CREATE TABLE IF NOT EXISTS "Achievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "icon" TEXT,
    "criteria" JSONB NOT NULL,
    "rewardPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Achievement_category_idx" ON "Achievement"("category");

-- User Achievements Table
CREATE TABLE IF NOT EXISTS "UserAchievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "earnedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserAchievement_userId_achievementId_key" UNIQUE ("userId", "achievementId")
);

CREATE INDEX IF NOT EXISTS "UserAchievement_userId_idx" ON "UserAchievement"("userId");
CREATE INDEX IF NOT EXISTS "UserAchievement_achievementId_idx" ON "UserAchievement"("achievementId");

-- Leaderboards Table
CREATE TABLE IF NOT EXISTS "Leaderboard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeId" TEXT,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Leaderboard_type_scope_period_idx" ON "Leaderboard"("type", "scope", "period");
CREATE INDEX IF NOT EXISTS "Leaderboard_periodStart_periodEnd_idx" ON "Leaderboard"("periodStart", "periodEnd");

-- Leaderboard Rankings Table
CREATE TABLE IF NOT EXISTS "LeaderboardRanking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leaderboardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DECIMAL(10,2) NOT NULL,
    "metadata" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaderboardRanking_leaderboardId_fkey" FOREIGN KEY ("leaderboardId") REFERENCES "Leaderboard"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LeaderboardRanking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LeaderboardRanking_leaderboardId_userId_key" UNIQUE ("leaderboardId", "userId")
);

CREATE INDEX IF NOT EXISTS "LeaderboardRanking_leaderboardId_idx" ON "LeaderboardRanking"("leaderboardId");
CREATE INDEX IF NOT EXISTS "LeaderboardRanking_userId_idx" ON "LeaderboardRanking"("userId");
CREATE INDEX IF NOT EXISTS "LeaderboardRanking_rank_idx" ON "LeaderboardRanking"("rank");

-- User Streaks Table
CREATE TABLE IF NOT EXISTS "UserStreak" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserStreak_userId_type_key" UNIQUE ("userId", "type")
);

CREATE INDEX IF NOT EXISTS "UserStreak_userId_idx" ON "UserStreak"("userId");
CREATE INDEX IF NOT EXISTS "UserStreak_type_idx" ON "UserStreak"("type");

-- Streak History Table
CREATE TABLE IF NOT EXISTS "StreakHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "streakType" TEXT NOT NULL,
    "activityDate" DATE NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StreakHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StreakHistory_userId_streakType_activityDate_key" UNIQUE ("userId", "streakType", "activityDate")
);

CREATE INDEX IF NOT EXISTS "StreakHistory_userId_streakType_idx" ON "StreakHistory"("userId", "streakType");
CREATE INDEX IF NOT EXISTS "StreakHistory_activityDate_idx" ON "StreakHistory"("activityDate");

-- User Follows Table
CREATE TABLE IF NOT EXISTS "UserFollow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "followerId" TEXT NOT NULL,
    "followeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserFollow_followeeId_fkey" FOREIGN KEY ("followeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserFollow_followerId_followeeId_key" UNIQUE ("followerId", "followeeId")
);

CREATE INDEX IF NOT EXISTS "UserFollow_followerId_idx" ON "UserFollow"("followerId");
CREATE INDEX IF NOT EXISTS "UserFollow_followeeId_idx" ON "UserFollow"("followeeId");

-- Kudos Table
CREATE TABLE IF NOT EXISTS "Kudos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT,
    "contextType" TEXT,
    "contextId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Kudos_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Kudos_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Kudos_fromUserId_idx" ON "Kudos"("fromUserId");
CREATE INDEX IF NOT EXISTS "Kudos_toUserId_idx" ON "Kudos"("toUserId");
CREATE INDEX IF NOT EXISTS "Kudos_type_idx" ON "Kudos"("type");

-- Insights Table
CREATE TABLE IF NOT EXISTS "Insight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "sharesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Insight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Insight_userId_idx" ON "Insight"("userId");
CREATE INDEX IF NOT EXISTS "Insight_category_idx" ON "Insight"("category");
CREATE INDEX IF NOT EXISTS "Insight_createdAt_idx" ON "Insight"("createdAt");

-- Insight Interactions Table
CREATE TABLE IF NOT EXISTS "InsightInteraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "insightId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InsightInteraction_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "Insight"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InsightInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InsightInteraction_insightId_userId_type_key" UNIQUE ("insightId", "userId", "type")
);

CREATE INDEX IF NOT EXISTS "InsightInteraction_insightId_idx" ON "InsightInteraction"("insightId");
CREATE INDEX IF NOT EXISTS "InsightInteraction_userId_idx" ON "InsightInteraction"("userId");

-- Teams Table
CREATE TABLE IF NOT EXISTS "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Team_slug_idx" ON "Team"("slug");

-- Team Members Table
CREATE TABLE IF NOT EXISTS "TeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamMember_teamId_userId_key" UNIQUE ("teamId", "userId")
);

CREATE INDEX IF NOT EXISTS "TeamMember_teamId_idx" ON "TeamMember"("teamId");
CREATE INDEX IF NOT EXISTS "TeamMember_userId_idx" ON "TeamMember"("userId");

-- Challenges Table
CREATE TABLE IF NOT EXISTS "Challenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "goal" JSONB NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Challenge_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Challenge_teamId_idx" ON "Challenge"("teamId");
CREATE INDEX IF NOT EXISTS "Challenge_status_idx" ON "Challenge"("status");
CREATE INDEX IF NOT EXISTS "Challenge_startDate_endDate_idx" ON "Challenge"("startDate", "endDate");

-- Challenge Participants Table
CREATE TABLE IF NOT EXISTS "ChallengeParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "progress" JSONB,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChallengeParticipant_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChallengeParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChallengeParticipant_challengeId_userId_key" UNIQUE ("challengeId", "userId")
);

CREATE INDEX IF NOT EXISTS "ChallengeParticipant_challengeId_idx" ON "ChallengeParticipant"("challengeId");
CREATE INDEX IF NOT EXISTS "ChallengeParticipant_userId_idx" ON "ChallengeParticipant"("userId");

-- Pair Sessions Table
CREATE TABLE IF NOT EXISTS "PairSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "initiatorId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "prId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PairSession_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PairSession_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PairSession_initiatorId_idx" ON "PairSession"("initiatorId");
CREATE INDEX IF NOT EXISTS "PairSession_partnerId_idx" ON "PairSession"("partnerId");
CREATE INDEX IF NOT EXISTS "PairSession_status_idx" ON "PairSession"("status");

-- Pull Requests Table
CREATE TABLE IF NOT EXISTS "PullRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PullRequest_repository_number_idx" ON "PullRequest"("repository", "number");
CREATE INDEX IF NOT EXISTS "PullRequest_authorId_idx" ON "PullRequest"("authorId");

-- Team Reviews Table
CREATE TABLE IF NOT EXISTS "TeamReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamReview_prId_fkey" FOREIGN KEY ("prId") REFERENCES "PullRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TeamReview_prId_idx" ON "TeamReview"("prId");
CREATE INDEX IF NOT EXISTS "TeamReview_reviewerId_idx" ON "TeamReview"("reviewerId");
CREATE INDEX IF NOT EXISTS "TeamReview_status_idx" ON "TeamReview"("status");

-- Review Votes Table
CREATE TABLE IF NOT EXISTS "ReviewVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vote" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewVote_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "TeamReview"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReviewVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReviewVote_reviewId_userId_key" UNIQUE ("reviewId", "userId")
);

CREATE INDEX IF NOT EXISTS "ReviewVote_reviewId_idx" ON "ReviewVote"("reviewId");
CREATE INDEX IF NOT EXISTS "ReviewVote_userId_idx" ON "ReviewVote"("userId");

-- ============================================
-- Functions for UpdatedAt Timestamps
-- ============================================

-- Function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updatedAt columns
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_userprofile_updated_at BEFORE UPDATE ON "UserProfile"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_userstats_updated_at BEFORE UPDATE ON "UserStats"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_userbadge_updated_at BEFORE UPDATE ON "UserBadge"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_userachievement_updated_at BEFORE UPDATE ON "UserAchievement"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaderboardranking_updated_at BEFORE UPDATE ON "LeaderboardRanking"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_userstreak_updated_at BEFORE UPDATE ON "UserStreak"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insight_updated_at BEFORE UPDATE ON "Insight"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_updated_at BEFORE UPDATE ON "Team"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenge_updated_at BEFORE UPDATE ON "Challenge"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pairsession_updated_at BEFORE UPDATE ON "PairSession"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pullrequest_updated_at BEFORE UPDATE ON "PullRequest"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teamreview_updated_at BEFORE UPDATE ON "TeamReview"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Seed Data (Optional)
-- ============================================

-- Insert initial badges (from seed.ts)
INSERT INTO "Badge" ("id", "code", "name", "description", "category", "tier", "icon", "color", "criteria", "createdAt")
VALUES 
    (
        gen_random_uuid()::TEXT,
        'security_sentinel',
        'Security Sentinel',
        'Caught 100+ security vulnerabilities',
        'security',
        'gold',
        '🔒',
        '#FFD700',
        '{"securityIssuesCaught": 100}'::JSONB,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid()::TEXT,
        'code_quality_master',
        'Code Quality Master',
        'Maintained 95%+ code quality score for 30 days',
        'quality',
        'gold',
        '⭐',
        '#FFD700',
        '{"qualityScore": 95}'::JSONB,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid()::TEXT,
        'test_champion',
        'Test Champion',
        'Generated 500+ tests',
        'testing',
        'gold',
        '🧪',
        '#FFD700',
        '{"testsGenerated": 500}'::JSONB,
        CURRENT_TIMESTAMP
    )
ON CONFLICT ("code") DO NOTHING;

-- ============================================
-- Migration Complete
-- ============================================
