"""ML features builder handler - Compute and store features for scoring/eval jobs.

This handler computes machine learning features from repository data
and stores them for use by scoring and evaluation jobs. Features are
versioned and tenant-scoped for reproducibility.

Deterministic: Same inputs produce identical feature vectors.
Idempotent: Re-running with same (tenant_id, subject_id, version) updates existing.
Tenant-scoped: Features are isolated per tenant.
"""

import json
import hashlib
from typing import Dict, List, Optional, Any, Set
from datetime import datetime, timedelta
from dataclasses import dataclass

from src.handlers.base import BaseHandler, JobResult, register_handler
from src.database import get_cursor
from src.utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class FeatureVector:
    """A computed feature vector for a subject."""
    name: str
    value: float
    metadata: Optional[dict] = None


@register_handler
class MLFeaturesBuildHandler(BaseHandler):
    """Handler for ml.features.build job type.

    Computes and stores ML features for repositories or other subjects.
    Features are used by scoring jobs to compute readiness scores.

    Real tables connected:
    - Repository: Source of repo metadata
    - Review: Review guard features
    - TestRun: CI/CD stability features
    - Test: Test coverage features
    - Violation: Security posture features
    - Doc: Documentation sync features
    - job_results: Stores computed feature vectors
    """

    job_type = "ml.features.build"

    # Supported feature categories
    FEATURE_CATEGORIES = [
        "review_health",
        "test_coverage",
        "ci_stability",
        "security_posture",
        "doc_sync",
        "activity",
        "composite",
    ]

    def validate_payload(self, payload: dict) -> dict:
        """Validate ml.features.build payload.

        Expected payload:
            - tenant_id (organization_id): str - Organization to build features for
            - subject_type: str - Type of subject ('repository', 'organization')
            - subject_id: str - ID of the subject
            - feature_categories: list (optional) - Categories to compute (default: all)
            - lookback_days: int (optional) - Days of history to analyze (default: 30)
            - feature_version: str (optional) - Version string for reproducibility (default: 'v1')
            - dry_run: bool (optional) - Preview without storing (default: False)
            - store_in_db: bool (optional) - Persist to job_results (default: True)
        """
        required = ["tenant_id", "subject_type", "subject_id"]
        for field in required:
            if field not in payload:
                raise ValueError(f"Missing required field: {field}")

        # Validate subject type
        valid_types = ["repository", "organization"]
        if payload["subject_type"] not in valid_types:
            raise ValueError(
                f"Invalid subject_type: {payload['subject_type']}. "
                f"Must be one of: {valid_types}"
            )

        # Validate feature categories
        categories = payload.get("feature_categories", self.FEATURE_CATEGORIES)
        invalid = [c for c in categories if c not in self.FEATURE_CATEGORIES]
        if invalid:
            raise ValueError(f"Invalid feature categories: {invalid}")

        payload["feature_categories"] = categories

        # Validate lookback
        lookback = payload.get("lookback_days", 30)
        if not isinstance(lookback, int) or lookback < 1 or lookback > 365:
            raise ValueError(f"lookback_days must be between 1 and 365")
        payload["lookback_days"] = lookback

        # Set defaults
        payload["feature_version"] = payload.get("feature_version", "v1")
        payload["dry_run"] = payload.get("dry_run", False)
        payload["store_in_db"] = payload.get("store_in_db", True)

        return payload

    def execute(self, payload: dict, context: dict) -> JobResult:
        """Execute ML feature building.

        Args:
            payload: Validated payload with feature parameters
            context: Execution context with worker_id

        Returns:
            JobResult with computed features
        """
        tenant_id = payload["tenant_id"]
        subject_type = payload["subject_type"]
        subject_id = payload["subject_id"]
        categories = payload["feature_categories"]
        lookback_days = payload["lookback_days"]
        feature_version = payload["feature_version"]
        dry_run = payload["dry_run"]
        store_in_db = payload["store_in_db"]

        logger.info(
            "Starting ML feature build",
            tenant_id=tenant_id,
            subject_type=subject_type,
            subject_id=subject_id,
            categories=categories,
            version=feature_version,
        )

        try:
            with get_cursor() as cursor:
                since_date = datetime.now() - timedelta(days=lookback_days)

                # Compute features by category
                all_features = []

                if "review_health" in categories:
                    features = self._compute_review_features(
                        cursor, tenant_id, subject_type, subject_id, since_date
                    )
                    all_features.extend(features)

                if "test_coverage" in categories:
                    features = self._compute_test_coverage_features(
                        cursor, tenant_id, subject_type, subject_id, since_date
                    )
                    all_features.extend(features)

                if "ci_stability" in categories:
                    features = self._compute_ci_stability_features(
                        cursor, tenant_id, subject_type, subject_id, since_date
                    )
                    all_features.extend(features)

                if "security_posture" in categories:
                    features = self._compute_security_features(
                        cursor, tenant_id, subject_type, subject_id, since_date
                    )
                    all_features.extend(features)

                if "doc_sync" in categories:
                    features = self._compute_doc_features(
                        cursor, tenant_id, subject_type, subject_id, since_date
                    )
                    all_features.extend(features)

                if "activity" in categories:
                    features = self._compute_activity_features(
                        cursor, tenant_id, subject_type, subject_id, since_date
                    )
                    all_features.extend(features)

                if "composite" in categories:
                    features = self._compute_composite_features(all_features)
                    all_features.extend(features)

                # Build feature vector dict
                feature_vector = {
                    f.name: {
                        "value": f.value,
                        "metadata": f.metadata,
                    }
                    for f in all_features
                }

                # Compute hash for idempotency
                feature_hash = self._compute_hash(feature_vector)

                # Store if requested and not dry run
                if store_in_db and not dry_run:
                    self._store_features(
                        cursor, tenant_id, subject_type, subject_id,
                        feature_version, feature_vector, feature_hash
                    )

                result_data = {
                    "tenant_id": tenant_id,
                    "subject_type": subject_type,
                    "subject_id": subject_id,
                    "feature_version": feature_version,
                    "computed_at": datetime.now().isoformat(),
                    "lookback_days": lookback_days,
                    "feature_count": len(all_features),
                    "feature_hash": feature_hash,
                    "dry_run": dry_run,
                    "stored": store_in_db and not dry_run,
                    "worker_id": context.get("worker_id"),
                    "features": feature_vector,
                }

                logger.info(
                    "ML feature build complete",
                    tenant_id=tenant_id,
                    subject_id=subject_id,
                    feature_count=len(all_features),
                    version=feature_version,
                )

                return JobResult(
                    success=True,
                    data=result_data,
                    artifacts={
                        "feature_names": [f.name for f in all_features],
                        "feature_hash": feature_hash,
                    }
                )

        except Exception as e:
            logger.error(
                "ML feature build failed",
                tenant_id=tenant_id,
                subject_id=subject_id,
                error=str(e),
                exc_info=True,
            )
            return JobResult(
                success=False,
                error=f"ML feature build failed: {str(e)}",
            )

    def _compute_hash(self, data: dict) -> str:
        """Compute deterministic hash of feature vector."""
        content = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def _store_features(self, cursor, tenant_id: str, subject_type: str,
                        subject_id: str, version: str, features: dict,
                        feature_hash: str) -> None:
        """Store features in job_results table (idempotent)."""
        feature_id = f"features_{tenant_id}_{subject_type}_{subject_id}_{version}"

        cursor.execute(
            """
            INSERT INTO job_results (job_id, result, created_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (job_id) DO UPDATE
            SET result = EXCLUDED.result,
                created_at = EXCLUDED.created_at
            """,
            (
                feature_id,
                json.dumps({
                    "tenant_id": tenant_id,
                    "subject_type": subject_type,
                    "subject_id": subject_id,
                    "version": version,
                    "features": features,
                    "hash": feature_hash,
                    "stored_at": datetime.now().isoformat(),
                }),
            ),
        )

        logger.info(
            "Stored feature vector",
            feature_id=feature_id,
            tenant_id=tenant_id,
            version=version,
        )

    def _compute_review_features(self, cursor, tenant_id: str, subject_type: str,
                                  subject_id: str, since_date: datetime) -> List[FeatureVector]:
        """Compute review guard related features."""
        if subject_type == "repository":
            cursor.execute(
                """
                SELECT
                    COUNT(*) as total_reviews,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed,
                    COUNT(*) FILTER (WHERE "isBlocked" = true) as blocked,
                    COALESCE(AVG((summary->>'total_issues')::int), 0) as avg_issues,
                    COALESCE(AVG((summary->>'critical')::int + (summary->>'high')::int), 0) as avg_severe
                FROM "Review"
                WHERE "repositoryId" = %s
                  AND "createdAt" >= %s
                """,
                (subject_id, since_date),
            )
        else:  # organization
            cursor.execute(
                """
                SELECT
                    COUNT(*) as total_reviews,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed,
                    COUNT(*) FILTER (WHERE "isBlocked" = true) as blocked,
                    COALESCE(AVG((summary->>'total_issues')::int), 0) as avg_issues,
                    COALESCE(AVG((summary->>'critical')::int + (summary->>'high')::int), 0) as avg_severe
                FROM "Review"
                WHERE "organizationId" = %s
                  AND "createdAt" >= %s
                """,
                (tenant_id, since_date),
            )

        row = cursor.fetchone()
        total = row["total_reviews"] or 0
        blocked = row["blocked"] or 0
        avg_issues = float(row["avg_issues"] or 0)
        avg_severe = float(row["avg_severe"] or 0)

        features = []

        # Feature: Review count (normalized log scale)
        features.append(FeatureVector(
            "review_count_log",
            min(10.0, total / 10.0),  # Cap at 10 for 100+ reviews
            {"raw_count": total}
        ))

        # Feature: Block rate
        block_rate = (blocked / total * 100) if total > 0 else 0
        features.append(FeatureVector(
            "review_block_rate",
            round(block_rate, 2),
            {"blocked": blocked, "total": total}
        ))

        # Feature: Average issues per review
        features.append(FeatureVector(
            "review_avg_issues",
            round(avg_issues, 2),
        ))

        # Feature: Severe issue ratio
        severe_ratio = (avg_severe / avg_issues * 100) if avg_issues > 0 else 0
        features.append(FeatureVector(
            "review_severe_ratio",
            round(severe_ratio, 2),
        ))

        return features

    def _compute_test_coverage_features(self, cursor, tenant_id: str, subject_type: str,
                                         subject_id: str, since_date: datetime) -> List[FeatureVector]:
        """Compute test coverage related features."""
        if subject_type == "repository":
            cursor.execute(
                """
                SELECT
                    COUNT(*) as total_tests,
                    COUNT(*) FILTER (WHERE status = 'generated') as generated,
                    COALESCE(AVG((coverage->>'total')::numeric), 0) as avg_coverage
                FROM "Test"
                WHERE "repositoryId" = %s
                  AND "createdAt" >= %s
                """,
                (subject_id, since_date),
            )
        else:
            cursor.execute(
                """
                SELECT
                    COUNT(*) as total_tests,
                    COUNT(*) FILTER (WHERE status = 'generated') as generated,
                    COALESCE(AVG((coverage->>'total')::numeric), 0) as avg_coverage
                FROM "Test" t
                JOIN "Repository" r ON t."repositoryId" = r.id
                WHERE r."organizationId" = %s
                  AND t."createdAt" >= %s
                """,
                (tenant_id, since_date),
            )

        row = cursor.fetchone()
        total = row["total_tests"] or 0
        generated = row["generated"] or 0
        avg_coverage = float(row["avg_coverage"] or 0)

        features = []

        # Feature: Coverage percentage (direct value)
        features.append(FeatureVector(
            "test_coverage_pct",
            round(avg_coverage, 2),
        ))

        # Feature: Test generation ratio
        gen_ratio = (generated / total * 100) if total > 0 else 0
        features.append(FeatureVector(
            "test_generation_ratio",
            round(gen_ratio, 2),
            {"generated": generated, "total": total}
        ))

        # Feature: Test count (log scale)
        features.append(FeatureVector(
            "test_count_log",
            min(10.0, total / 50.0),
            {"raw_count": total}
        ))

        return features

    def _compute_ci_stability_features(self, cursor, tenant_id: str, subject_type: str,
                                        subject_id: str, since_date: datetime) -> List[FeatureVector]:
        """Compute CI/CD stability features."""
        if subject_type == "repository":
            cursor.execute(
                """
                SELECT
                    COUNT(*) as total_runs,
                    COUNT(*) FILTER (WHERE conclusion = 'success') as success,
                    COUNT(*) FILTER (WHERE conclusion = 'failure') as failure,
                    AVG("executionDurationMs") as avg_duration
                FROM "TestRun"
                WHERE "repositoryId" = %s
                  AND "createdAt" >= %s
                """,
                (subject_id, since_date),
            )
        else:
            cursor.execute(
                """
                SELECT
                    COUNT(*) as total_runs,
                    COUNT(*) FILTER (WHERE conclusion = 'success') as success,
                    COUNT(*) FILTER (WHERE conclusion = 'failure') as failure,
                    AVG("executionDurationMs") as avg_duration
                FROM "TestRun" t
                JOIN "Repository" r ON t."repositoryId" = r.id
                WHERE r."organizationId" = %s
                  AND t."createdAt" >= %s
                """,
                (tenant_id, since_date),
            )

        row = cursor.fetchone()
        total = row["total_runs"] or 0
        success = row["success"] or 0
        failure = row["failure"] or 0
        avg_duration = float(row["avg_duration"] or 0)

        features = []

        # Feature: Success rate
        success_rate = (success / total * 100) if total > 0 else 50
        features.append(FeatureVector(
            "ci_success_rate",
            round(success_rate, 2),
            {"success": success, "total": total}
        ))

        # Feature: Run frequency (runs per day)
        days = 30  # lookback
        run_freq = total / days
        features.append(FeatureVector(
            "ci_run_frequency",
            round(run_freq, 2),
        ))

        # Feature: Average duration (normalized, minutes)
        duration_min = avg_duration / 60000 if avg_duration else 0
        features.append(FeatureVector(
            "ci_avg_duration_min",
            round(duration_min, 2),
        ))

        return features

    def _compute_security_features(self, cursor, tenant_id: str, subject_type: str,
                                    subject_id: str, since_date: datetime) -> List[FeatureVector]:
        """Compute security posture features."""
        if subject_type == "repository":
            cursor.execute(
                """
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE severity = 'critical') as critical,
                    COUNT(*) FILTER (WHERE severity = 'high') as high,
                    COUNT(*) FILTER (WHERE severity = 'medium') as medium,
                    COUNT(*) FILTER (WHERE severity = 'low') as low
                FROM "Violation"
                WHERE "repositoryId" = %s
                  AND "detectedAt" >= %s
                """,
                (subject_id, since_date),
            )
        else:
            cursor.execute(
                """
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE severity = 'critical') as critical,
                    COUNT(*) FILTER (WHERE severity = 'high') as high,
                    COUNT(*) FILTER (WHERE severity = 'medium') as medium,
                    COUNT(*) FILTER (WHERE severity = 'low') as low
                FROM "Violation" v
                JOIN "Repository" r ON v."repositoryId" = r.id
                WHERE r."organizationId" = %s
                  AND v."detectedAt" >= %s
                """,
                (tenant_id, since_date),
            )

        row = cursor.fetchone()
        total = row["total"] or 0
        critical = row["critical"] or 0
        high = row["high"] or 0
        medium = row["medium"] or 0
        low = row["low"] or 0

        features = []

        # Feature: Weighted violation score (critical=10, high=5, medium=2, low=1)
        weighted = critical * 10 + high * 5 + medium * 2 + low
        features.append(FeatureVector(
            "security_weighted_score",
            weighted,
            {"by_severity": {"critical": critical, "high": high, "medium": medium, "low": low}}
        ))

        # Feature: Critical violation ratio
        critical_ratio = (critical / total * 100) if total > 0 else 0
        features.append(FeatureVector(
            "security_critical_ratio",
            round(critical_ratio, 2),
        ))

        # Feature: Has critical (binary)
        features.append(FeatureVector(
            "security_has_critical",
            1.0 if critical > 0 else 0.0,
        ))

        return features

    def _compute_doc_features(self, cursor, tenant_id: str, subject_type: str,
                               subject_id: str, since_date: datetime) -> List[FeatureVector]:
        """Compute documentation sync features."""
        if subject_type == "repository":
            cursor.execute(
                """
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'published') as published,
                    COUNT(*) FILTER (WHERE "driftDetected" = true) as drifted
                FROM "Doc"
                WHERE "repositoryId" = %s
                  AND "createdAt" >= %s
                """,
                (subject_id, since_date),
            )
        else:
            cursor.execute(
                """
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'published') as published,
                    COUNT(*) FILTER (WHERE "driftDetected" = true) as drifted
                FROM "Doc" d
                JOIN "Repository" r ON d."repositoryId" = r.id
                WHERE r."organizationId" = %s
                  AND d."createdAt" >= %s
                """,
                (tenant_id, since_date),
            )

        row = cursor.fetchone()
        total = row["total"] or 0
        published = row["published"] or 0
        drifted = row["drifted"] or 0

        features = []

        # Feature: Publish rate
        pub_rate = (published / total * 100) if total > 0 else 0
        features.append(FeatureVector(
            "doc_publish_rate",
            round(pub_rate, 2),
        ))

        # Feature: Drift rate
        drift_rate = (drifted / total * 100) if total > 0 else 0
        features.append(FeatureVector(
            "doc_drift_rate",
            round(drift_rate, 2),
        ))

        # Feature: Has documentation (binary)
        features.append(FeatureVector(
            "doc_exists",
            1.0 if total > 0 else 0.0,
        ))

        return features

    def _compute_activity_features(self, cursor, tenant_id: str, subject_type: str,
                                    subject_id: str, since_date: datetime) -> List[FeatureVector]:
        """Compute recent activity features."""
        recent_date = datetime.now() - timedelta(days=7)

        if subject_type == "repository":
            cursor.execute(
                """
                SELECT
                    (SELECT COUNT(*) FROM "Review"
                     WHERE "repositoryId" = %s AND "createdAt" >= %s) as recent_reviews,
                    (SELECT COUNT(*) FROM "TestRun"
                     WHERE "repositoryId" = %s AND "createdAt" >= %s) as recent_runs
                """,
                (subject_id, recent_date, subject_id, recent_date),
            )
        else:
            cursor.execute(
                """
                SELECT
                    (SELECT COUNT(*) FROM "Review"
                     WHERE "organizationId" = %s AND "createdAt" >= %s) as recent_reviews,
                    (SELECT COUNT(*) FROM "TestRun" t
                     JOIN "Repository" r ON t."repositoryId" = r.id
                     WHERE r."organizationId" = %s AND t."createdAt" >= %s) as recent_runs
                """,
                (tenant_id, recent_date, tenant_id, recent_date),
            )

        row = cursor.fetchone()
        reviews = row["recent_reviews"] or 0
        runs = row["recent_runs"] or 0

        features = []

        # Feature: Recent activity score (combines reviews and runs)
        activity_score = min(100, reviews * 5 + runs * 10)
        features.append(FeatureVector(
            "activity_score",
            round(activity_score, 2),
            {"reviews_7d": reviews, "runs_7d": runs}
        ))

        # Feature: Has recent activity (binary)
        features.append(FeatureVector(
            "activity_has_recent",
            1.0 if (reviews + runs) > 0 else 0.0,
        ))

        return features

    def _compute_composite_features(self, existing_features: List[FeatureVector]) -> List[FeatureVector]:
        """Compute composite features from existing features."""
        feature_dict = {f.name: f.value for f in existing_features}
        features = []

        # Composite: Overall health (average of key health indicators)
        health_components = [
            feature_dict.get("ci_success_rate", 50),
            100 - feature_dict.get("security_weighted_score", 0) * 2,  # Invert and scale
            feature_dict.get("doc_publish_rate", 0),
            100 - feature_dict.get("review_block_rate", 0),  # Invert
        ]
        health_score = sum(health_components) / len(health_components)
        features.append(FeatureVector(
            "composite_health",
            round(health_score, 2),
            {"components": health_components}
        ))

        # Composite: Risk score (higher = more risky)
        risk_components = [
            feature_dict.get("security_weighted_score", 0) * 5,
            feature_dict.get("review_block_rate", 0),
            feature_dict.get("security_critical_ratio", 0),
        ]
        risk_score = min(100, sum(risk_components) / 3)
        features.append(FeatureVector(
            "composite_risk",
            round(risk_score, 2),
        ))

        return features
