"""
Severity classifier for findings.
Applies severity rules based on category, error type, and context.
"""

from readiness_engine.models import Category, Finding, Severity


class SeverityClassifier:
    """
    Classifies findings by severity based on type and context.

    Severity rules:
    BLOCKER:
    - Build failure
    - Typecheck failure
    - Route hard-500
    - Uncaught Playwright error

    HIGH:
    - Visual regression on critical route
    - Console errors in E2E tests
    - Broken navigation or CTA

    MEDIUM/LOW:
    - Cosmetic issues
    - Non-blocking lint warnings
    """

    # Rules that should always be BLOCKER regardless of source
    BLOCKER_RULES = {
        "typescript/config-error",
        "build/missing-module",
        "build/compilation-error",
        "build/failed",
    }

    # Critical routes that escalate UI issues to HIGH
    CRITICAL_ROUTES = {
        "homepage",
        "signin",
        "signin-loaded",
        "signin-dark",
        "dashboard",
        "billing",
        "checkout",
        "payment",
    }

    def classify(self, finding: Finding) -> None:
        """
        Apply severity classification to a finding.
        Modifies the finding in place.
        """
        # Check for absolute blocker rules
        if finding.rule_id in self.BLOCKER_RULES:
            finding.severity = Severity.BLOCKER
            return

        # Type errors are always blockers
        if finding.category == Category.TYPE:
            finding.severity = Severity.BLOCKER
            return

        # Build errors are always blockers
        if finding.category == Category.BUILD:
            finding.severity = Severity.BLOCKER
            return

        # UI issues on critical routes are HIGH
        if finding.category == Category.UI:
            location_lower = finding.location.lower()
            if any(route in location_lower for route in self.CRITICAL_ROUTES):
                if finding.severity == Severity.MEDIUM:
                    finding.severity = Severity.HIGH
            return

        # Test failures are at least HIGH
        if finding.category == Category.TEST:
            if finding.severity in (Severity.MEDIUM, Severity.LOW):
                finding.severity = Severity.HIGH
            return

        # Lint errors are HIGH, warnings are MEDIUM
        if finding.category == Category.LINT:
            if "error" in finding.rule_id.lower():
                finding.severity = Severity.HIGH
            elif finding.severity == Severity.BLOCKER:
                finding.severity = Severity.HIGH
            return

        # Default: keep as-is if already set
        pass

    def should_block_deployment(self, finding: Finding) -> bool:
        """Check if a finding should block deployment."""
        return finding.severity in (Severity.BLOCKER, Severity.HIGH)
