"""
Change impact analysis engine for predicting risk from PR diffs.
"""

import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

from readiness_intel.models import (
    ChangeImpactAnalysis,
    ChangeType,
    DependencyChange,
    FileChange,
    FileRiskProfile,
    HistoricalDataset,
    RiskLevel,
    RiskPrediction,
)


class DiffParser:
    """Parse git diff output to extract file changes."""

    def __init__(self, repo_path: Path):
        self.repo_path = Path(repo_path)

    def parse_diff(self, diff_content: str) -> List[FileChange]:
        """Parse git diff string into FileChange objects."""
        changes = []

        # Split by file diff headers
        file_diffs = re.split(r'diff --git ', diff_content)[1:]

        for diff in file_diffs:
            lines = diff.split('\n')

            # Extract file path from header
            match = re.match(r'a/(.+) b/(.+)', lines[0])
            if not match:
                continue

            old_path = match.group(1)
            new_path = match.group(2)

            # Determine change type
            if old_path == '/dev/null':
                change_type = ChangeType.ADDITION
                path = new_path
            elif new_path == '/dev/null':
                change_type = ChangeType.DELETION
                path = old_path
            elif old_path != new_path:
                change_type = ChangeType.RENAME
                path = new_path
            else:
                change_type = ChangeType.MODIFICATION
                path = new_path

            # Count lines
            lines_added = 0
            lines_removed = 0
            for line in diff.split('\n'):
                if line.startswith('+') and not line.startswith('+++'):
                    lines_added += 1
                elif line.startswith('-') and not line.startswith('---'):
                    lines_removed += 1

            changes.append(FileChange(
                path=path,
                change_type=change_type,
                lines_added=lines_added,
                lines_removed=lines_removed,
                patch=diff,
            ))

        return changes

    def parse_from_git(
        self,
        commit_sha: str,
        base_ref: str = "HEAD~1"
    ) -> List[FileChange]:
        """Get changes from git diff."""
        try:
            from git import Repo
            repo = Repo(self.repo_path)
            commit = repo.commit(commit_sha)

            if commit.parents:
                parent = commit.parents[0]
                diff = parent.diff(commit, create_patch=True)
            else:
                # First commit, diff against empty tree
                diff = commit.diff(create_patch=True)

            changes = []
            for diff_item in diff:
                # Determine change type
                if diff_item.new_file:
                    change_type = ChangeType.ADDITION
                elif diff_item.deleted_file:
                    change_type = ChangeType.DELETION
                elif diff_item.rename_from != diff_item.rename_to:
                    change_type = ChangeType.RENAME
                else:
                    change_type = ChangeType.MODIFICATION

                # Get line counts from patch
                patch = diff_item.diff.decode('utf-8', errors='replace') if diff_item.diff else ""
                lines_added = patch.count('\n+') - patch.count('\n+++')
                lines_removed = patch.count('\n-') - patch.count('\n---')

                changes.append(FileChange(
                    path=diff_item.b_path or diff_item.a_path,
                    change_type=change_type,
                    lines_added=max(lines_added, 0),
                    lines_removed=max(lines_removed, 0),
                    patch=patch,
                ))

            return changes
        except Exception as e:
            print(f"Error parsing git diff: {e}")
            return []


class DependencyAnalyzer:
    """Analyze dependency changes from package files."""

    def __init__(self, repo_path: Path):
        self.repo_path = Path(repo_path)

    def analyze_changes(
        self,
        files_changed: List[FileChange]
    ) -> List[DependencyChange]:
        """Extract dependency changes from file changes."""
        dep_changes = []

        for change in files_changed:
            if self._is_dependency_file(change.path):
                deps = self._extract_dependencies(change)
                dep_changes.extend(deps)

        return dep_changes

    def _is_dependency_file(self, path: str) -> bool:
        """Check if file is a dependency file."""
        dep_files = [
            'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
            'requirements.txt', 'Pipfile', 'Pipfile.lock', 'pyproject.toml',
            'Cargo.toml', 'Cargo.lock', 'Gemfile', 'Gemfile.lock',
            'go.mod', 'go.sum', 'composer.json', 'composer.lock',
        ]
        return any(path.endswith(f) for f in dep_files)

    def _extract_dependencies(self, change: FileChange) -> List[DependencyChange]:
        """Extract dependency changes from a file change."""
        # This is a simplified version - real implementation would parse the files
        deps = []

        if 'package.json' in change.path and change.change_type != ChangeType.DELETION:
            # Parse package.json changes
            # In production, this would use proper JSON parsing
            pass

        return deps


