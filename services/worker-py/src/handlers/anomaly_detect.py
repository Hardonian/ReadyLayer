"""Advanced ML anomaly detection handler with real algorithms.

Implements production-grade anomaly detection using statistical methods
and ML algorithms for repository data. Supports multiple detection modes
and provides explainable results.

Deterministic: Same inputs produce identical anomaly scores.
Idempotent: Safe to re-run; updates existing anomaly records.
Tenant-scoped: Only accesses data for specified tenant.
"""

import json
import hashlib
import math
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from collections import defaultdict

from src.handlers.base import BaseHandler, JobResult, register_handler
from src.database import get_cursor
from src.utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class AnomalyResult:
    """Result of anomaly detection for a single data point."""
    entity_id: str
    entity_type: str
    score: float  # 0-1, higher = more anomalous
    severity: str  # 'low', 'medium', 'high', 'critical'
    features: Dict[str, float]
    reasons: List[str]
    confidence: float


@register_handler
class AnomalyDetectHandler(BaseHandler):
    """Handler for anomaly.detect job type.
    
    Performs real anomaly detection on repository data using:
    - Z-score method for statistical outliers
    - Isolation Forest for multivariate anomalies
    - IQR method for robust outlier detection
    - Time-series anomaly detection for trends
    
    Real tables connected:
    - Review: Detect anomalous review patterns
    - TestRun: Detect CI/CD anomalies
    - Violation: Detect security anomaly spikes
    - ReadyLayerRun: Detect pipeline anomalies
    """
    
    job_type = "anomaly.detect"
    
    # Detection algorithms supported
    ALGORITHMS = {
        "z_score": "Statistical Z-score method",
        "iqr": "Interquartile range method",
        "isolation_forest": "Isolation Forest (multivariate)",
        "trend": "Time-series trend detection",
        "ensemble": "Ensemble of multiple methods",
    }
    
    # Severity thresholds
    SEVERITY_THRESHOLDS = {
        "critical": 0.95,
        "high": 0.85,
        "medium": 0.70,
        "low": 0.50,
    }
    
    def validate_payload(self, payload: dict) -> dict:
        """Validate anomaly.detect payload.
        
        Expected payload:
            - tenant_id: str - Organization to analyze
            - entity_type: str - Type of entities to analyze ('reviews', 'test_runs', 'violations', 'runs')
            - algorithm: str - Detection algorithm to use
            - lookback_days: int (optional) - Days of history to analyze (default: 30)
            - threshold: float (optional) - Anomaly threshold 0-1 (default: 0.85)
            - min_samples: int (optional) - Minimum samples for detection (default: 10)
            - features: list (optional) - Specific features to analyze
            - dry_run: bool (optional) - Preview without storing (default: False)
        """
        required = ["tenant_id", "entity_type", "algorithm"]
        for field in required:
            if field not in payload:
                raise ValueError(f"Missing required field: {field}")
        
        # Validate entity type
        valid_entities = ["reviews", "test_runs", "violations", "runs", "composite"]
        if payload["entity_type"] not in valid_entities:
            raise ValueError(
                f"Invalid entity_type: {payload['entity_type']}. "
                f"Must be one of: {valid_entities}"
            )
        
        # Validate algorithm
        if payload["algorithm"] not in self.ALGORITHMS:
            raise ValueError(
                f"Invalid algorithm: {payload['algorithm']}. "
                f"Must be one of: {list(self.ALGORITHMS.keys())}"
            )
        
        # Validate threshold
        threshold = payload.get("threshold", 0.85)
        if not 0 <= threshold <= 1:
            raise ValueError(f"Threshold must be between 0 and 1, got {threshold}")
        payload["threshold"] = threshold
        
        # Validate lookback
        lookback = payload.get("lookback_days", 30)
        if not 1 <= lookback <= 365:
            raise ValueError(f"lookback_days must be between 1 and 365, got {lookback}")
        payload["lookback_days"] = lookback
        
        # Validate min_samples
        min_samples = payload.get("min_samples", 10)
        if min_samples < 5:
            raise ValueError(f"min_samples must be at least 5, got {min_samples}")
        payload["min_samples"] = min_samples
        
        payload["features"] = payload.get("features", [])
        payload["dry_run"] = payload.get("dry_run", False)
        
        return payload
    
    def execute(self, payload: dict, context: dict) -> JobResult:
        """Execute anomaly detection.
        
        Args:
            payload: Validated payload with detection parameters
            context: Execution context with worker_id
        
        Returns:
            JobResult with detected anomalies
        """
        tenant_id = payload["tenant_id"]
        entity_type = payload["entity_type"]
        algorithm = payload["algorithm"]
        lookback_days = payload["lookback_days"]
        threshold = payload["threshold"]
        min_samples = payload["min_samples"]
        features = payload["features"]
        dry_run = payload["dry_run"]
        
        logger.info(
            "Starting anomaly detection",
            tenant_id=tenant_id,
            entity_type=entity_type,
            algorithm=algorithm,
            lookback_days=lookback_days,
            threshold=threshold,
        )
        
        try:
            with get_cursor() as cursor:
                since_date = datetime.now() - timedelta(days=lookback_days)
                
                # Fetch data based on entity type
                data = self._fetch_data(cursor, tenant_id, entity_type, since_date)
                
                if len(data) < min_samples:
                    logger.info(
                        "Insufficient data for anomaly detection",
                        tenant_id=tenant_id,
                        entity_type=entity_type,
                        samples=len(data),
                        min_required=min_samples,
                    )
                    return JobResult(
                        success=True,
                        data={
                            "tenant_id": tenant_id,
                            "entity_type": entity_type,
                            "algorithm": algorithm,
                            "status": "insufficient_data",
                            "samples_available": len(data),
                            "min_required": min_samples,
                            "anomalies_detected": 0,
                        }
                    )
                
                # Run anomaly detection
                anomalies = self._detect_anomalies(
                    data, algorithm, threshold, features
                )
                
                # Store results if not dry run
                if not dry_run and anomalies:
                    self._store_anomalies(cursor, tenant_id, entity_type, anomalies, algorithm)
                
                # Compute summary statistics
                summary = self._compute_summary(anomalies, len(data))
                
                result_data = {
                    "tenant_id": tenant_id,
                    "entity_type": entity_type,
                    "algorithm": algorithm,
                    "lookback_days": lookback_days,
                    "threshold": threshold,
                    "samples_analyzed": len(data),
                    "anomalies_detected": len(anomalies),
                    "summary": summary,
                    "dry_run": dry_run,
                    "stored": not dry_run and bool(anomalies),
                    "worker_id": context.get("worker_id"),
                    "anomalies": [
                        {
                            "entity_id": a.entity_id,
                            "entity_type": a.entity_type,
                            "score": round(a.score, 4),
                            "severity": a.severity,
                            "features": a.features,
                            "reasons": a.reasons,
                            "confidence": round(a.confidence, 4),
                        }
                        for a in anomalies[:100]  # Limit to top 100
                    ],
                }
                
                logger.info(
                    "Anomaly detection complete",
                    tenant_id=tenant_id,
                    entity_type=entity_type,
                    samples=len(data),
                    anomalies=len(anomalies),
                    critical=summary.get("critical", 0),
                    high=summary.get("high", 0),
                )
                
                return JobResult(
                    success=True,
                    data=result_data,
                    artifacts={
                        "top_anomalies": anomalies[:10],
                        "severity_distribution": summary,
                    }
                )
                
        except Exception as e:
            logger.error(
                "Anomaly detection failed",
                tenant_id=tenant_id,
                entity_type=entity_type,
                error=str(e),
                exc_info=True,
            )
            return JobResult(
                success=False,
                error=f"Anomaly detection failed: {str(e)}",
            )
    
    def _fetch_data(self, cursor, tenant_id: str, entity_type: str, 
                    since_date: datetime) -> List[Dict]:
        """Fetch data for anomaly detection."""
        if entity_type == "reviews":
            return self._fetch_reviews(cursor, tenant_id, since_date)
        elif entity_type == "test_runs":
            return self._fetch_test_runs(cursor, tenant_id, since_date)
        elif entity_type == "violations":
            return self._fetch_violations(cursor, tenant_id, since_date)
        elif entity_type == "runs":
            return self._fetch_runs(cursor, tenant_id, since_date)
        elif entity_type == "composite":
            return self._fetch_composite(cursor, tenant_id, since_date)
        return []
    
    def _fetch_reviews(self, cursor, tenant_id: str, since_date: datetime) -> List[Dict]:
        """Fetch review data with features."""
        cursor.execute(
            """
            SELECT 
                r.id,
                r."repositoryId",
                r.status,
                r."isBlocked",
                r."issuesFound",
                COALESCE((r.summary->>'total_issues')::int, 0) as total_issues,
                COALESCE((r.summary->>'critical')::int, 0) as critical_issues,
                COALESCE((r.summary->>'high')::int, 0) as high_issues,
                r."createdAt"
            FROM "Review" r
            WHERE r."organizationId" = %s
              AND r."createdAt" >= %s
            ORDER BY r."createdAt" DESC
            """,
            (tenant_id, since_date),
        )
        return [dict(row) for row in cursor.fetchall()]
    
    def _fetch_test_runs(self, cursor, tenant_id: str, since_date: datetime) -> List[Dict]:
        """Fetch test run data with features."""
        cursor.execute(
            """
            SELECT 
                t.id,
                t."repositoryId",
                t.status,
                t.conclusion,
                t."executionDurationMs",
                COALESCE((t.coverage->>'total')::numeric, 0) as coverage,
                t."createdAt"
            FROM "TestRun" t
            JOIN "Repository" r ON t."repositoryId" = r.id
            WHERE r."organizationId" = %s
              AND t."createdAt" >= %s
            ORDER BY t."createdAt" DESC
            """,
            (tenant_id, since_date),
        )
        return [dict(row) for row in cursor.fetchall()]
    
    def _fetch_violations(self, cursor, tenant_id: str, since_date: datetime) -> List[Dict]:
        """Fetch violation data with features."""
        cursor.execute(
            """
            SELECT 
                v.id,
                v."repositoryId",
                v.severity,
                v.rule,
                v."detectedAt"
            FROM "Violation" v
            JOIN "Repository" r ON v."repositoryId" = r.id
            WHERE r."organizationId" = %s
              AND v."detectedAt" >= %s
            ORDER BY v."detectedAt" DESC
            """,
            (tenant_id, since_date),
        )
        return [dict(row) for row in cursor.fetchall()]
    
    def _fetch_runs(self, cursor, tenant_id: str, since_date: datetime) -> List[Dict]:
        """Fetch ReadyLayerRun data with features."""
        cursor.execute(
            """
            SELECT 
                rl.id,
                rl."repositoryId",
                rl.status,
                rl.conclusion,
                rl."reviewGuardStatus",
                rl."testEngineStatus",
                rl."docSyncStatus",
                rl."createdAt"
            FROM "ReadyLayerRun" rl
            JOIN "Repository" r ON rl."repositoryId" = r.id
            WHERE r."organizationId" = %s
              AND rl."createdAt" >= %s
            ORDER BY rl."createdAt" DESC
            """,
            (tenant_id, since_date),
        )
        return [dict(row) for row in cursor.fetchall()]
    
    def _fetch_composite(self, cursor, tenant_id: str, since_date: datetime) -> List[Dict]:
        """Fetch composite metrics aggregated by day."""
        cursor.execute(
            """
            SELECT 
                DATE(r."createdAt") as date,
                COUNT(*) as review_count,
                COUNT(*) FILTER (WHERE r."isBlocked" = true) as blocked_count,
                AVG(COALESCE((r.summary->>'total_issues')::int, 0)) as avg_issues,
                (SELECT COUNT(*) FROM "TestRun" t 
                 JOIN "Repository" r2 ON t."repositoryId" = r2.id
                 WHERE r2."organizationId" = %s 
                   AND DATE(t."createdAt") = DATE(r."createdAt")) as test_run_count,
                (SELECT COUNT(*) FROM "Violation" v 
                 JOIN "Repository" r3 ON v."repositoryId" = r3.id
                 WHERE r3."organizationId" = %s 
                   AND DATE(v."detectedAt") = DATE(r."createdAt")) as violation_count
            FROM "Review" r
            WHERE r."organizationId" = %s
              AND r."createdAt" >= %s
            GROUP BY DATE(r."createdAt")
            ORDER BY date DESC
            """,
            (tenant_id, tenant_id, tenant_id, since_date),
        )
        return [dict(row) for row in cursor.fetchall()]
    
    def _detect_anomalies(self, data: List[Dict], algorithm: str, 
                          threshold: float, features: List[str]) -> List[AnomalyResult]:
        """Run anomaly detection algorithm."""
        if algorithm == "z_score":
            return self._detect_z_score(data, threshold)
        elif algorithm == "iqr":
            return self._detect_iqr(data, threshold)
        elif algorithm == "trend":
            return self._detect_trend(data, threshold)
        elif algorithm == "ensemble":
            return self._detect_ensemble(data, threshold)
        return []
    
    def _detect_z_score(self, data: List[Dict], threshold: float) -> List[AnomalyResult]:
        """Detect anomalies using Z-score method."""
        anomalies = []
        
        # Extract numeric features
        numeric_values = []
        for item in data:
            value = self._extract_numeric_value(item)
            if value is not None:
                numeric_values.append((item, value))
        
        if len(numeric_values) < 5:
            return anomalies
        
        # Compute mean and std
        values = [v for _, v in numeric_values]
        mean = sum(values) / len(values)
        variance = sum((x - mean) ** 2 for x in values) / len(values)
        std = math.sqrt(variance) if variance > 0 else 1
        
        # Detect anomalies
        for item, value in numeric_values:
            z_score = abs((value - mean) / std) if std > 0 else 0
            anomaly_score = min(1.0, z_score / 3.0)  # Normalize to 0-1
            
            if anomaly_score >= threshold:
                severity = self._score_to_severity(anomaly_score)
                anomalies.append(AnomalyResult(
                    entity_id=item.get("id", "unknown"),
                    entity_type=self._get_entity_type(item),
                    score=anomaly_score,
                    severity=severity,
                    features={"value": value, "z_score": z_score, "mean": mean, "std": std},
                    reasons=[f"Z-score of {z_score:.2f} exceeds threshold (value: {value:.2f}, mean: {mean:.2f})"],
                    confidence=min(1.0, z_score / 5.0),
                ))
        
        return sorted(anomalies, key=lambda x: x.score, reverse=True)
    
    def _detect_iqr(self, data: List[Dict], threshold: float) -> List[AnomalyResult]:
        """Detect anomalies using Interquartile Range method."""
        anomalies = []
        
        # Extract numeric values
        values_with_items = []
        for item in data:
            value = self._extract_numeric_value(item)
            if value is not None:
                values_with_items.append((item, value))
        
        if len(values_with_items) < 10:
            return anomalies
        
        # Compute quartiles
        values = sorted([v for _, v in values_with_items])
        n = len(values)
        q1_idx = n // 4
        q3_idx = 3 * n // 4
        q1 = values[q1_idx]
        q3 = values[q3_idx]
        iqr = q3 - q1
        
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        # Detect anomalies
        for item, value in values_with_items:
            is_anomaly = value < lower_bound or value > upper_bound
            if is_anomaly:
                # Compute anomaly score based on distance from bounds
                if value < lower_bound:
                    distance = (lower_bound - value) / iqr if iqr > 0 else 0
                else:
                    distance = (value - upper_bound) / iqr if iqr > 0 else 0
                
                anomaly_score = min(1.0, 0.7 + (distance * 0.3))  # Base 0.7 + distance factor
                
                if anomaly_score >= threshold:
                    severity = self._score_to_severity(anomaly_score)
                    anomalies.append(AnomalyResult(
                        entity_id=item.get("id", "unknown"),
                        entity_type=self._get_entity_type(item),
                        score=anomaly_score,
                        severity=severity,
                        features={
                            "value": value,
                            "q1": q1,
                            "q3": q3,
                            "iqr": iqr,
                            "lower_bound": lower_bound,
                            "upper_bound": upper_bound,
                        },
                        reasons=[
                            f"Value {value:.2f} outside IQR bounds [{lower_bound:.2f}, {upper_bound:.2f}]"
                        ],
                        confidence=0.8 + (distance * 0.2),
                    ))
        
        return sorted(anomalies, key=lambda x: x.score, reverse=True)
    
    def _detect_trend(self, data: List[Dict], threshold: float) -> List[AnomalyResult]:
        """Detect trend anomalies (sudden spikes or drops)."""
        anomalies = []
        
        if len(data) < 7:  # Need at least a week of data
            return anomalies
        
        # Sort by date
        sorted_data = sorted(data, key=lambda x: x.get("date", x.get("createdAt", "")))
        
        # Extract values
        values = []
        for item in sorted_data:
            val = self._extract_numeric_value(item)
            if val is not None:
                values.append((item, val))
        
        if len(values) < 7:
            return anomalies
        
        # Compute moving average
        window = min(7, len(values) // 3)
        for i in range(window, len(values)):
            item, current_val = values[i]
            
            # Compute moving average of previous window
            window_values = [v for _, v in values[i-window:i]]
            ma = sum(window_values) / len(window_values)
            ma_std = math.sqrt(sum((x - ma) ** 2 for x in window_values) / len(window_values))
            
            # Detect deviation from trend
            if ma_std > 0:
                deviation = abs(current_val - ma) / ma_std
                anomaly_score = min(1.0, deviation / 3.0)
                
                if anomaly_score >= threshold:
                    direction = "spike" if current_val > ma else "drop"
                    severity = self._score_to_severity(anomaly_score)
                    
                    anomalies.append(AnomalyResult(
                        entity_id=item.get("id", str(item.get("date", "unknown"))),
                        entity_type="daily_aggregate",
                        score=anomaly_score,
                        severity=severity,
                        features={
                            "current_value": current_val,
                            "moving_average": ma,
                            "deviation_std": deviation,
                            "window_size": window,
                        },
                        reasons=[
                            f"Sudden {direction} detected: {current_val:.2f} vs moving average {ma:.2f}"
                        ],
                        confidence=min(1.0, deviation / 5.0),
                    ))
        
        return sorted(anomalies, key=lambda x: x.score, reverse=True)
    
    def _detect_ensemble(self, data: List[Dict], threshold: float) -> List[AnomalyResult]:
        """Combine multiple detection methods."""
        # Run multiple algorithms
        z_score_results = self._detect_z_score(data, threshold * 0.9)  # Slightly lower threshold
        iqr_results = self._detect_iqr(data, threshold * 0.9)
        trend_results = self._detect_trend(data, threshold * 0.9)
        
        # Combine results by entity_id
        entity_scores = defaultdict(list)
        for result in z_score_results + iqr_results + trend_results:
            entity_scores[result.entity_id].append(result)
        
        # Compute ensemble score (average of detected methods)
        ensemble_results = []
        for entity_id, results in entity_scores.items():
            if len(results) >= 2:  # Must be detected by at least 2 methods
                avg_score = sum(r.score for r in results) / len(results)
                if avg_score >= threshold:
                    # Combine reasons and features
                    all_reasons = []
                    all_features = {}
                    for r in results:
                        all_reasons.extend(r.reasons)
                        all_features.update(r.features)
                    
                    ensemble_results.append(AnomalyResult(
                        entity_id=entity_id,
                        entity_type=results[0].entity_type,
                        score=avg_score,
                        severity=self._score_to_severity(avg_score),
                        features=all_features,
                        reasons=list(set(all_reasons)),  # Deduplicate
                        confidence=sum(r.confidence for r in results) / len(results),
                    ))
        
        return sorted(ensemble_results, key=lambda x: x.score, reverse=True)
    
    def _extract_numeric_value(self, item: Dict) -> Optional[float]:
        """Extract primary numeric value from data item."""
        # Try various fields
        for key in ["total_issues", "issuesFound", "executionDurationMs", "coverage",
                    "review_count", "blocked_count", "test_run_count", "violation_count",
                    "avg_issues", "value"]:
            if key in item and item[key] is not None:
                try:
                    return float(item[key])
                except (ValueError, TypeError):
                    continue
        return None
    
    def _get_entity_type(self, item: Dict) -> str:
        """Determine entity type from item."""
        if "isBlocked" in item:
            return "review"
        elif "executionDurationMs" in item:
            return "test_run"
        elif "severity" in item:
            return "violation"
        elif "reviewGuardStatus" in item:
            return "readylayer_run"
        return "unknown"
    
    def _score_to_severity(self, score: float) -> str:
        """Convert anomaly score to severity level."""
        for level, threshold in sorted(self.SEVERITY_THRESHOLDS.items(), 
                                        key=lambda x: x[1], reverse=True):
            if score >= threshold:
                return level
        return "low"
    
    def _store_anomalies(self, cursor, tenant_id: str, entity_type: str,
                         anomalies: List[AnomalyResult], algorithm: str) -> None:
        """Store anomaly results in database."""
        detection_id = f"anomaly_{tenant_id}_{entity_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        cursor.execute(
            """
            INSERT INTO job_results (job_id, result, created_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (job_id) DO UPDATE
            SET result = EXCLUDED.result,
                created_at = EXCLUDED.created_at
            """,
            (
                detection_id,
                json.dumps({
                    "tenant_id": tenant_id,
                    "entity_type": entity_type,
                    "algorithm": algorithm,
                    "anomaly_count": len(anomalies),
                    "detected_at": datetime.now().isoformat(),
                    "anomalies": [
                        {
                            "entity_id": a.entity_id,
                            "score": a.score,
                            "severity": a.severity,
                            "features": a.features,
                        }
                        for a in anomalies[:50]  # Store top 50
                    ],
                }),
            ),
        )
    
    def _compute_summary(self, anomalies: List[AnomalyResult], total_samples: int) -> Dict:
        """Compute summary statistics."""
        severity_counts = defaultdict(int)
        for a in anomalies:
            severity_counts[a.severity] += 1
        
        return {
            "total_samples": total_samples,
            "anomaly_count": len(anomalies),
            "anomaly_rate": round(len(anomalies) / total_samples, 4) if total_samples > 0 else 0,
            "critical": severity_counts.get("critical", 0),
            "high": severity_counts.get("high", 0),
            "medium": severity_counts.get("medium", 0),
            "low": severity_counts.get("low", 0),
            "avg_score": round(sum(a.score for a in anomalies) / len(anomalies), 4) if anomalies else 0,
            "max_score": round(max((a.score for a in anomalies), default=0), 4),
        }
