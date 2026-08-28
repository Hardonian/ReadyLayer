"""
CI optimization module for risk-based test selection.
"""

import json
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from readiness_intel.models import ChangeImpactAnalysis, RiskLevel


class TestTier(str, Enum):
    """Test tiers for CI optimization."""

    SMOKE = "smoke"  # Fast sanity checks
    UNIT = "unit"  # Unit tests
    INTEGRATION = "integration"  # Integration tests
    E2E = "e2e"  # E2E tests
    VISUAL = "visual"  # Visual regression
    STRESS = "stress"  # Stress/load tests
    FULL_REGRESSION = "full_regression"  # Complete suite


@dataclass
class TestSelection:
    """Selected tests for a CI run."""

    tier: TestTier
    tests_to_run: List[str]
    tests_to_skip: List[str]
    estimated_duration_minutes: float
    explanation: str
    confidence: float


class TestSelector:
    """Selects appropriate tests based on risk analysis."""

    # Test suite definitions
    TEST_SUITES = {
        TestTier.SMOKE: {
            "tests": ["lint", "typecheck", "build"],
            "duration": 2,
        },
        TestTier.UNIT: {
            "tests": ["vitest:unit", "vitest:components"],
            "duration": 5,
        },
        TestTier.INTEGRATION: {
            "tests": ["vitest:integration", "api:tests"],
            "duration": 8,
        },
        TestTier.E2E: {
            "tests": [
                "e2e:auth",
                "e2e:dashboard",
                "e2e:billing",
                "e2e:golden-path",
            ],
            "duration": 15,
        },
        TestTier.VISUAL: {
            "tests": [
                "visual:desktop",
                "visual:mobile",
                "visual:tablet",
                "visual:dark-mode",
            ],
            "duration": 12,
        },
        TestTier.STRESS: {
            "tests": [
                "stress:api",
                "stress:workers",
                "stress:concurrent-users",
            ],
            "duration": 20,
        },
        TestTier.FULL_REGRESSION: {
            "tests": [
                "lint", "typecheck", "build",
                "vitest:unit", "vitest:integration", "vitest:full",
                "e2e:full",
                "visual:full",
                "stress:full",
            ],
            "duration": 45,
        },
    }

    def __init__(self, base_duration_estimate: float = 45.0):
        self.base_duration_estimate = base_duration_estimate

    def select_tests(
        self,
        impact_analysis: ChangeImpactAnalysis,
        changed_files: List[str],
    ) -> TestSelection:
        """Select tests based on risk analysis."""

        # Determine base tier from risk level
        risk_to_tier = {
            RiskLevel.CRITICAL: TestTier.FULL_REGRESSION,
            RiskLevel.HIGH: TestTier.STRESS,
            RiskLevel.MEDIUM: TestTier.E2E,
            RiskLevel.LOW: TestTier.UNIT,
        }

        base_tier = risk_to_tier[impact_analysis.overall_risk]

        # Customize based on file changes
        selected_tests = self._customize_tests(
            base_tier,
            changed_files,
            impact_analysis.file_predictions
        )

        # Calculate duration
        duration = self._calculate_duration(selected_tests)

        # Determine what to skip
        all_tests = self.TEST_SUITES[TestTier.FULL_REGRESSION]["tests"]
        tests_to_skip = [t for t in all_tests if t not in selected_tests]

        # Generate explanation
        explanation = self._generate_explanation(
            impact_analysis,
            base_tier,
            selected_tests
        )

        return TestSelection(
            tier=base_tier,
            tests_to_run=selected_tests,
            tests_to_skip=tests_to_skip,
            estimated_duration_minutes=duration,
            explanation=explanation,
            confidence=impact_analysis.risk_confidence,
        )

    def _customize_tests(
        self,
        base_tier: TestTier,
        changed_files: List[str],
        file_predictions: List[Any],
    ) -> List[str]:
        """Customize test selection based on specific file changes."""
        base_tests = self.TEST_SUITES[base_tier]["tests"].copy()

        # Add targeted tests based on file types
        additional_tests = []

        for file_path in changed_files:
            if "app/(app)/" in file_path:
                additional_tests.extend(["e2e:dashboard", "e2e:auth"])
            if "app/(public)/" in file_path:
                additional_tests.extend(["e2e:landing", "visual:desktop"])
            if "components/ui" in file_path:
                additional_tests.extend(["visual:desktop", "visual:mobile", "visual:dark-mode"])
            if "billing" in file_path:
                additional_tests.extend(["e2e:billing", "integration:billing"])
            if "workers" in file_path:
                additional_tests.extend(["stress:workers", "integration:workers"])
            if "backend" in file_path:
                additional_tests.extend(["api:tests", "stress:api"])
            if "e2e" in file_path:
                additional_tests.extend(["e2e:full"])

        # Check file predictions for specific test recommendations
        for prediction in file_predictions:
            for test in prediction.recommended_tests:
                if test not in additional_tests:
                    additional_tests.append(test)

        # Merge and deduplicate
        combined = list(dict.fromkeys(base_tests + additional_tests))

        return combined

    def _calculate_duration(self, tests: List[str]) -> float:
        """Estimate CI duration for selected tests."""
        # Rough estimation based on test types
        duration = 0.0

        for test in tests:
            if "lint" in test or "typecheck" in test:
                duration += 1
            elif "build" in test:
                duration += 2
            elif "unit" in test:
                duration += 3
            elif "integration" in test:
                duration += 5
            elif "e2e" in test:
                duration += 8
            elif "visual" in test:
                duration += 6
            elif "stress" in test:
                duration += 15
            else:
                duration += 3

        return duration

    def _generate_explanation(
        self,
        impact_analysis: ChangeImpactAnalysis,
        tier: TestTier,
        selected_tests: List[str],
    ) -> str:
        """Generate human-readable explanation for test selection."""
        parts = []

        parts.append(
            f"Test tier selected: {tier.value.upper()} "
            f"(risk level: {impact_analysis.overall_risk.value})"
        )

        if impact_analysis.invariant_risks:
            parts.append(
                f"At-risk invariants ({len(impact_analysis.invariant_risks)}): "
                f"{', '.join(impact_analysis.invariant_risks[:3])}"
            )

        high_risk_files = [
            p.target for p in impact_analysis.file_predictions
            if p.risk_level in [RiskLevel.CRITICAL, RiskLevel.HIGH]
        ]
        if high_risk_files:
            parts.append(
                f"High-risk files driving test selection: {', '.join(high_risk_files[:3])}"
            )

        parts.append(f"Selected {len(selected_tests)} test jobs")

        return "; ".join(parts)


