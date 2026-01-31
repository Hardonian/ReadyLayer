"""Readiness score handler - Computes readiness metrics from real repo data.

This handler queries actual Review, TestRun, Violation, and Test tables
to compute deterministic readiness scores for repositories.
"""

import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta

from src.handlers.base import BaseHandler, JobResult, register_handler
from src.database import get_cursor
from src.utils.logging import get_logger

logger = get_logger(__name__)


@register_handler
class ReadinessScoreHandler(BaseHandler):
    """Handler for readiness.score job type.
    
    Computes readiness score breakdown based on actual repository data:
    - Review Guard results (violations, issues)
    - Test Engine results (test generation, coverage)
    - Test Run execution (CI/CD test results)
    - Historical violations (security, policy)
    
    Deterministic: Same repo state produces same score.
    Idempotent: Safe to re-run, updates existing records.
    """
    
    job_type = "readiness.score"
    
    # Score weights (deterministic algorithm)
    WEIGHTS = {
        "review_health": 0.25,
        "test_coverage": 0.25,
        "ci_stability": 0.20,
        "security_posture": 0.15,
        "doc_sync": 0.10,
        "activity": 0.05,
    }
    
    def validate_payload(self, payload: dict) -> dict:
        """Validate readiness.score payload.
        
        Expected payload:
            - repository_id: str - Repository to score
            - organization_id: str - For tenant isolation
            - lookback_days: int (optional) - Days of history to analyze (default: 30)
            - store_result: bool (optional) - Store in AggregatedInsight table (default: True)
        """
        required = ["repository_id", "organization_id"]
        for field in required:
            if field not in payload:
                raise ValueError(f"Missing required field: {field}")
        
        # Validate lookback_days
        lookback_days = payload.get("lookback_days", 30)
        if not isinstance(lookback_days, int) or lookback_days < 1 or lookback_days > 365:
            raise ValueError(f"lookback_days must be between 1 and 365, got {lookback_days}")
        
        payload["lookback_days"] = lookback_days
        payload["store_result"] = payload.get("store_result", True)
        
        return payload
    
    def execute(self, payload: dict, context: dict) -> JobResult:
        """Execute readiness score computation.
        
        Args:
            payload: Validated payload with repository_id, organization_id, lookback_days
            context: Execution context with worker_id, correlation_id
        
        Returns:
            JobResult with readiness breakdown and overall score
        """
        repository_id = payload["repository_id"]
        organization_id = payload["organization_id"]
        lookback_days = payload["lookback_days"]
        store_result = payload["store_result"]
        
        logger.info(
            "Starting readiness score computation",
            repository_id=repository_id,
            organization_id=organization_id,
            lookback_days=lookback_days,
        )
        
        try:
            with get_cursor() as cursor:
                # Fetch real data from multiple tables
                since_date = datetime.now() - timedelta(days=lookback_days)
                
                # 1. Review Health Score (from Review table)
                review_health = self._compute_review_health(cursor, repository_id, since_date)
                
                # 2. Test Coverage Score (from Test and TestRun tables)
                test_coverage = self._compute_test_coverage(cursor, repository_id, since_date)
                
                # 3. CI Stability Score (from TestRun table)
                ci_stability = self._compute_ci_stability(cursor, repository_id, since_date)
                
                # 4. Security Posture Score (from Violation table)
                security_posture = self._compute_security_posture(cursor, repository_id, since_date)
                
                # 5. Doc Sync Score (from Doc table)
                doc_sync = self._compute_doc_sync(cursor, repository_id, since_date)
                
                # 6. Activity Score (from Review and TestRun timestamps)
                activity = self._compute_activity(cursor, repository_id, since_date)
                
                # Compute weighted overall score
                overall_score = (
                    review_health["score"] * self.WEIGHTS["review_health"] +
                    test_coverage["score"] * self.WEIGHTS["test_coverage"] +
                    ci_stability["score"] * self.WEIGHTS["ci_stability"] +
                    security_posture["score"] * self.WEIGHTS["security_posture"] +
                    doc_sync["score"] * self.WEIGHTS["doc_sync"] +
                    activity["score"] * self.WEIGHTS["activity"]
                )
                
                # Round to 2 decimal places for determinism
                overall_score = round(overall_score, 2)
                
                # Build result
                result_data = {
                    "repository_id": repository_id,
                    "organization_id": organization_id,
                    "computed_at": datetime.now().isoformat(),
                    "lookback_days": lookback_days,
                    "overall_score": overall_score,
                    "grade": self._score_to_grade(overall_score),
                    "breakdown": {
                        "review_health": review_health,
                        "test_coverage": test_coverage,
                        "ci_stability": ci_stability,
                        "security_posture": security_posture,
                        "doc_sync": doc_sync,
                        "activity": activity,
                    },
                    "weights_used": self.WEIGHTS,
                    "worker_id": context.get("worker_id"),
                }
                
                # Store result in AggregatedInsight table if requested
                if store_result:
                    self._store_insight(cursor, organization_id, repository_id, result_data)
                
                logger.info(
                    "Readiness score computation complete",
                    repository_id=repository_id,
                    overall_score=overall_score,
                    grade=result_data["grade"],
                )
                
                return JobResult(
                    success=True,
                    data=result_data,
                    artifacts={
                        "raw_scores": {
                            "review_health": review_health["score"],
                            "test_coverage": test_coverage["score"],
                            "ci_stability": ci_stability["score"],
                            "security_posture": security_posture["score"],
                            "doc_sync": doc_sync["score"],
                            "activity": activity["score"],
                        }
                    }
                )
                
        except Exception as e:
            logger.error(
                "Readiness score computation failed",
                repository_id=repository_id,
                error=str(e),
                exc_info=True,
            )
            return JobResult(
                success=False,
                error=f"Readiness score computation failed: {str(e)}",
            )
    
    def _compute_review_health(self, cursor, repository_id: str, since_date: datetime) -> dict:
        """Compute review health score from Review table."""
        cursor.execute(
            """
            SELECT 
                COUNT(*) as total_reviews,
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) FILTER (WHERE is_blocked = true) as blocked,
                COALESCE(
                    AVG((summary->>'total_issues')::int) FILTER (WHERE summary IS NOT NULL),
                    0
                ) as avg_issues,
                COALESCE(
                    AVG((summary->>'critical')::int + (summary->>'high')::int) 
                    FILTER (WHERE summary IS NOT NULL),
                    0
                ) as avg_severe_issues
            FROM "Review"
            WHERE "repositoryId" = %s
              AND "createdAt" >= %s
            """,
            (repository_id, since_date),
        )
        row = cursor.fetchone()
        
        total = row["total_reviews"] or 0
        blocked = row["blocked"] or 0
        avg_issues = float(row["avg_issues"] or 0)
        avg_severe = float(row["avg_severe_issues"] or 0)
        
        # Scoring logic (deterministic)
        if total == 0:
            score = 50.0  # Neutral if no data
        else:
            # Base score: fewer severe issues = higher score
            issue_penalty = min(avg_severe * 10, 50)  # Cap at 50 point penalty
            block_penalty = (blocked / total) * 20 if total > 0 else 0
            score = 100 - issue_penalty - block_penalty
            score = max(0, min(100, score))  # Clamp to 0-100
        
        return {
            "score": round(score, 2),
            "total_reviews": total,
            "blocked_reviews": blocked,
            "avg_issues_per_review": round(avg_issues, 2),
            "avg_severe_issues": round(avg_severe, 2),
        }
    
    def _compute_test_coverage(self, cursor, repository_id: str, since_date: datetime) -> dict:
        """Compute test coverage score from Test and TestRun tables."""
        cursor.execute(
            """
            SELECT 
                COUNT(*) FILTER (WHERE status = 'generated') as generated,
                COUNT(*) as total_tests,
                AVG(
                    COALESCE((coverage->>'total')::numeric, 0)
                ) FILTER (WHERE coverage IS NOT NULL) as avg_coverage
            FROM "Test"
            WHERE "repositoryId" = %s
              AND "createdAt" >= %s
            """,
            (repository_id, since_date),
        )
        row = cursor.fetchone()
        
        generated = row["generated"] or 0
        total_tests = row["total_tests"] or 0
        avg_coverage = float(row["avg_coverage"] or 0)
        
        # Also get latest TestRun coverage
        cursor.execute(
            """
            SELECT coverage
            FROM "TestRun"
            WHERE "repositoryId" = %s
              AND conclusion = 'success'
              AND "createdAt" >= %s
            ORDER BY "createdAt" DESC
            LIMIT 1
            """,
            (repository_id, since_date),
        )
        latest_run = cursor.fetchone()
        
        ci_coverage = 0
        if latest_run and latest_run["coverage"]:
            cov = latest_run["coverage"]
            if isinstance(cov, dict):
                ci_coverage = float(cov.get("total", 0))
        
        # Use best of generated or CI coverage
        coverage = max(avg_coverage, ci_coverage)
        
        # Score: coverage % directly maps to score
        score = coverage if coverage > 0 else 30.0  # Default 30 if no coverage data
        
        return {
            "score": round(score, 2),
            "tests_generated": generated,
            "total_tests": total_tests,
            "avg_coverage_pct": round(avg_coverage, 2),
            "latest_ci_coverage_pct": round(ci_coverage, 2),
        }
    
    def _compute_ci_stability(self, cursor, repository_id: str, since_date: datetime) -> dict:
        """Compute CI stability score from TestRun table."""
        cursor.execute(
            """
            SELECT 
                COUNT(*) as total_runs,
                COUNT(*) FILTER (WHERE conclusion = 'success') as success,
                COUNT(*) FILTER (WHERE conclusion = 'failure') as failure,
                COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress')) as pending,
                AVG("executionDurationMs") as avg_duration
            FROM "TestRun"
            WHERE "repositoryId" = %s
              AND "createdAt" >= %s
            """,
            (repository_id, since_date),
        )
        row = cursor.fetchone()
        
        total = row["total_runs"] or 0
        success = row["success"] or 0
        failure = row["failure"] or 0
        
        if total == 0:
            score = 50.0  # Neutral if no CI data
        else:
            success_rate = success / total
            # Score based on success rate with diminishing returns above 95%
            if success_rate >= 0.95:
                score = 95 + (success_rate - 0.95) * 100  # Bonus for >95%
            else:
                score = success_rate * 100
            score = min(100, score)
        
        return {
            "score": round(score, 2),
            "total_runs": total,
            "successful_runs": success,
            "failed_runs": failure,
            "success_rate": round(success / total, 4) if total > 0 else 0,
        }
    
    def _compute_security_posture(self, cursor, repository_id: str, since_date: datetime) -> dict:
        """Compute security posture score from Violation table."""
        cursor.execute(
            """
            SELECT 
                COUNT(*) as total_violations,
                COUNT(*) FILTER (WHERE severity = 'critical') as critical,
                COUNT(*) FILTER (WHERE severity = 'high') as high,
                COUNT(*) FILTER (WHERE severity = 'medium') as medium,
                COUNT(*) FILTER (WHERE severity = 'low') as low
            FROM "Violation"
            WHERE "repositoryId" = %s
              AND "detectedAt" >= %s
            """,
            (repository_id, since_date),
        )
        row = cursor.fetchone()
        
        total = row["total_violations"] or 0
        critical = row["critical"] or 0
        high = row["high"] or 0
        medium = row["medium"] or 0
        low = row["low"] or 0
        
        # Weighted violation score (critical = 10x, high = 5x, medium = 2x, low = 1x)
        weighted_score = critical * 10 + high * 5 + medium * 2 + low
        
        # Base score: 100 minus penalties
        if total == 0:
            score = 100.0  # Perfect if no violations
        else:
            penalty = min(weighted_score * 2, 80)  # Cap penalty at 80 points
            score = 100 - penalty
            score = max(0, score)
        
        return {
            "score": round(score, 2),
            "total_violations": total,
            "by_severity": {
                "critical": critical,
                "high": high,
                "medium": medium,
                "low": low,
            },
            "weighted_violation_score": weighted_score,
        }
    
    def _compute_doc_sync(self, cursor, repository_id: str, since_date: datetime) -> dict:
        """Compute doc sync score from Doc table."""
        cursor.execute(
            """
            SELECT 
                COUNT(*) as total_docs,
                COUNT(*) FILTER (WHERE status = 'generated') as generated,
                COUNT(*) FILTER (WHERE status = 'published') as published,
                COUNT(*) FILTER (WHERE "driftDetected" = true) as drifted,
                MAX("updatedAt") as last_update
            FROM "Doc"
            WHERE "repositoryId" = %s
              AND "createdAt" >= %s
            """,
            (repository_id, since_date),
        )
        row = cursor.fetchone()
        
        total = row["total_docs"] or 0
        published = row["published"] or 0
        drifted = row["drifted"] or 0
        
        if total == 0:
            score = 50.0  # Neutral if no docs
        else:
            # Score based on published % minus drift penalty
            published_rate = published / total
            drift_penalty = (drifted / total) * 20
            score = (published_rate * 100) - drift_penalty
            score = max(0, min(100, score))
        
        return {
            "score": round(score, 2),
            "total_docs": total,
            "published": published,
            "drift_detected": drifted,
        }
    
    def _compute_activity(self, cursor, repository_id: str, since_date: datetime) -> dict:
        """Compute activity score based on recent activity."""
        # Check for activity in last 7 days
        recent_date = datetime.now() - timedelta(days=7)
        
        cursor.execute(
            """
            SELECT 
                (SELECT COUNT(*) FROM "Review" 
                 WHERE "repositoryId" = %s AND "createdAt" >= %s) as recent_reviews,
                (SELECT COUNT(*) FROM "TestRun" 
                 WHERE "repositoryId" = %s AND "createdAt" >= %s) as recent_runs
            """,
            (repository_id, recent_date, repository_id, recent_date),
        )
        row = cursor.fetchone()
        
        reviews = row["recent_reviews"] or 0
        runs = row["recent_runs"] or 0
        
        # Simple activity score: points for recent activity
        score = min(100, (reviews * 5) + (runs * 10))
        
        return {
            "score": round(score, 2),
            "reviews_last_7d": reviews,
            "test_runs_last_7d": runs,
        }
    
    def _score_to_grade(self, score: float) -> str:
        """Convert numeric score to letter grade."""
        if score >= 95:
            return "A+"
        elif score >= 90:
            return "A"
        elif score >= 85:
            return "A-"
        elif score >= 80:
            return "B+"
        elif score >= 75:
            return "B"
        elif score >= 70:
            return "B-"
        elif score >= 65:
            return "C+"
        elif score >= 60:
            return "C"
        elif score >= 50:
            return "D"
        else:
            return "F"
    
    def _store_insight(
        self, 
        cursor, 
        organization_id: str, 
        repository_id: str, 
        result_data: dict
    ) -> None:
        """Store readiness score in AggregatedInsight table (idempotent)."""
        insight_id = f"readiness_{repository_id}_{result_data['computed_at'][:10]}"
        
        cursor.execute(
            """
            INSERT INTO "AggregatedInsight" (
                id, "organizationId", "insightType", confidence, 
                "trustLevel", "dataPoints", "firstSeen", "lastSeen",
                trend, metadata
            ) VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW(), %s, %s)
            ON CONFLICT (id) DO UPDATE
            SET "lastSeen" = NOW(),
                metadata = EXCLUDED.metadata,
                confidence = EXCLUDED.confidence,
                trend = EXCLUDED.trend
            """,
            (
                insight_id,
                organization_id,
                "readiness_score",
                result_data["overall_score"] / 100,  # confidence = score/100
                result_data["overall_score"] / 100,  # trust level = score/100
                result_data["lookback_days"],
                "stable",  # Could compute trend from historical
                json.dumps({
                    "repository_id": repository_id,
                    "overall_score": result_data["overall_score"],
                    "grade": result_data["grade"],
                    "breakdown": result_data["breakdown"],
                    "computed_at": result_data["computed_at"],
                }),
            ),
        )
        
        logger.info(
            "Stored readiness insight",
            insight_id=insight_id,
            repository_id=repository_id,
        )
