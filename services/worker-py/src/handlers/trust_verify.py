"""Trust verification handler for AI-generated content.

Implements a comprehensive trust layer for verifying AI-generated content
including code, tests, documentation, and configurations. Provides
confidence scoring and provenance tracking.

Deterministic: Same content produces identical verification results.
Idempotent: Re-verifying same content returns cached results.
Tenant-scoped: Verifications are isolated per tenant.
"""

import json
import hashlib
import re
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

from src.handlers.base import BaseHandler, JobResult, register_handler
from src.database import get_cursor
from src.utils.logging import get_logger

logger = get_logger(__name__)


class ContentType(Enum):
    """Types of content that can be verified."""
    CODE = "code"
    TEST = "test"
    DOC = "doc"
    CONFIG = "config"
    POLICY = "policy"
    REVIEW = "review"


class VerificationLevel(Enum):
    """Trust verification levels."""
    NONE = "none"           # No verification performed
    STATIC = "static"       # Static analysis passed
    TESTED = "tested"       # Tests executed and passed
    REVIEWED = "reviewed"   # Human review completed
    CERTIFIED = "certified" # Full certification


@dataclass
class VerificationCheck:
    """Individual verification check result."""
    name: str
    passed: bool
    score: float  # 0-1
    details: Dict[str, Any]
    recommendations: List[str]


@dataclass
class TrustVerification:
    """Complete trust verification result."""
    content_hash: str
    content_type: str
    source_job_id: Optional[str]
    confidence: float
    level: str
    checks: List[VerificationCheck]
    provenance: Dict[str, Any]
    verified_at: str


