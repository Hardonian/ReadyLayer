"""Code review prioritization handler with ML-based impact prediction.

Uses machine learning heuristics and historical data to prioritize
review violations and issues, helping developers focus on highest-impact
fixes first. Reduces noise and improves fix rates.

Deterministic: Same violations produce identical priorities.
Idempotent: Re-running produces same priorities for same inputs.
Tenant-scoped: Priorities are computed per tenant context.
"""

import json
import hashlib
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
from collections import defaultdict

from src.handlers.base import BaseHandler, JobResult, register_handler
from src.database import get_cursor
from src.utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class PrioritizedViolation:
    """A violation with computed priority."""
    violation_id: str
    rule: str
    severity: str
    file_path: str
    line_number: Optional[int]
    
    # Priority scores
    impact_score: float  # 0-1, likelihood of production impact
    effort_score: float  # 0-1, estimated fix effort (lower = easier)
    priority_score: float  # 0-1, combined priority
    
    # ML features
    features: Dict[str, float]
    
    # Explanations
    reasons: List[str]
    recommendations: List[str]
    suggested_order: int


@register_handler
class ReviewPrioritizeHandler(BaseHandler):
    """Handler for review.prioritize job type.
    
    Prioritizes code review violations using ML-based impact prediction:
    - Historical fix rates by rule type
    - Production impact indicators
    - Code context analysis
    - Effort estimation
    - Risk scoring
    
    Real tables connected:
    - Review: Source review with violations
    - Violation: Individual violations to prioritize
    - TestRun: Related test execution data
    - Repository: Code context
    """
    
    job_type = "review.prioritize"
    
    # Priority weights
    IMPACT_WEIGHTS = {
        "security": 0.30,
        "reliability": 0.25,
        "performance": 0.20,
        "maintainability": 0.15,
        "style": 0.10,
    }
    
    # Rule category mappings (simplified - would come from DB in production)
    RULE_CATEGORIES = {
        "sql_injection": "security",
        "xss": "security",
        "hardcoded_secret": "security",
        "unsafe_eval": "security",
        "null_pointer": "reliability",
        "unhandled_exception": "reliability",
        "race_condition": "reliability",
        "n_plus_1_query": "performance",
        "memory_leak": "performance",
        "unused_import": "maintainability",
        "dead_code": "maintainability",
        "long_function": "maintainability",
        "naming_convention": "style",
        "indentation": "style",
    }
    
    # Severity multipliers
    SEVERITY_MULTIPLIERS = {
        "critical": 1.0,
        "high": 0.8,
        "medium": 0.5,
        "low": 0.2,
    }
    
    def validate_payload(self, payload: dict) -> dict:
        """Validate review.prioritize payload.
        
        Expected payload:
            - tenant_id: str - Organization scope
            - review_id: str - Review to prioritize
            - max_items: int (optional) - Max violations to return (default: 50)
            - include_explanation: bool (optional) - Include ML explanations (default: True)
            - strategy: str (optional) - 'impact', 'effort', 'balanced' (default: 'balanced')
            - dry_run: bool (optional) - Preview without storing (default: False)
        """
        required = ["tenant_id", "review_id"]
        for field in required:
            if field not in payload:
                raise ValueError(f"Missing required field: {field}")
        
        # Validate strategy
        valid_strategies = ["impact", "effort", "balanced"]
        strategy = payload.get("strategy", "balanced")
        if strategy not in valid_strategies:
            raise ValueError(f"Invalid strategy: {strategy}. Must be one of: {valid_strategies}")
        payload["strategy"] = strategy
        
        # Validate max_items
        max_items = payload.get("max_items", 50)
        if not 1 <= max_items <= 500:
            raise ValueError(f"max_items must be between 1 and 500, got {max_items}")
        payload["max_items"] = max_items
        
        payload["include_explanation"] = payload.get("include_explanation", True)
        payload["dry_run"] = payload.get("dry_run", False)
        
        return payload
    
    def execute(self, payload: dict, context: dict) -> JobResult:
        """Execute review prioritization.
        
        Args:
            payload: Validated payload with prioritization parameters
            context: Execution context with worker_id
        
        Returns:
            JobResult with prioritized violations
        """
        tenant_id = payload["tenant_id"]
        review_id = payload["review_id"]
        max_items = payload["max_items"]
        strategy = payload["strategy"]
        include_explanation = payload["include_explanation"]
        dry_run = payload["dry_run"]
        
        logger.info(
            "Starting review prioritization",
            tenant_id=tenant_id,
            review_id=review_id,
            strategy=strategy,
            max_items=max_items,
        )
        
        try:
            with get_cursor() as cursor:
                # Fetch review and violations
                review_data = self._fetch_review(cursor, tenant_id, review_id)
                if not review_data:
                    return JobResult(
                        success=False,
                        error=f"Review not found: {review_id} for tenant {tenant_id}",
                    )
                
                violations = self._fetch_violations(cursor, review_id)
                if not violations:
                    logger.info(
                        "No violations to prioritize",
                        review_id=review_id,
                    )
                    return JobResult(
                        success=True,
                        data={
                            "tenant_id": tenant_id,
                            "review_id": review_id,
                            "status": "no_violations",
                            "violations_count": 0,
                            "prioritized": [],
                        }
                    )
                
                # Fetch historical data for ML features
                historical_data = self._fetch_historical_data(
                    cursor, tenant_id, review_data.get("repository_id")
                )
                
                # Compute priorities for each violation
                prioritized = []
                for violation in violations:
                    pv = self._compute_priority(
                        violation, review_data, historical_data, strategy
                    )
                    prioritized.append(pv)
                
                # Sort by priority score (descending)
                prioritized.sort(key=lambda x: x.priority_score, reverse=True)
                
                # Assign suggested order
                for i, pv in enumerate(prioritized, 1):
                    pv.suggested_order = i
                
                # Limit results
                prioritized = prioritized[:max_items]
                
                # Store results if not dry run
                if not dry_run:
                    self._store_prioritization(
                        cursor, tenant_id, review_id, prioritized, strategy
                    )
                
                result_data = {
                    "tenant_id": tenant_id,
                    "review_id": review_id,
                    "repository_id": review_data.get("repository_id"),
                    "strategy": strategy,
                    "violations_count": len(violations),
                    "prioritized_count": len(prioritized),
                    "processed_at": datetime.now().isoformat(),
                    "dry_run": dry_run,
                    "stored": not dry_run,
                    "worker_id": context.get("worker_id"),
                    "prioritized_violations": [
                        {
                            "violation_id": pv.violation_id,
                            "rule": pv.rule,
                            "severity": pv.severity,
                            "file_path": pv.file_path,
                            "line_number": pv.line_number,
                            "priority_score": round(pv.priority_score, 4),
                            "impact_score": round(pv.impact_score, 4) if include_explanation else None,
                            "effort_score": round(pv.effort_score, 4) if include_explanation else None,
                            "suggested_order": pv.suggested_order,
                            "reasons": pv.reasons if include_explanation else None,
                            "recommendations": pv.recommendations,
                        }
                        for pv in prioritized
                    ],
                }
                
                logger.info(
                    "Review prioritization complete",
                    tenant_id=tenant_id,
                    review_id=review_id,
                    violations=len(violations),
                    prioritized=len(prioritized),
                    top_priority=round(prioritized[0].priority_score, 4) if prioritized else 0,
                )
                
                return JobResult(
                    success=True,
                    data=result_data,
                    artifacts={
                        "priority_distribution": self._compute_distribution(prioritized),
                        "category_breakdown": self._category_breakdown(prioritized),
                    }
                )
                
        except Exception as e:
            logger.error(
                "Review prioritization failed",
                tenant_id=tenant_id,
                review_id=review_id,
                error=str(e),
                exc_info=True,
            )
            return JobResult(
                success=False,
                error=f"Review prioritization failed: {str(e)}",
            )
    
    def _fetch_review(self, cursor, tenant_id: str, review_id: str) -> Optional[dict]:
        """Fetch review data."""
        cursor.execute(
            """
            SELECT 
                r.id,
                r."repositoryId",
                r."prNumber",
                r."prSha",
                r.status,
                r."issuesFound",
                r."isBlocked",
                r.summary,
                r."createdAt"
            FROM "Review" r
            WHERE r.id = %s
              AND r."organizationId" = %s
            """,
            (review_id, tenant_id),
        )
        row = cursor.fetchone()
        if row:
            return {
                "id": row["id"],
                "repository_id": row["repositoryId"],
                "pr_number": row["prNumber"],
                "pr_sha": row["prSha"],
                "status": row["status"],
                "issues_found": row["issuesFound"],
                "is_blocked": row["isBlocked"],
                "summary": row["summary"],
                "created_at": row["createdAt"],
            }
        return None
    
    def _fetch_violations(self, cursor, review_id: str) -> List[dict]:
        """Fetch violations for review."""
        # Note: In the actual schema, violations might be linked differently
        # This is a placeholder query - adjust based on actual schema
        cursor.execute(
            """
            SELECT 
                v.id,
                v.rule,
                v.severity,
                v."filePath",
                v."lineNumber",
                v.message,
                v."detectedAt"
            FROM "Violation" v
            WHERE v."repositoryId" = (
                SELECT "repositoryId" FROM "Review" WHERE id = %s
            )
              AND v."detectedAt" >= (
                SELECT "createdAt" FROM "Review" WHERE id = %s
              ) - INTERVAL '1 hour'
            ORDER BY v."detectedAt" DESC
            LIMIT 200
            """,
            (review_id, review_id),
        )
        return [dict(row) for row in cursor.fetchall()]
    
    def _fetch_historical_data(self, cursor, tenant_id: str, 
                               repository_id: Optional[str]) -> dict:
        """Fetch historical data for ML features."""
        since_date = datetime.now() - timedelta(days=90)
        
        # Historical fix rates by rule
        cursor.execute(
            """
            SELECT 
                v.rule,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE v.resolved = true) as fixed
            FROM "Violation" v
            JOIN "Repository" r ON v."repositoryId" = r.id
            WHERE r."organizationId" = %s
              AND v."detectedAt" >= %s
            GROUP BY v.rule
            """,
            (tenant_id, since_date),
        )
        fix_rates = {}
        for row in cursor.fetchall():
            total = row["total"] or 0
            fixed = row["fixed"] or 0
            fix_rates[row["rule"]] = fixed / total if total > 0 else 0.5
        
        # Recent critical violations
        cursor.execute(
            """
            SELECT COUNT(*) as count
            FROM "Violation" v
            JOIN "Repository" r ON v."repositoryId" = r.id
            WHERE r."organizationId" = %s
              AND v.severity = 'critical'
              AND v."detectedAt" >= NOW() - INTERVAL '7 days'
            """,
            (tenant_id,),
        )
        recent_critical = cursor.fetchone()["count"] or 0
        
        return {
            "fix_rates_by_rule": fix_rates,
            "recent_critical_count": recent_critical,
            "repository_id": repository_id,
        }
    
    def _compute_priority(self, violation: dict, review_data: dict,
                         historical_data: dict, strategy: str) -> PrioritizedViolation:
        """Compute priority for a single violation."""
        
        # Extract violation info
        violation_id = violation.get("id", "unknown")
        rule = violation.get("rule", "unknown")
        severity = violation.get("severity", "medium")
        file_path = violation.get("filePath", "unknown")
        line_number = violation.get("lineNumber")
        
        # Compute impact score
        impact_score = self._compute_impact_score(
            violation, rule, severity, historical_data
        )
        
        # Compute effort score (lower = easier to fix)
        effort_score = self._compute_effort_score(
            violation, rule, file_path, historical_data
        )
        
        # Compute combined priority based on strategy
        if strategy == "impact":
            priority_score = impact_score
        elif strategy == "effort":
            priority_score = 1.0 - effort_score  # Invert: easier = higher priority
        else:  # balanced
            # Weight impact more heavily, but consider effort
            priority_score = (impact_score * 0.7) + ((1.0 - effort_score) * 0.3)
        
        # Build features dict
        features = {
            "impact_score": impact_score,
            "effort_score": effort_score,
            "severity_multiplier": self.SEVERITY_MULTIPLIERS.get(severity, 0.5),
            "historical_fix_rate": historical_data["fix_rates_by_rule"].get(rule, 0.5),
        }
        
        # Generate reasons
        reasons = self._generate_reasons(
            violation, impact_score, effort_score, historical_data
        )
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            violation, impact_score, effort_score
        )
        
        return PrioritizedViolation(
            violation_id=violation_id,
            rule=rule,
            severity=severity,
            file_path=file_path,
            line_number=line_number,
            impact_score=round(impact_score, 4),
            effort_score=round(effort_score, 4),
            priority_score=round(priority_score, 4),
            features=features,
            reasons=reasons,
            recommendations=recommendations,
            suggested_order=0,  # Will be set later
        )
    
    def _compute_impact_score(self, violation: dict, rule: str, 
                              severity: str, historical_data: dict) -> float:
        """Compute impact score for a violation."""
        # Base score from severity
        base_score = self.SEVERITY_MULTIPLIERS.get(severity, 0.5)
        
        # Category multiplier
        category = self.RULE_CATEGORIES.get(rule, "maintainability")
        category_weight = self.IMPACT_WEIGHTS.get(category, 0.1)
        
        # Historical fix rate (lower fix rate = higher impact if not fixed)
        fix_rate = historical_data["fix_rates_by_rule"].get(rule, 0.5)
        fix_factor = 1.0 - fix_rate  # If rarely fixed, more important to fix now
        
        # Combine scores
        impact = base_score * 0.4 + category_weight * 0.4 + fix_factor * 0.2
        
        return min(1.0, impact)
    
    def _compute_effort_score(self, violation: dict, rule: str,
                              file_path: str, historical_data: dict) -> float:
        """Compute effort score (lower = easier to fix)."""
        # Default effort based on rule type
        rule_effort = {
            "unused_import": 0.1,
            "naming_convention": 0.2,
            "indentation": 0.1,
            "dead_code": 0.3,
            "null_pointer": 0.4,
            "unhandled_exception": 0.5,
            "sql_injection": 0.8,
            "xss": 0.7,
            "hardcoded_secret": 0.6,
            "n_plus_1_query": 0.6,
        }
        
        base_effort = rule_effort.get(rule, 0.5)
        
        # File path complexity
        path_complexity = min(1.0, len(file_path.split("/")) * 0.1)
        
        # Combine
        effort = base_effort * 0.7 + path_complexity * 0.3
        
        return min(1.0, effort)
    
    def _generate_reasons(self, violation: dict, impact_score: float,
                         effort_score: float, historical_data: dict) -> List[str]:
        """Generate human-readable reasons for priority."""
        reasons = []
        
        rule = violation.get("rule", "unknown")
        severity = violation.get("severity", "medium")
        
        if impact_score >= 0.8:
            reasons.append(f"High impact {severity} severity issue")
        elif impact_score >= 0.6:
            reasons.append(f"Medium-high impact issue")
        
        category = self.RULE_CATEGORIES.get(rule, "maintainability")
        if category in ["security", "reliability"]:
            reasons.append(f"Affects {category}")
        
        fix_rate = historical_data["fix_rates_by_rule"].get(rule, 0.5)
        if fix_rate < 0.3:
            reasons.append("Low historical fix rate - important to address")
        elif fix_rate > 0.8:
            reasons.append("Usually fixed quickly - easy to resolve")
        
        if effort_score <= 0.3:
            reasons.append("Quick fix - low effort")
        elif effort_score >= 0.7:
            reasons.append("Requires more effort to fix properly")
        
        return reasons
    
    def _generate_recommendations(self, violation: dict, impact_score: float,
                                  effort_score: float) -> List[str]:
        """Generate fix recommendations."""
        recommendations = []
        
        rule = violation.get("rule", "unknown")
        
        # Rule-specific recommendations
        if rule == "sql_injection":
            recommendations.append("Use parameterized queries")
        elif rule == "hardcoded_secret":
            recommendations.append("Move to environment variables or secret manager")
        elif rule == "unused_import":
            recommendations.append("Remove unused import")
        elif rule == "null_pointer":
            recommendations.append("Add null check before dereferencing")
        elif rule == "n_plus_1_query":
            recommendations.append("Use eager loading or batch queries")
        
        # Strategy recommendations
        if impact_score >= 0.8 and effort_score <= 0.4:
            recommendations.append("High impact, easy fix - address immediately")
        elif impact_score >= 0.8:
            recommendations.append("High impact - prioritize for next sprint")
        elif effort_score <= 0.2:
            recommendations.append("Quick win - fix while you're here")
        
        return recommendations
    
    def _store_prioritization(self, cursor, tenant_id: str, review_id: str,
                              prioritized: List[PrioritizedViolation], strategy: str) -> None:
        """Store prioritization results."""
        prioritization_id = f"prioritize_{review_id}_{strategy}"
        
        cursor.execute(
            """
            INSERT INTO job_results (job_id, result, created_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (job_id) DO UPDATE
            SET result = EXCLUDED.result,
                created_at = EXCLUDED.created_at
            """,
            (
                prioritization_id,
                json.dumps({
                    "tenant_id": tenant_id,
                    "review_id": review_id,
                    "strategy": strategy,
                    "violation_count": len(prioritized),
                    "prioritized": [
                        {
                            "violation_id": pv.violation_id,
                            "priority_score": pv.priority_score,
                            "suggested_order": pv.suggested_order,
                        }
                        for pv in prioritized
                    ],
                    "stored_at": datetime.now().isoformat(),
                }),
            ),
        )
    
    def _compute_distribution(self, prioritized: List[PrioritizedViolation]) -> dict:
        """Compute priority score distribution."""
        if not prioritized:
            return {}
        
        ranges = {
            "critical_90_100": 0,
            "high_75_89": 0,
            "medium_50_74": 0,
            "low_below_50": 0,
        }
        
        for pv in prioritized:
            score = pv.priority_score
            if score >= 0.9:
                ranges["critical_90_100"] += 1
            elif score >= 0.75:
                ranges["high_75_89"] += 1
            elif score >= 0.5:
                ranges["medium_50_74"] += 1
            else:
                ranges["low_below_50"] += 1
        
        return ranges
    
    def _category_breakdown(self, prioritized: List[PrioritizedViolation]) -> dict:
        """Compute breakdown by rule category."""
        categories = defaultdict(int)
        
        for pv in prioritized:
            category = self.RULE_CATEGORIES.get(pv.rule, "unknown")
            categories[category] += 1
        
        return dict(categories)