class InvariantRiskAnalyzer:
    """Analyze which invariants are at risk from code changes."""

    # Map file patterns to invariants they might affect
    INVARIANT_MAP = {
        'app/(app)/': ['route_stability', 'auth_required', 'no_hard_500'],
        'app/(public)/': ['route_stability', 'public_accessibility'],
        'components/ui/': ['ui_consistency', 'accessibility'],
        'hooks/': ['hook_safety', 'no_infinite_loops'],
        'lib/': ['api_contracts', 'type_safety'],
        'backend/': ['api_contracts', 'auth_enforcement'],
        'billing/': ['billing_integrity', 'payment_flows'],
        'workers/': ['worker_reliability', 'queue_safety'],
        'e2e/': ['test_coverage', 'golden_path'],
        'tests/invariants/': ['governance_enforcement'],
        'prisma/': ['schema_consistency', 'migration_safety'],
        'middleware/': ['auth_middleware', 'route_protection'],
    }

    def __init__(self, dataset: HistoricalDataset):
        self.dataset = dataset

    def analyze(self, files_changed: List[FileChange]) -> List[str]:
        """Determine which invariants are at risk."""
        at_risk = set()

        for change in files_changed:
            invariants = self._map_file_to_invariants(change.path)
            at_risk.update(invariants)

        # Cross-reference with historical failures
        for invariant in list(at_risk):
            if self._has_historical_failures(invariant):
                at_risk.add(f"{invariant} (historical_failure)")

        return sorted(at_risk)

    def _map_file_to_invariants(self, file_path: str) -> Set[str]:
        """Map a file path to potentially affected invariants."""
        invariants = set()

        for pattern, inv_list in self.INVARIANT_MAP.items():
            if pattern in file_path or file_path.startswith(pattern.rstrip('/')):
                invariants.update(inv_list)

        return invariants

    def _has_historical_failures(self, invariant: str) -> bool:
        """Check if invariant has historical failures."""
        # Search for invariant-related failures in dataset
        invariant_keywords = invariant.replace('_', '')

        for finding in self.dataset.findings:
            if invariant_keywords.lower() in finding.rule_id.lower():
                return True

        return False