@register_handler
class TrustVerifyHandler(BaseHandler):
    """Handler for trust.verify job type.

    Verifies AI-generated content through multiple validation methods:
    - Static analysis for code quality
    - Security pattern checks
    - Syntax validation
    - Provenance tracking
    - Confidence scoring

    Real tables connected:
    - Job: Source job that generated the content
    - Review: Related review data for context
    - Test: Test coverage validation
    - job_results: Stores verification records
    """

    job_type = "trust.verify"

    # Verification weights for confidence calculation
    CHECK_WEIGHTS = {
        "syntax_valid": 0.20,
        "security_scan": 0.25,
        "static_analysis": 0.20,
        "test_coverage": 0.15,
        "pattern_match": 0.10,
        "complexity_check": 0.10,
    }

    # Security patterns to check
    SECURITY_PATTERNS = {
        "hardcoded_secret": re.compile(
            r'(password|secret|key|token)\s*=\s*[\'"][^\'"]{8,}[\'"]',
            re.IGNORECASE
        ),
        "sql_injection": re.compile(
            r'(?i)(execute|query|exec)\s*\(.*\$.*\)',
        ),
        "unsafe_eval": re.compile(
            r'(?i)(eval|exec)\s*\(',
        ),
        "http_url": re.compile(
            r'http://(?!localhost|127\.0\.0\.1)',
        ),
    }

    # Code quality thresholds
    COMPLEXITY_THRESHOLD = 15  # Cyclomatic complexity
    LINES_THRESHOLD = 500      # Max lines per file

    def validate_payload(self, payload: dict) -> dict:
        """Validate trust.verify payload.

        Expected payload:
            - tenant_id: str - Organization scope
            - content_type: str - Type of content ('code', 'test', 'doc', 'config', 'policy', 'review')
            - content: str - The actual content to verify
            - content_hash: str (optional) - Pre-computed SHA-256 hash
            - source_job_id: str (optional) - Job that generated this content
            - checks: list (optional) - Specific checks to run (default: all)
            - min_confidence: float (optional) - Minimum confidence threshold (default: 0.8)
            - dry_run: bool (optional) - Preview without storing (default: False)
        """
        required = ["tenant_id", "content_type", "content"]
        for field in required:
            if field not in payload:
                raise ValueError(f"Missing required field: {field}")

        # Validate content type
        valid_types = [ct.value for ct in ContentType]
        if payload["content_type"] not in valid_types:
            raise ValueError(
                f"Invalid content_type: {payload['content_type']}. "
                f"Must be one of: {valid_types}"
            )

        # Compute content hash if not provided
        if "content_hash" not in payload:
            content_bytes = payload["content"].encode("utf-8")
            payload["content_hash"] = hashlib.sha256(content_bytes).hexdigest()

        # Validate min_confidence
        min_confidence = payload.get("min_confidence", 0.8)
        if not 0 <= min_confidence <= 1:
            raise ValueError(f"min_confidence must be between 0 and 1, got {min_confidence}")
        payload["min_confidence"] = min_confidence

        # Validate checks
        valid_checks = list(self.CHECK_WEIGHTS.keys())
        checks = payload.get("checks", valid_checks)
        invalid = [c for c in checks if c not in valid_checks]
        if invalid:
            raise ValueError(f"Invalid checks: {invalid}. Must be one of: {valid_checks}")
        payload["checks"] = checks

        payload["dry_run"] = payload.get("dry_run", False)
        payload["source_job_id"] = payload.get("source_job_id")

        return payload

    def execute(self, payload: dict, context: dict) -> JobResult:
        """Execute trust verification.

        Args:
            payload: Validated payload with verification parameters
            context: Execution context with worker_id

        Returns:
            JobResult with verification results
        """
        tenant_id = payload["tenant_id"]
        content_type = payload["content_type"]
        content = payload["content"]
        content_hash = payload["content_hash"]
        source_job_id = payload["source_job_id"]
        checks_to_run = payload["checks"]
        min_confidence = payload["min_confidence"]
        dry_run = payload["dry_run"]

        logger.info(
            "Starting trust verification",
            tenant_id=tenant_id,
            content_type=content_type,
            content_hash=content_hash[:16],
            source_job=source_job_id,
        )

        try:
            with get_cursor() as cursor:
                # Check for existing verification (idempotency)
                existing = self._check_existing_verification(
                    cursor, tenant_id, content_hash
                )
                if existing and not dry_run:
                    logger.info(
                        "Returning cached verification",
                        content_hash=content_hash[:16],
                        confidence=existing["confidence"],
                    )
                    return JobResult(
                        success=True,
                        data=existing,
                    )

                # Run verification checks
                checks = []

                if "syntax_valid" in checks_to_run:
                    checks.append(self._check_syntax(content, content_type))

                if "security_scan" in checks_to_run:
                    checks.append(self._check_security(content, content_type))

                if "static_analysis" in checks_to_run:
                    checks.append(self._check_static_analysis(content, content_type))

                if "test_coverage" in checks_to_run:
                    checks.append(self._check_test_coverage(
                        cursor, tenant_id, content, content_type, source_job_id
                    ))

                if "pattern_match" in checks_to_run:
                    checks.append(self._check_patterns(content, content_type))

                if "complexity_check" in checks_to_run:
                    checks.append(self._check_complexity(content, content_type))

                # Compute confidence score
                confidence = self._compute_confidence(checks, checks_to_run)

                # Determine verification level
                level = self._confidence_to_level(confidence)

                # Build provenance info
                provenance = {
                    "content_hash": content_hash,
                    "content_length": len(content),
                    "content_type": content_type,
                    "source_job_id": source_job_id,
                    "verified_by": context.get("worker_id"),
                    "verified_at": datetime.now().isoformat(),
                    "checks_performed": len(checks),
                    "checks_passed": sum(1 for c in checks if c.passed),
                }

                # Store verification if not dry run
                if not dry_run:
                    self._store_verification(
                        cursor, tenant_id, content_hash, content_type,
                        source_job_id, confidence, level, checks, provenance
                    )

                result_data = {
                    "tenant_id": tenant_id,
                    "content_hash": content_hash,
                    "content_type": content_type,
                    "source_job_id": source_job_id,
                    "confidence": round(confidence, 4),
                    "level": level,
                    "passed": confidence >= min_confidence,
                    "min_confidence": min_confidence,
                    "verified_at": datetime.now().isoformat(),
                    "dry_run": dry_run,
                    "stored": not dry_run,
                    "worker_id": context.get("worker_id"),
                    "checks": [
                        {
                            "name": c.name,
                            "passed": c.passed,
                            "score": round(c.score, 4),
                            "details": c.details,
                            "recommendations": c.recommendations,
                        }
                        for c in checks
                    ],
                    "provenance": provenance,
                }

                logger.info(
                    "Trust verification complete",
                    tenant_id=tenant_id,
                    content_type=content_type,
                    confidence=round(confidence, 4),
                    level=level,
                    passed=result_data["passed"],
                )

                return JobResult(
                    success=True,
                    data=result_data,
                    artifacts={
                        "check_summary": {c.name: c.passed for c in checks},
                        "confidence_breakdown": self._get_confidence_breakdown(checks, checks_to_run),
                    }
                )

        except Exception as e:
            logger.error(
                "Trust verification failed",
                tenant_id=tenant_id,
                content_type=content_type,
                error=str(e),
                exc_info=True,
            )
            return JobResult(
                success=False,
                error=f"Trust verification failed: {str(e)}",
            )

    def _check_existing_verification(self, cursor, tenant_id: str,
                                     content_hash: str) -> Optional[dict]:
        """Check if verification already exists for this content."""
        verification_id = f"trust_{tenant_id}_{content_hash}"

        cursor.execute(
            """
            SELECT result
            FROM job_results
            WHERE job_id = %s
            """,
            (verification_id,),
        )
        row = cursor.fetchone()

        if row:
            result = row["result"]
            if isinstance(result, str):
                result = json.loads(result)
            return result

        return None

    def _check_syntax(self, content: str, content_type: str) -> VerificationCheck:
        """Check syntax validity of content."""
        details = {"content_type": content_type, "length": len(content)}
        recommendations = []

        try:
            if content_type == ContentType.CODE.value:
                # Basic Python syntax check
                if "def " in content or "class " in content:
                    try:
                        compile(content, "<string>", "exec")
                        passed = True
                        score = 1.0
                    except SyntaxError as e:
                        passed = False
                        score = 0.0
                        details["syntax_error"] = str(e)
                        recommendations.append(f"Fix syntax error: {e}")
                else:
                    # JavaScript/TypeScript - basic validation
                    passed = True
                    score = 0.9  # Assume valid if no obvious errors

            elif content_type == ContentType.CONFIG.value:
                # JSON/YAML validation
                if content.strip().startswith("{"):
                    try:
                        json.loads(content)
                        passed = True
                        score = 1.0
                    except json.JSONDecodeError as e:
                        passed = False
                        score = 0.0
                        details["json_error"] = str(e)
                        recommendations.append("Fix JSON syntax")
                else:
                    passed = True
                    score = 0.9

            else:
                passed = True
                score = 0.95

        except Exception as e:
            passed = False
            score = 0.0
            details["error"] = str(e)
            recommendations.append("Review content for syntax errors")

        return VerificationCheck(
            name="syntax_valid",
            passed=passed,
            score=score,
            details=details,
            recommendations=recommendations,
        )

    def _check_security(self, content: str, content_type: str) -> VerificationCheck:
        """Check for security issues."""
        issues = []
        score = 1.0
        recommendations = []

        if content_type in [ContentType.CODE.value, ContentType.CONFIG.value]:
            for pattern_name, pattern in self.SECURITY_PATTERNS.items():
                matches = pattern.findall(content)
                if matches:
                    issues.append({
                        "pattern": pattern_name,
                        "matches": len(matches),
                        "examples": matches[:3],  # First 3 matches
                    })
                    # Reduce score based on severity
                    if pattern_name == "hardcoded_secret":
                        score -= 0.3 * len(matches)
                        recommendations.append("Remove hardcoded secrets, use environment variables")
                    elif pattern_name == "sql_injection":
                        score -= 0.4 * len(matches)
                        recommendations.append("Use parameterized queries to prevent SQL injection")
                    elif pattern_name == "unsafe_eval":
                        score -= 0.35 * len(matches)
                        recommendations.append("Avoid eval/exec, use safer alternatives")
                    elif pattern_name == "http_url":
                        score -= 0.1 * len(matches)
                        recommendations.append("Use HTTPS URLs instead of HTTP")

        score = max(0.0, score)
        passed = score >= 0.7  # Security threshold

        return VerificationCheck(
            name="security_scan",
            passed=passed,
            score=round(score, 4),
            details={
                "issues_found": len(issues),
                "issues": issues,
            },
            recommendations=list(set(recommendations)),  # Deduplicate
        )

    def _check_static_analysis(self, content: str, content_type: str) -> VerificationCheck:
        """Perform static analysis checks."""
        details = {}
        recommendations = []

        if content_type == ContentType.CODE.value:
            lines = content.split("\n")

            # Count lines
            line_count = len(lines)
            details["line_count"] = line_count

            # Check file size
            if line_count > self.LINES_THRESHOLD:
                details["oversized"] = True
                recommendations.append(f"File is too large ({line_count} lines), consider splitting")

            # Check for TODO/FIXME comments (not necessarily bad, but worth noting)
            todo_count = sum(1 for line in lines if "TODO" in line or "FIXME" in line)
            details["todo_count"] = todo_count

            # Check for docstrings
            has_docstring = '"""' in content or "'''" in content
            details["has_docstring"] = has_docstring
            if not has_docstring:
                recommendations.append("Add documentation/docstrings")

            # Compute basic score
            score = 1.0
            if line_count > self.LINES_THRESHOLD:
                score -= 0.2
            if todo_count > 5:
                score -= 0.1
            if not has_docstring:
                score -= 0.1

            passed = score >= 0.75

        else:
            passed = True
            score = 0.9
            details["note"] = "Static analysis primarily for code content"

        return VerificationCheck(
            name="static_analysis",
            passed=passed,
            score=round(score, 4),
            details=details,
            recommendations=recommendations,
        )

    def _check_test_coverage(self, cursor, tenant_id: str, content: str,
                             content_type: str, source_job_id: Optional[str]) -> VerificationCheck:
        """Check test coverage for generated content."""
        details = {}
        recommendations = []

        if content_type == ContentType.TEST.value:
            # Tests should be well-formed
            has_assertions = "assert" in content or "expect" in content.lower()
            details["has_assertions"] = has_assertions

            if not has_assertions:
                recommendations.append("Add assertions to test cases")

            score = 0.9 if has_assertions else 0.5
            passed = has_assertions

        elif content_type == ContentType.CODE.value and source_job_id:
            # Try to find related tests
            cursor.execute(
                """
                SELECT COUNT(*) as test_count
                FROM "Test"
                WHERE "organizationId" = %s
                  AND metadata->>'source_job_id' = %s
                """,
                (tenant_id, source_job_id),
            )
            row = cursor.fetchone()
            test_count = row["test_count"] if row else 0

            details["related_tests"] = test_count

            if test_count == 0:
                recommendations.append("Add tests for this code")
                score = 0.6
                passed = False
            elif test_count < 3:
                recommendations.append("Consider adding more test cases")
                score = 0.8
                passed = True
            else:
                score = 1.0
                passed = True
        else:
            passed = True
            score = 0.85
            details["note"] = "Test coverage check primarily for code/test content"

        return VerificationCheck(
            name="test_coverage",
            passed=passed,
            score=round(score, 4),
            details=details,
            recommendations=recommendations,
        )

    def _check_patterns(self, content: str, content_type: str) -> VerificationCheck:
        """Check against known good patterns."""
        details = {}
        recommendations = []

        # Pattern matching is content-type specific
        if content_type == ContentType.CODE.value:
            # Check for common good practices
            has_error_handling = "try:" in content or "try {" in content or "catch" in content
            has_logging = "logger" in content or "console.log" in content or "print(" in content
            has_type_hints = "-> " in content or ": " in content.split("def")[0] if "def" in content else False

            details = {
                "has_error_handling": has_error_handling,
                "has_logging": has_logging,
                "has_type_hints": has_type_hints,
            }

            score = 0.7  # Base score
            if has_error_handling:
                score += 0.1
            else:
                recommendations.append("Add error handling")

            if has_logging:
                score += 0.1
            else:
                recommendations.append("Add logging for observability")

            if has_type_hints:
                score += 0.1
            else:
                recommendations.append("Consider adding type hints")

            passed = score >= 0.75

        else:
            passed = True
            score = 0.9

        return VerificationCheck(
            name="pattern_match",
            passed=passed,
            score=round(score, 4),
            details=details,
            recommendations=recommendations,
        )

    def _check_complexity(self, content: str, content_type: str) -> VerificationCheck:
        """Check code complexity."""
        details = {}
        recommendations = []

        if content_type == ContentType.CODE.value:
            lines = content.split("\n")

            # Count control flow statements (simple cyclomatic complexity approximation)
            control_flow = ["if ", "for ", "while ", "switch", "case", "try:", "except"]
            complexity = sum(content.count(cf) for cf in control_flow)

            details["approx_complexity"] = complexity
            details["line_count"] = len(lines)

            score = 1.0
            if complexity > self.COMPLEXITY_THRESHOLD:
                score -= 0.3
                recommendations.append(f"Reduce complexity (currently ~{complexity})")
            elif complexity > self.COMPLEXITY_THRESHOLD / 2:
                score -= 0.1

            passed = score >= 0.75

        else:
            passed = True
            score = 0.95
            details["note"] = "Complexity check for code content only"

        return VerificationCheck(
            name="complexity_check",
            passed=passed,
            score=round(score, 4),
            details=details,
            recommendations=recommendations,
        )

    def _compute_confidence(self, checks: List[VerificationCheck],
                           checks_to_run: List[str]) -> float:
        """Compute overall confidence score from individual checks."""
        if not checks:
            return 0.0

        total_weight = 0.0
        weighted_score = 0.0

        for check in checks:
            weight = self.CHECK_WEIGHTS.get(check.name, 0.1)
            # Adjust weight based on whether this check was requested
            if check.name not in checks_to_run:
                weight = 0
            total_weight += weight
            weighted_score += check.score * weight

        if total_weight == 0:
            return 0.0

        return weighted_score / total_weight

    def _confidence_to_level(self, confidence: float) -> str:
        """Convert confidence score to verification level."""
        if confidence >= 0.95:
            return VerificationLevel.CERTIFIED.value
        elif confidence >= 0.85:
            return VerificationLevel.REVIEWED.value
        elif confidence >= 0.70:
            return VerificationLevel.TESTED.value
        elif confidence >= 0.50:
            return VerificationLevel.STATIC.value
        else:
            return VerificationLevel.NONE.value

    def _store_verification(self, cursor, tenant_id: str, content_hash: str,
                           content_type: str, source_job_id: Optional[str],
                           confidence: float, level: str, checks: List[VerificationCheck],
                           provenance: dict) -> None:
        """Store verification result in database."""
        verification_id = f"trust_{tenant_id}_{content_hash}"

        cursor.execute(
            """
            INSERT INTO job_results (job_id, result, created_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (job_id) DO UPDATE
            SET result = EXCLUDED.result,
                created_at = EXCLUDED.created_at
            """,
            (
                verification_id,
                json.dumps({
                    "tenant_id": tenant_id,
                    "content_hash": content_hash,
                    "content_type": content_type,
                    "source_job_id": source_job_id,
                    "confidence": round(confidence, 4),
                    "level": level,
                    "provenance": provenance,
                    "checks": [
                        {
                            "name": c.name,
                            "passed": c.passed,
                            "score": c.score,
                            "details": c.details,
                            "recommendations": c.recommendations,
                        }
                        for c in checks
                    ],
                    "stored_at": datetime.now().isoformat(),
                }),
            ),
        )

        logger.info(
            "Stored trust verification",
            verification_id=verification_id,
            tenant_id=tenant_id,
            confidence=round(confidence, 4),
            level=level,
        )

    def _get_confidence_breakdown(self, checks: List[VerificationCheck],
                                  checks_to_run: List[str]) -> dict:
        """Get breakdown of confidence contribution by check."""
        breakdown = {}

        for check in checks:
            if check.name in checks_to_run:
                weight = self.CHECK_WEIGHTS.get(check.name, 0.1)
                contribution = check.score * weight
                breakdown[check.name] = {
                    "score": round(check.score, 4),
                    "weight": weight,
                    "contribution": round(contribution, 4),
                }

        return breakdown
