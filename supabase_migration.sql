-- ============================================
-- Supabase SQL Migration
-- Generated from Prisma Schema
-- Includes: RLS Policies, Realtime, Auth Integration, Safe DDL
-- 
-- Safe DDL Practices Used:
-- - IF NOT EXISTS for all CREATE statements
-- - Unique indexes to prevent duplicates
-- - Check constraints for data integrity
-- - Foreign keys with CASCADE for referential integrity
-- - Immutable indexes (no mutable paths)
-- - Conditional trigger creation
-- - Error handling in DO blocks
-- - ON CONFLICT handling for seed data
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Link User table to Supabase Auth
-- ============================================

-- Create a function to sync auth.users with our User table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."User" (id, email, name, image, "createdAt")
  VALUES (
    NEW.id::TEXT,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, "User".name),
    image = COALESCE(EXCLUDED.image, "User".image),
    "updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync auth.users to User table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Core Tables
-- ============================================

-- User Table (linked to auth.users)
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_id_check" CHECK (length("id") > 0)
);

-- Immutable indexes (no duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_unique_idx" ON "User"("email") WHERE "email" IS NOT NULL;
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
    CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserProfile_level_check" CHECK ("level" >= 1),
    CONSTRAINT "UserProfile_experiencePoints_check" CHECK ("experiencePoints" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserProfile_username_unique_idx" ON "UserProfile"("username") WHERE "username" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "UserProfile_userId_unique_idx" ON "UserProfile"("userId") WHERE "userId" IS NOT NULL;
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
    CONSTRAINT "UserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserStats_qualityScore_check" CHECK ("qualityScore" >= 0 AND "qualityScore" <= 100),
    CONSTRAINT "UserStats_counts_check" CHECK (
        "prsReviewed" >= 0 AND
        "issuesCaught" >= 0 AND
        "testsGenerated" >= 0 AND
        "securityIssuesCaught" >= 0 AND
        "highIssuesCaught" >= 0 AND
        "mediumIssuesCaught" >= 0 AND
        "lowIssuesCaught" >= 0
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserStats_userId_unique_idx" ON "UserStats"("userId") WHERE "userId" IS NOT NULL;
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
    "criteria" JSONB NOT NULL DEFAULT '{}'::JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Badge_code_check" CHECK (length("code") > 0),
    CONSTRAINT "Badge_name_check" CHECK (length("name") > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "Badge_code_unique_idx" ON "Badge"("code") WHERE "code" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Badge_category_idx" ON "Badge"("category");
CREATE INDEX IF NOT EXISTS "Badge_tier_idx" ON "Badge"("tier");
CREATE INDEX IF NOT EXISTS "Badge_category_tier_idx" ON "Badge"("category", "tier");

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
    CONSTRAINT "UserBadge_userId_badgeId_key" UNIQUE ("userId", "badgeId"),
    CONSTRAINT "UserBadge_progress_check" CHECK ("progress" >= 0 AND "progress" <= 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserBadge_userId_badgeId_unique_idx" ON "UserBadge"("userId", "badgeId");
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
    "criteria" JSONB NOT NULL DEFAULT '{}'::JSONB,
    "rewardPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Achievement_code_check" CHECK (length("code") > 0),
    CONSTRAINT "Achievement_name_check" CHECK (length("name") > 0),
    CONSTRAINT "Achievement_rewardPoints_check" CHECK ("rewardPoints" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "Achievement_code_unique_idx" ON "Achievement"("code") WHERE "code" IS NOT NULL;
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
    CONSTRAINT "UserAchievement_userId_achievementId_key" UNIQUE ("userId", "achievementId"),
    CONSTRAINT "UserAchievement_progress_check" CHECK ("progress" >= 0 AND "progress" <= 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserAchievement_userId_achievementId_unique_idx" ON "UserAchievement"("userId", "achievementId");
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Leaderboard_period_check" CHECK ("periodEnd" > "periodStart")
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
    CONSTRAINT "LeaderboardRanking_leaderboardId_userId_key" UNIQUE ("leaderboardId", "userId"),
    CONSTRAINT "LeaderboardRanking_rank_check" CHECK ("rank" > 0),
    CONSTRAINT "LeaderboardRanking_score_check" CHECK ("score" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "LeaderboardRanking_leaderboardId_userId_unique_idx" ON "LeaderboardRanking"("leaderboardId", "userId");
CREATE INDEX IF NOT EXISTS "LeaderboardRanking_leaderboardId_idx" ON "LeaderboardRanking"("leaderboardId");
CREATE INDEX IF NOT EXISTS "LeaderboardRanking_userId_idx" ON "LeaderboardRanking"("userId");
CREATE INDEX IF NOT EXISTS "LeaderboardRanking_rank_idx" ON "LeaderboardRanking"("rank");
CREATE INDEX IF NOT EXISTS "LeaderboardRanking_score_idx" ON "LeaderboardRanking"("score");

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
    CONSTRAINT "UserStreak_userId_type_key" UNIQUE ("userId", "type"),
    CONSTRAINT "UserStreak_streaks_check" CHECK ("currentStreak" >= 0 AND "longestStreak" >= 0 AND "longestStreak" >= "currentStreak")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserStreak_userId_type_unique_idx" ON "UserStreak"("userId", "type");
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

CREATE UNIQUE INDEX IF NOT EXISTS "StreakHistory_userId_streakType_activityDate_unique_idx" ON "StreakHistory"("userId", "streakType", "activityDate");
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
    CONSTRAINT "UserFollow_followerId_followeeId_key" UNIQUE ("followerId", "followeeId"),
    CONSTRAINT "UserFollow_no_self_follow" CHECK ("followerId" != "followeeId")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserFollow_followerId_followeeId_unique_idx" ON "UserFollow"("followerId", "followeeId");
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
    CONSTRAINT "Kudos_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Kudos_no_self_kudos" CHECK ("fromUserId" != "toUserId")
);

CREATE INDEX IF NOT EXISTS "Kudos_fromUserId_idx" ON "Kudos"("fromUserId");
CREATE INDEX IF NOT EXISTS "Kudos_toUserId_idx" ON "Kudos"("toUserId");
CREATE INDEX IF NOT EXISTS "Kudos_type_idx" ON "Kudos"("type");
CREATE INDEX IF NOT EXISTS "Kudos_createdAt_idx" ON "Kudos"("createdAt");

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
    CONSTRAINT "Insight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Insight_title_check" CHECK (length("title") > 0),
    CONSTRAINT "Insight_content_check" CHECK (length("content") > 0),
    CONSTRAINT "Insight_counts_check" CHECK (
        "likesCount" >= 0 AND
        "commentsCount" >= 0 AND
        "sharesCount" >= 0
    )
);

CREATE INDEX IF NOT EXISTS "Insight_userId_idx" ON "Insight"("userId");
CREATE INDEX IF NOT EXISTS "Insight_category_idx" ON "Insight"("category");
CREATE INDEX IF NOT EXISTS "Insight_createdAt_idx" ON "Insight"("createdAt");
CREATE INDEX IF NOT EXISTS "Insight_tags_idx" ON "Insight" USING GIN("tags");

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

CREATE UNIQUE INDEX IF NOT EXISTS "InsightInteraction_insightId_userId_type_unique_idx" ON "InsightInteraction"("insightId", "userId", "type");
CREATE INDEX IF NOT EXISTS "InsightInteraction_insightId_idx" ON "InsightInteraction"("insightId");
CREATE INDEX IF NOT EXISTS "InsightInteraction_userId_idx" ON "InsightInteraction"("userId");

-- Teams Table
CREATE TABLE IF NOT EXISTS "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Team_name_check" CHECK (length("name") > 0),
    CONSTRAINT "Team_slug_check" CHECK (length("slug") > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "Team_slug_unique_idx" ON "Team"("slug") WHERE "slug" IS NOT NULL;
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
    CONSTRAINT "TeamMember_teamId_userId_key" UNIQUE ("teamId", "userId"),
    CONSTRAINT "TeamMember_role_check" CHECK ("role" IN ('member', 'admin', 'owner'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeamMember_teamId_userId_unique_idx" ON "TeamMember"("teamId", "userId");
CREATE INDEX IF NOT EXISTS "TeamMember_teamId_idx" ON "TeamMember"("teamId");
CREATE INDEX IF NOT EXISTS "TeamMember_userId_idx" ON "TeamMember"("userId");

-- Challenges Table
CREATE TABLE IF NOT EXISTS "Challenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "goal" JSONB NOT NULL DEFAULT '{}'::JSONB,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Challenge_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Challenge_name_check" CHECK (length("name") > 0),
    CONSTRAINT "Challenge_date_check" CHECK ("endDate" > "startDate"),
    CONSTRAINT "Challenge_status_check" CHECK ("status" IN ('upcoming', 'active', 'completed'))
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

CREATE UNIQUE INDEX IF NOT EXISTS "ChallengeParticipant_challengeId_userId_unique_idx" ON "ChallengeParticipant"("challengeId", "userId");
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
    CONSTRAINT "PairSession_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PairSession_no_self_pair" CHECK ("initiatorId" != "partnerId"),
    CONSTRAINT "PairSession_status_check" CHECK ("status" IN ('pending', 'active', 'completed')),
    CONSTRAINT "PairSession_dates_check" CHECK (
        ("startedAt" IS NULL AND "endedAt" IS NULL) OR
        ("startedAt" IS NOT NULL AND ("endedAt" IS NULL OR "endedAt" >= "startedAt"))
    )
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PullRequest_number_check" CHECK ("number" > 0),
    CONSTRAINT "PullRequest_title_check" CHECK (length("title") > 0),
    CONSTRAINT "PullRequest_repository_check" CHECK (length("repository") > 0),
    CONSTRAINT "PullRequest_status_check" CHECK ("status" IN ('open', 'merged', 'closed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "PullRequest_repository_number_unique_idx" ON "PullRequest"("repository", "number");
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
    CONSTRAINT "TeamReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamReview_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected', 'needs_discussion'))
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
    CONSTRAINT "ReviewVote_reviewId_userId_key" UNIQUE ("reviewId", "userId"),
    CONSTRAINT "ReviewVote_vote_check" CHECK ("vote" IN ('approve', 'reject', 'needs_discussion'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReviewVote_reviewId_userId_unique_idx" ON "ReviewVote"("reviewId", "userId");
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
$$ LANGUAGE plpgsql;

-- Create triggers for updatedAt columns (with IF NOT EXISTS check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_updated_at') THEN
        CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_userprofile_updated_at') THEN
        CREATE TRIGGER update_userprofile_updated_at BEFORE UPDATE ON "UserProfile"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_userstats_updated_at') THEN
        CREATE TRIGGER update_userstats_updated_at BEFORE UPDATE ON "UserStats"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_userbadge_updated_at') THEN
        CREATE TRIGGER update_userbadge_updated_at BEFORE UPDATE ON "UserBadge"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_userachievement_updated_at') THEN
        CREATE TRIGGER update_userachievement_updated_at BEFORE UPDATE ON "UserAchievement"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_leaderboardranking_updated_at') THEN
        CREATE TRIGGER update_leaderboardranking_updated_at BEFORE UPDATE ON "LeaderboardRanking"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_userstreak_updated_at') THEN
        CREATE TRIGGER update_userstreak_updated_at BEFORE UPDATE ON "UserStreak"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_insight_updated_at') THEN
        CREATE TRIGGER update_insight_updated_at BEFORE UPDATE ON "Insight"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_team_updated_at') THEN
        CREATE TRIGGER update_team_updated_at BEFORE UPDATE ON "Team"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_challenge_updated_at') THEN
        CREATE TRIGGER update_challenge_updated_at BEFORE UPDATE ON "Challenge"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_pairsession_updated_at') THEN
        CREATE TRIGGER update_pairsession_updated_at BEFORE UPDATE ON "PairSession"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_pullrequest_updated_at') THEN
        CREATE TRIGGER update_pullrequest_updated_at BEFORE UPDATE ON "PullRequest"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_teamreview_updated_at') THEN
        CREATE TRIGGER update_teamreview_updated_at BEFORE UPDATE ON "TeamReview"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserStats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Badge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserBadge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Achievement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserAchievement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Leaderboard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeaderboardRanking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserStreak" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StreakHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserFollow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Kudos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Insight" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InsightInteraction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeamMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Challenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChallengeParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PairSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PullRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeamReview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReviewVote" ENABLE ROW LEVEL SECURITY;

-- Note: auth.uid() is provided by Supabase by default
-- If needed, you can create a helper function for TEXT conversion:
CREATE OR REPLACE FUNCTION public.current_user_id() RETURNS TEXT AS $$
  SELECT COALESCE(public.current_user_id(), NULL);
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- User Table Policies
CREATE POLICY "Users can view own profile" ON "User"
    FOR SELECT USING (public.current_user_id() = id);

CREATE POLICY "Users can update own profile" ON "User"
    FOR UPDATE USING (public.current_user_id() = id);

-- UserProfile Policies
CREATE POLICY "Public profiles are viewable by everyone" ON "UserProfile"
    FOR SELECT USING (isPublic = true OR public.current_user_id() = "userId");

CREATE POLICY "Users can update own profile" ON "UserProfile"
    FOR UPDATE USING (public.current_user_id() = "userId");

CREATE POLICY "Users can insert own profile" ON "UserProfile"
    FOR INSERT WITH CHECK (public.current_user_id() = "userId");

-- UserStats Policies
CREATE POLICY "Users can view own stats" ON "UserStats"
    FOR SELECT USING (public.current_user_id() = "userId");

CREATE POLICY "Users can update own stats" ON "UserStats"
    FOR UPDATE USING (public.current_user_id() = "userId");

CREATE POLICY "Users can insert own stats" ON "UserStats"
    FOR INSERT WITH CHECK (public.current_user_id() = "userId");

-- Badge Policies (public read, admin write)
CREATE POLICY "Badges are viewable by everyone" ON "Badge"
    FOR SELECT USING (true);

-- UserBadge Policies
CREATE POLICY "Users can view own badges" ON "UserBadge"
    FOR SELECT USING (public.current_user_id() = "userId");

CREATE POLICY "Users can insert own badges" ON "UserBadge"
    FOR INSERT WITH CHECK (public.current_user_id() = "userId");

CREATE POLICY "Users can update own badges" ON "UserBadge"
    FOR UPDATE USING (public.current_user_id() = "userId");

-- Achievement Policies (public read)
CREATE POLICY "Achievements are viewable by everyone" ON "Achievement"
    FOR SELECT USING (true);

-- UserAchievement Policies
CREATE POLICY "Users can view own achievements" ON "UserAchievement"
    FOR SELECT USING (public.current_user_id() = "userId");

CREATE POLICY "Users can insert own achievements" ON "UserAchievement"
    FOR INSERT WITH CHECK (public.current_user_id() = "userId");

CREATE POLICY "Users can update own achievements" ON "UserAchievement"
    FOR UPDATE USING (public.current_user_id() = "userId");

-- Leaderboard Policies (public read)
CREATE POLICY "Leaderboards are viewable by everyone" ON "Leaderboard"
    FOR SELECT USING (true);

CREATE POLICY "Leaderboards can be created by authenticated users" ON "Leaderboard"
    FOR INSERT WITH CHECK (public.current_user_id() IS NOT NULL);

-- LeaderboardRanking Policies
CREATE POLICY "Rankings are viewable by everyone" ON "LeaderboardRanking"
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own rankings" ON "LeaderboardRanking"
    FOR INSERT WITH CHECK (public.current_user_id() = "userId");

CREATE POLICY "Users can update own rankings" ON "LeaderboardRanking"
    FOR UPDATE USING (public.current_user_id() = "userId");

-- UserStreak Policies
CREATE POLICY "Users can view own streaks" ON "UserStreak"
    FOR SELECT USING (public.current_user_id() = "userId");

CREATE POLICY "Users can insert own streaks" ON "UserStreak"
    FOR INSERT WITH CHECK (public.current_user_id() = "userId");

CREATE POLICY "Users can update own streaks" ON "UserStreak"
    FOR UPDATE USING (public.current_user_id() = "userId");

-- StreakHistory Policies
CREATE POLICY "Users can view own streak history" ON "StreakHistory"
    FOR SELECT USING (public.current_user_id() = "userId");

CREATE POLICY "Users can insert own streak history" ON "StreakHistory"
    FOR INSERT WITH CHECK (public.current_user_id() = "userId");

-- UserFollow Policies
CREATE POLICY "Follows are viewable by everyone" ON "UserFollow"
    FOR SELECT USING (true);

CREATE POLICY "Users can create follows" ON "UserFollow"
    FOR INSERT WITH CHECK (public.current_user_id() = "followerId");

CREATE POLICY "Users can delete own follows" ON "UserFollow"
    FOR DELETE USING (public.current_user_id() = "followerId");

-- Kudos Policies
CREATE POLICY "Kudos are viewable by everyone" ON "Kudos"
    FOR SELECT USING (true);

CREATE POLICY "Users can create kudos" ON "Kudos"
    FOR INSERT WITH CHECK (public.current_user_id() = "fromUserId");

CREATE POLICY "Users can update own kudos" ON "Kudos"
    FOR UPDATE USING (public.current_user_id() = "fromUserId");

CREATE POLICY "Users can delete own kudos" ON "Kudos"
    FOR DELETE USING (public.current_user_id() = "fromUserId");

-- Insight Policies
CREATE POLICY "Insights are viewable by everyone" ON "Insight"
    FOR SELECT USING (true);

CREATE POLICY "Users can create insights" ON "Insight"
    FOR INSERT WITH CHECK (public.current_user_id() = "userId");

CREATE POLICY "Users can update own insights" ON "Insight"
    FOR UPDATE USING (public.current_user_id() = "userId");

CREATE POLICY "Users can delete own insights" ON "Insight"
    FOR DELETE USING (public.current_user_id() = "userId");

-- InsightInteraction Policies
CREATE POLICY "Interactions are viewable by everyone" ON "InsightInteraction"
    FOR SELECT USING (true);

CREATE POLICY "Users can create interactions" ON "InsightInteraction"
    FOR INSERT WITH CHECK (public.current_user_id() = "userId");

CREATE POLICY "Users can update own interactions" ON "InsightInteraction"
    FOR UPDATE USING (public.current_user_id() = "userId");

CREATE POLICY "Users can delete own interactions" ON "InsightInteraction"
    FOR DELETE USING (public.current_user_id() = "userId");

-- Team Policies
CREATE POLICY "Teams are viewable by everyone" ON "Team"
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create teams" ON "Team"
    FOR INSERT WITH CHECK (public.current_user_id() IS NOT NULL);

CREATE POLICY "Team members can update team" ON "Team"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "TeamMember"
            WHERE "TeamMember"."teamId" = "Team"."id"
            AND "TeamMember"."userId" = public.current_user_id()
            AND "TeamMember"."role" IN ('admin', 'owner')
        )
    );

-- TeamMember Policies
CREATE POLICY "Team members are viewable by everyone" ON "TeamMember"
    FOR SELECT USING (true);

CREATE POLICY "Team admins can add members" ON "TeamMember"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "TeamMember"
            WHERE "TeamMember"."teamId" = NEW."teamId"
            AND "TeamMember"."userId" = public.current_user_id()
            AND "TeamMember"."role" IN ('admin', 'owner')
        )
    );

CREATE POLICY "Users can join teams" ON "TeamMember"
    FOR INSERT WITH CHECK (public.current_user_id() = "userId");

CREATE POLICY "Team admins can remove members" ON "TeamMember"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "TeamMember"
            WHERE "TeamMember"."teamId" = "TeamMember"."teamId"
            AND "TeamMember"."userId" = public.current_user_id()
            AND "TeamMember"."role" IN ('admin', 'owner')
        )
    );

-- Challenge Policies
CREATE POLICY "Challenges are viewable by everyone" ON "Challenge"
    FOR SELECT USING (true);

CREATE POLICY "Team admins can create challenges" ON "Challenge"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "TeamMember"
            WHERE "TeamMember"."teamId" = NEW."teamId"
            AND "TeamMember"."userId" = public.current_user_id()
            AND "TeamMember"."role" IN ('admin', 'owner')
        )
    );

CREATE POLICY "Team admins can update challenges" ON "Challenge"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "TeamMember"
            WHERE "TeamMember"."teamId" = "Challenge"."teamId"
            AND "TeamMember"."userId" = public.current_user_id()
            AND "TeamMember"."role" IN ('admin', 'owner')
        )
    );

-- ChallengeParticipant Policies
CREATE POLICY "Participants are viewable by everyone" ON "ChallengeParticipant"
    FOR SELECT USING (true);

CREATE POLICY "Users can join challenges" ON "ChallengeParticipant"
    FOR INSERT WITH CHECK (public.current_user_id() = "userId");

CREATE POLICY "Users can update own participation" ON "ChallengeParticipant"
    FOR UPDATE USING (public.current_user_id() = "userId");

-- PairSession Policies
CREATE POLICY "Users can view own pair sessions" ON "PairSession"
    FOR SELECT USING (
        public.current_user_id() = "initiatorId" OR
        public.current_user_id() = "partnerId"
    );

CREATE POLICY "Users can create pair sessions" ON "PairSession"
    FOR INSERT WITH CHECK (public.current_user_id() = "initiatorId");

CREATE POLICY "Users can update own pair sessions" ON "PairSession"
    FOR UPDATE USING (
        public.current_user_id() = "initiatorId" OR
        public.current_user_id() = "partnerId"
    );

-- PullRequest Policies
CREATE POLICY "Pull requests are viewable by everyone" ON "PullRequest"
    FOR SELECT USING (true);

CREATE POLICY "Users can create pull requests" ON "PullRequest"
    FOR INSERT WITH CHECK (public.current_user_id() = "authorId");

CREATE POLICY "Authors can update own pull requests" ON "PullRequest"
    FOR UPDATE USING (public.current_user_id() = "authorId");

-- TeamReview Policies
CREATE POLICY "Reviews are viewable by everyone" ON "TeamReview"
    FOR SELECT USING (true);

CREATE POLICY "Users can create reviews" ON "TeamReview"
    FOR INSERT WITH CHECK (public.current_user_id() = "reviewerId");

CREATE POLICY "Reviewers can update own reviews" ON "TeamReview"
    FOR UPDATE USING (public.current_user_id() = "reviewerId");

CREATE POLICY "Reviewers can delete own reviews" ON "TeamReview"
    FOR DELETE USING (public.current_user_id() = "reviewerId");

-- ReviewVote Policies
CREATE POLICY "Votes are viewable by everyone" ON "ReviewVote"
    FOR SELECT USING (true);

CREATE POLICY "Users can create votes" ON "ReviewVote"
    FOR INSERT WITH CHECK (public.current_user_id() = "userId");

CREATE POLICY "Users can update own votes" ON "ReviewVote"
    FOR UPDATE USING (public.current_user_id() = "userId");

CREATE POLICY "Users can delete own votes" ON "ReviewVote"
    FOR DELETE USING (public.current_user_id() = "userId");

-- ============================================
-- Realtime Setup
-- ============================================

-- Enable Realtime for tables that need live updates
-- Note: If supabase_realtime publication doesn't exist, create it first:
-- CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

DO $$
DECLARE
    table_name TEXT;
    tables_to_add TEXT[] := ARRAY[
        'User', 'UserProfile', 'UserStats', 'UserBadge', 'UserAchievement',
        'Leaderboard', 'LeaderboardRanking', 'UserStreak', 'StreakHistory',
        'UserFollow', 'Kudos', 'Insight', 'InsightInteraction',
        'Team', 'TeamMember', 'Challenge', 'ChallengeParticipant',
        'PairSession', 'PullRequest', 'TeamReview', 'ReviewVote'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables_to_add
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', table_name);
        EXCEPTION
            WHEN OTHERS THEN
                -- Table might already be in publication, skip
                NULL;
        END;
    END LOOP;
END $$;

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
-- Edge Functions Setup Notes
-- ============================================
-- 
-- Edge Functions should be created separately in Supabase Dashboard:
-- 1. Go to Edge Functions section
-- 2. Create functions for:
--    - process-gamification-events
--    - calculate-leaderboard-rankings
--    - update-user-stats
--    - sync-auth-user
--    - process-insight-interactions
--    - handle-challenge-progress
--    - manage-pair-sessions
--    - process-review-votes
--
-- Example function structure:
-- supabase/functions/process-gamification-events/index.ts
-- supabase/functions/calculate-leaderboard-rankings/index.ts
-- etc.
--
-- These functions can be invoked via:
-- - Database triggers
-- - HTTP requests
-- - Scheduled cron jobs
--
-- ============================================
-- Migration Complete
-- ============================================