class CIOptimizer:
    """Main CI optimizer that integrates with GitHub Actions."""

    def __init__(
        self,
        output_dir: Path,
        test_selector: Optional[TestSelector] = None,
    ):
        self.output_dir = Path(output_dir)
        self.test_selector = test_selector or TestSelector()

    def optimize_for_pr(
        self,
        impact_analysis: ChangeImpactAnalysis,
    ) -> Dict[str, Any]:
        """Generate CI optimization configuration for a PR."""

        # Select tests
        changed_files = [f.path for f in impact_analysis.files_changed]
        test_selection = self.test_selector.select_tests(
            impact_analysis,
            changed_files
        )

        # Generate GitHub Actions matrix
        matrix = self._generate_matrix(test_selection)

        # Generate skip conditions
        skip_conditions = self._generate_skip_conditions(test_selection)

        result = {
            "risk_level": impact_analysis.overall_risk.value,
            "risk_confidence": impact_analysis.risk_confidence,
            "test_tier": test_selection.tier.value,
            "estimated_duration_minutes": test_selection.estimated_duration_minutes,
            "tests_to_run": test_selection.tests_to_run,
            "tests_to_skip": test_selection.tests_to_skip,
            "github_actions_matrix": matrix,
            "skip_conditions": skip_conditions,
            "explanation": test_selection.explanation,
            "invariant_risks": impact_analysis.invariant_risks,
            "predicted_readiness_delta": impact_analysis.predicted_readiness_delta,
        }

        # Write to file
        output_file = self.output_dir / "ci-optimization.json"
        with open(output_file, 'w') as f:
            json.dump(result, f, indent=2)

        return result

    def _generate_matrix(self, test_selection: TestSelection) -> Dict[str, Any]:
        """Generate GitHub Actions matrix configuration."""
        include = []

        # Map tests to matrix entries
        test_mapping = {
            "lint": {"name": "Lint", "cmd": "npm run lint"},
            "typecheck": {"name": "Type Check", "cmd": "npm run typecheck"},
            "build": {"name": "Build", "cmd": "npm run build"},
            "vitest:unit": {"name": "Unit Tests", "cmd": "npm run test:unit"},
            "vitest:integration": {"name": "Integration Tests", "cmd": "npm run test:integration"},
            "e2e:auth": {"name": "E2E - Auth", "cmd": "npm run test:e2e -- auth.spec.ts"},
            "e2e:dashboard": {"name": "E2E - Dashboard", "cmd": "npm run test:e2e -- dashboard.spec.ts"},
            "e2e:billing": {"name": "E2E - Billing", "cmd": "npm run test:e2e -- billing.spec.ts"},
            "e2e:golden-path": {"name": "E2E - Golden Path", "cmd": "npm run test:e2e -- golden-path.test.ts"},
            "e2e:full": {"name": "E2E - Full Suite", "cmd": "npm run test:e2e"},
            "visual:desktop": {"name": "Visual - Desktop", "cmd": "npm run test:visual -- --project=desktop"},
            "visual:mobile": {"name": "Visual - Mobile", "cmd": "npm run test:visual -- --project=mobile"},
            "visual:dark-mode": {"name": "Visual - Dark Mode", "cmd": "npm run test:visual -- --project=desktop --grep=dark"},
            "stress:api": {"name": "Stress - API", "cmd": "npm run test:stress:api"},
            "stress:workers": {"name": "Stress - Workers", "cmd": "npm run test:stress:workers"},
        }

        for test in test_selection.tests_to_run:
            if test in test_mapping:
                include.append(test_mapping[test])

        return {"include": include}

    def _generate_skip_conditions(self, test_selection: TestSelection) -> Dict[str, bool]:
        """Generate conditions for skipping tests."""
        all_tests = TestSelector.TEST_SUITES[TestTier.FULL_REGRESSION]["tests"]

        return {
            test: test in test_selection.tests_to_skip
            for test in all_tests
        }

    def should_run_full_suite(self, impact_analysis: ChangeImpactAnalysis) -> bool:
        """Determine if full test suite should run."""
        return impact_analysis.overall_risk in [RiskLevel.CRITICAL, RiskLevel.HIGH]

    def get_savings_estimate(
        self,
        test_selection: TestSelection,
    ) -> Dict[str, Any]:
        """Estimate time/cost savings from optimization."""
        full_duration = TestSelector.TEST_SUITES[TestTier.FULL_REGRESSION]["duration"]
        selected_duration = test_selection.estimated_duration_minutes

        savings_minutes = full_duration - selected_duration
        savings_percent = (savings_minutes / full_duration) * 100 if full_duration > 0 else 0

        return {
            "full_suite_duration": full_duration,
            "selected_duration": selected_duration,
            "savings_minutes": savings_minutes,
            "savings_percent": round(savings_percent, 1),
            "tests_eliminated": len(test_selection.tests_to_skip),
            "tests_run": len(test_selection.tests_to_run),
        }