class ChangeImpactAnalyzer:
    """Main analyzer for predicting impact of code changes."""

    def __init__(
        self,
        dataset: HistoricalDataset,
        repo_path: Optional[Path] = None,
    ):
        self.dataset = dataset
        self.repo_path = repo_path
        self.diff_parser = DiffParser(repo_path) if repo_path else None
        self.dep_analyzer = DependencyAnalyzer(repo_path) if repo_path else None
        self.invariant_analyzer = InvariantRiskAnalyzer(dataset)

    def analyze_pr(
        self,
        files_changed: List[FileChange],
        commit_sha: str,
        branch: str,
        author: str,
    ) -> ChangeImpactAnalysis:
        """Analyze a PR/diff and predict impact."""
        # Analyze dependencies
        deps_changed = []
        if self.dep_analyzer:
            deps_changed = self.dep_analyzer.analyze_changes(files_changed)

        # Analyze file risks
        file_predictions = []
        for change in files_changed:
            prediction = self._predict_file_risk(change)
            file_predictions.append(prediction)

        # Analyze invariant risks
        invariant_risks = self.invariant_analyzer.analyze(files_changed)

        # Compute overall risk
        overall_risk, risk_confidence = self._compute_overall_risk(
            file_predictions,
            deps_changed,
            invariant_risks
        )

        # Predict readiness delta
        readiness_delta = self._predict_readiness_delta(file_predictions)

        # Determine test strategy
        test_strategy = self._determine_test_strategy(overall_risk, files_changed)

        # Estimate CI duration
        ci_duration = self._estimate_ci_duration(overall_risk, files_changed)

        # Generate explanation
        explanation = self._generate_explanation(
            overall_risk,
            file_predictions,
            invariant_risks,
            deps_changed
        )

        return ChangeImpactAnalysis(
            commit_sha=commit_sha,
            branch=branch,
            author=author,
            files_changed=files_changed,
            dependencies_changed=deps_changed,
            overall_risk=overall_risk,
            risk_confidence=risk_confidence,
            file_predictions=file_predictions,
            predicted_readiness_delta=readiness_delta,
            recommended_test_strategy=test_strategy,
            estimated_ci_duration=ci_duration,
            invariant_risks=invariant_risks,
            explanation=explanation,
        )

    def _predict_file_risk(self, change: FileChange) -> RiskPrediction:
        """Predict risk for a single file change."""
        # Look up file in historical profiles
        file_profile = None
        for profile in self.dataset.file_profiles:
            if profile.path == change.path:
                file_profile = profile
                break

        # Base risk on historical data
        if file_profile:
            if file_profile.failure_frequency > 0.3:
                base_risk = RiskLevel.CRITICAL
            elif file_profile.failure_frequency > 0.15:
                base_risk = RiskLevel.HIGH
            elif file_profile.failure_frequency > 0.05:
                base_risk = RiskLevel.MEDIUM
            else:
                base_risk = RiskLevel.LOW

            confidence = min(file_profile.failure_frequency * 2 + 0.3, 0.95)

            # Predict categories and severities
            predicted_cats = [
                (cat, count / file_profile.total_failures)
                for cat, count in file_profile.category_distribution.items()
            ][:3]

            predicted_sevs = [
                (sev, count / file_profile.total_failures)
                for sev, count in file_profile.severity_distribution.items()
            ][:3]

            similar_failures = [f"{rule}: {count}" for rule, count in file_profile.top_issues[:3]]

            risk_factors = []
            if file_profile.flaky_score > 0.5:
                risk_factors.append(f"High flake probability ({file_profile.flaky_score:.0%})")
            if file_profile.instability_trend == "degrading":
                risk_factors.append("Degrading stability trend")
            if file_profile.total_failures > 10:
                risk_factors.append(f"{file_profile.total_failures} historical failures")
        else:
            # New file - moderate risk
            base_risk = RiskLevel.MEDIUM
            confidence = 0.5
            predicted_cats = []
            predicted_sevs = []
            similar_failures = []
            risk_factors = ["New file - no historical data"]

        # Adjust for change type
        if change.change_type == ChangeType.ADDITION:
            # New files are riskier
            if base_risk == RiskLevel.LOW:
                base_risk = RiskLevel.MEDIUM
            risk_factors.append("New file addition")
        elif change.change_type == ChangeType.MODIFICATION:
            # Large changes are riskier
            total_lines = change.lines_added + change.lines_removed
            if total_lines > 100:
                risk_factors.append(f"Large change ({total_lines} lines)")
                if base_risk == RiskLevel.LOW:
                    base_risk = RiskLevel.MEDIUM

        # Get affected invariants
        affected_invariants = list(self.invariant_analyzer._map_file_to_invariants(change.path))

        # Recommend tests
        recommended_tests = self._recommend_tests_for_file(change.path, base_risk)

        return RiskPrediction(
            target=change.path,
            risk_level=base_risk,
            confidence=confidence,
            predicted_categories=predicted_cats,
            predicted_severities=predicted_sevs,
            affected_invariants=affected_invariants,
            recommended_tests=recommended_tests,
            risk_factors=risk_factors,
            similar_historical_failures=similar_failures,
        )

    def _recommend_tests_for_file(self, file_path: str, risk_level: RiskLevel) -> List[str]:
        """Recommend tests based on file and risk."""
        tests = []

        # Map file types to tests
        if 'app/(app)' in file_path:
            tests.extend(['auth-flow', 'dashboard-routes'])
        if 'app/(public)' in file_path:
            tests.extend(['public-routes', 'landing-page'])
        if 'components/ui' in file_path:
            tests.extend(['visual-regression', 'component-library'])
        if 'billing' in file_path:
            tests.extend(['billing-workflow', 'payment-flow'])
        if 'e2e' in file_path:
            tests.extend(['golden-path', 'complete-flow'])

        # Add risk-based tests
        if risk_level in [RiskLevel.CRITICAL, RiskLevel.HIGH]:
            tests.extend(['stress-test', 'full-regression'])

        return list(set(tests))

    def _compute_overall_risk(
        self,
        file_predictions: List[RiskPrediction],
        deps_changed: List[DependencyChange],
        invariant_risks: List[str]
    ) -> Tuple[RiskLevel, float]:
        """Compute overall risk level and confidence."""
        if not file_predictions:
            return RiskLevel.LOW, 0.9

        # Count risk levels
        risk_counts = {level: 0 for level in RiskLevel}
        confidences = []

        for pred in file_predictions:
            risk_counts[pred.risk_level] += 1
            confidences.append(pred.confidence)

        # Determine overall risk
        if risk_counts[RiskLevel.CRITICAL] > 0:
            overall = RiskLevel.CRITICAL
        elif risk_counts[RiskLevel.HIGH] >= 2 or risk_counts[RiskLevel.HIGH] > len(file_predictions) * 0.3:
            overall = RiskLevel.HIGH
        elif risk_counts[RiskLevel.MEDIUM] > len(file_predictions) * 0.5:
            overall = RiskLevel.MEDIUM
        else:
            overall = RiskLevel.LOW

        # Adjust for dependencies
        if deps_changed:
            if overall == RiskLevel.LOW:
                overall = RiskLevel.MEDIUM

        # Adjust for invariants
        if len(invariant_risks) > 3:
            if overall == RiskLevel.LOW:
                overall = RiskLevel.MEDIUM

        # Confidence is average of individual confidences
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.5

        return overall, avg_confidence

    def _predict_readiness_delta(self, file_predictions: List[RiskPrediction]) -> float:
        """Predict change in readiness score."""
        if not file_predictions:
            return 0.0

        # Calculate weighted risk score
        risk_weights = {
            RiskLevel.CRITICAL: -15.0,
            RiskLevel.HIGH: -8.0,
            RiskLevel.MEDIUM: -3.0,
            RiskLevel.LOW: -0.5,
        }

        total_delta = sum(
            risk_weights[pred.risk_level] * pred.confidence
            for pred in file_predictions
        )

        # Normalize by file count
        return total_delta / len(file_predictions)

    def _determine_test_strategy(self, risk: RiskLevel, files: List[FileChange]) -> str:
        """Determine recommended test strategy."""
        strategies = {
            RiskLevel.CRITICAL: "full_suite_stress",
            RiskLevel.HIGH: "expanded_suite",
            RiskLevel.MEDIUM: "standard_suite",
            RiskLevel.LOW: "reduced_suite",
        }

        base_strategy = strategies[risk]

        # Adjust for file count
        if len(files) > 20:
            if base_strategy == "reduced_suite":
                base_strategy = "standard_suite"

        return base_strategy

    def _estimate_ci_duration(self, risk: RiskLevel, files: List[FileChange]) -> float:
        """Estimate CI duration in minutes."""
        base_durations = {
            RiskLevel.CRITICAL: 45.0,
            RiskLevel.HIGH: 30.0,
            RiskLevel.MEDIUM: 15.0,
            RiskLevel.LOW: 8.0,
        }

        return base_durations[risk]

    def _generate_explanation(
        self,
        overall_risk: RiskLevel,
        file_predictions: List[RiskPrediction],
        invariant_risks: List[str],
        deps_changed: List[DependencyChange]
    ) -> str:
        """Generate human-readable explanation."""
        parts = []

        # Overall assessment
        risk_desc = {
            RiskLevel.CRITICAL: "CRITICAL RISK: High probability of failure",
            RiskLevel.HIGH: "HIGH RISK: Elevated chance of issues",
            RiskLevel.MEDIUM: "MEDIUM RISK: Moderate chance of issues",
            RiskLevel.LOW: "LOW RISK: Unlikely to cause issues",
        }
        parts.append(risk_desc[overall_risk])

        # File analysis
        high_risk_files = [p for p in file_predictions if p.risk_level in [RiskLevel.CRITICAL, RiskLevel.HIGH]]
        if high_risk_files:
            parts.append(f"\nHigh-risk files ({len(high_risk_files)}):")
            for pred in high_risk_files[:5]:
                parts.append(f"  - {pred.target}: {', '.join(pred.risk_factors[:2])}")

        # Invariants
        if invariant_risks:
            parts.append(f"\nAt-risk invariants ({len(invariant_risks)}): {', '.join(invariant_risks[:5])}")

        # Dependencies
        if deps_changed:
            parts.append(f"\nDependency changes ({len(deps_changed)}): {', '.join(d.package for d in deps_changed[:3])}")

        return "\n".join(parts)
