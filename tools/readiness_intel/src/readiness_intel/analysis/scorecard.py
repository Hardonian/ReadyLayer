"""
Scorecard generator for creating readiness scorecards with predictions.
"""

import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from readiness_intel.models import (
    HistoricalDataset,
    ReadinessScorecard,
    ReadinessTrend,
    ReadinessVerdict,
)


class ScorecardGenerator:
    """Generates readiness scorecards from historical data and current state."""

    def __init__(
        self,
        dataset: HistoricalDataset,
        analysis_window_days: int = 30,
    ):
        self.dataset = dataset
        self.analysis_window_days = analysis_window_days

    def generate(
        self,
        current_verdict: Optional[ReadinessVerdict] = None,
        commit_sha: Optional[str] = None,
        branch: Optional[str] = None,
    ) -> ReadinessScorecard:
        """Generate a complete readiness scorecard."""

        # Compute current readiness score
        if current_verdict:
            current_score = self._compute_readiness_score(current_verdict)
            current_findings = len(current_verdict.findings)
            current_status = "PASS" if current_verdict.ready else "FAIL"
            commit_sha = current_verdict.commit_sha or commit_sha
            branch = current_verdict.branch or branch
        else:
            current_score = 0.0
            current_findings = 0
            current_status = "UNKNOWN"

        # Build trend from historical data
        trend = self._build_trend()

        # Analyze trend direction
        trend_direction, trend_confidence = self._analyze_trend(trend)

        # Identify risk areas
        predicted_risk_areas = self._identify_risk_areas()

        # Get high-risk files
        high_risk_files = self._get_high_risk_files()

        # Identify fragile subsystems
        fragile_subsystems = self._identify_fragile_subsystems()

        # Generate recommendations
        recommended_test_focus = self._recommend_test_focus()
        recommended_reviews = self._recommend_reviews()

        # Compute statistics
        historical_stats = self._compute_historical_stats()

        # Compute confidence interval
        confidence_interval = self._compute_confidence_interval(current_score, trend)

        return ReadinessScorecard(
            version="1.0.0",
            timestamp=datetime.utcnow(),
            commit_sha=commit_sha,
            branch=branch,
            current_readiness_score=current_score,
            current_findings_count=current_findings,
            current_status=current_status,
            trend=trend,
            trend_direction=trend_direction,
            trend_confidence=trend_confidence,
            predicted_risk_areas=predicted_risk_areas,
            high_risk_files=high_risk_files,
            fragile_subsystems=fragile_subsystems,
            recommended_test_focus=recommended_test_focus,
            recommended_reviews=recommended_reviews,
            historical_stats=historical_stats,
            confidence_interval=confidence_interval,
            analysis_window_days=self.analysis_window_days,
            total_historical_runs=self.dataset.total_runs,
        )

    def _compute_readiness_score(self, verdict: ReadinessVerdict) -> float:
        """Compute a readiness score from 0-100 based on findings."""
        if not verdict.findings:
            return 100.0

        # Weight by severity
        weights = {
            "BLOCKER": 20,
            "HIGH": 10,
            "MEDIUM": 5,
            "LOW": 1,
        }

        total_penalty = sum(
            weights.get(f.severity, 5)
            for f in verdict.findings
        )

        # Normalize to 0-100 scale
        score = max(0, 100 - total_penalty)
        return score

    def _build_trend(self) -> List[ReadinessTrend]:
        """Build trend data from last 10 runs."""
        # Group findings by run (commit_sha + timestamp)
        runs: Dict[Tuple[str, str], List[Any]] = {}

        for finding in self.dataset.findings:
            if finding.timestamp:
                key = (
                    finding.commit_sha or "unknown",
                    finding.timestamp.strftime("%Y-%m-%d")
                )
                if key not in runs:
                    runs[key] = []
                runs[key].append(finding)

        # Build trend points
        trend = []
        for (commit_sha, date_str), findings in list(runs.items())[-10:]:
            blocker_count = sum(1 for f in findings if f.severity == "BLOCKER")
            high_count = sum(1 for f in findings if f.severity == "HIGH")
            medium_count = sum(1 for f in findings if f.severity == "MEDIUM")
            low_count = sum(1 for f in findings if f.severity == "LOW")

            # Compute score
            weights = {"BLOCKER": 20, "HIGH": 10, "MEDIUM": 5, "LOW": 1}
            penalty = sum(weights.get(f.severity, 5) for f in findings)
            score = max(0, 100 - penalty)

            trend.append(ReadinessTrend(
                timestamp=datetime.strptime(date_str, "%Y-%m-%d"),
                readiness_score=score,
                total_findings=len(findings),
                blocker_count=blocker_count,
                high_count=high_count,
                medium_count=medium_count,
                low_count=low_count,
                commit_sha=commit_sha,
            ))

        return sorted(trend, key=lambda t: t.timestamp)

    def _analyze_trend(self, trend: List[ReadinessTrend]) -> Tuple[str, float]:
        """Analyze trend direction and confidence."""
        if len(trend) < 3:
            return "stable", 0.5

        # Compare first half vs second half
        mid = len(trend) // 2
        first_half = trend[:mid]
        second_half = trend[mid:]

        first_avg = sum(t.readiness_score for t in first_half) / len(first_half)
        second_avg = sum(t.readiness_score for t in second_half) / len(second_half)

        diff = second_avg - first_avg

        if diff > 5:
            direction = "improving"
            confidence = min(abs(diff) / 20, 0.95)
        elif diff < -5:
            direction = "degrading"
            confidence = min(abs(diff) / 20, 0.95)
        else:
            direction = "stable"
            confidence = 0.7

        return direction, confidence

    def _identify_risk_areas(self) -> List[str]:
        """Identify predicted risk areas based on historical patterns."""
        risk_areas = []

        # Find categories with high failure rates
        category_counts: Dict[str, int] = {}
        for finding in self.dataset.findings:
            category_counts[finding.category] = category_counts.get(finding.category, 0) + 1

        total_findings = len(self.dataset.findings)
        for category, count in category_counts.items():
            if count / total_findings > 0.2:  # >20% of failures
                risk_areas.append(f"{category} ({count} historical issues)")

        # Add directories with high failure density
        for dir_profile in self.dataset.directory_profiles:
            if dir_profile.risk_score > 0.5:
                risk_areas.append(f"directory:{dir_profile.path} (risk: {dir_profile.risk_score:.0%})")

        return risk_areas[:10]  # Limit to top 10

    def _get_high_risk_files(self) -> List[Any]:
        """Get files with highest risk profiles."""
        # Sort by risk (combination of frequency and flaky score)
        sorted_profiles = sorted(
            self.dataset.file_profiles,
            key=lambda p: (p.failure_frequency * 0.5 + p.flaky_score * 0.5),
            reverse=True
        )

        return sorted_profiles[:10]

    def _identify_fragile_subsystems(self) -> List[str]:
        """Identify subsystems that are fragile based on historical data."""
        fragile = []

        # Find directories with degrading trends
        for dir_profile in self.dataset.directory_profiles:
            if dir_profile.risk_score > 0.6:
                fragile.append(f"{dir_profile.path} (density: {dir_profile.failure_density:.2f})")

        # Find files with high flaky scores
        flaky_files = [p for p in self.dataset.file_profiles if p.flaky_score > 0.5]
        for file_profile in flaky_files[:5]:
            fragile.append(f"{file_profile.path} (flake: {file_profile.flaky_score:.0%})")

        return fragile[:10]

    def _recommend_test_focus(self) -> List[str]:
        """Recommend areas to focus testing on."""
        recommendations = []

        # High-risk directories
        for dir_profile in sorted(
            self.dataset.directory_profiles,
            key=lambda p: p.risk_score,
            reverse=True
        )[:3]:
            recommendations.append(f"Focus tests on {dir_profile.path}")

        # Flaky tests to investigate
        flaky_tests = [t for t in self.dataset.test_volatility if t.flake_rate > 0.3]
        for test in flaky_tests[:3]:
            recommendations.append(f"Investigate flaky test: {test.test_name}")

        return recommendations

    def _recommend_reviews(self) -> List[str]:
        """Recommend areas for code review focus."""
        recommendations = []

        # Authors with high failure rates
        for author_profile in sorted(
            self.dataset.author_profiles,
            key=lambda p: p.failure_rate,
            reverse=True
        )[:3]:
            if author_profile.failure_rate > 0.1:
                recommendations.append(
                    f"Extra review for changes by {author_profile.name} "
                    f"({author_profile.failure_rate:.0%} failure rate)"
                )

        return recommendations

    def _compute_historical_stats(self) -> Dict[str, Any]:
        """Compute summary statistics from historical data."""
        total_findings = len(self.dataset.findings)

        blocker_count = sum(1 for f in self.dataset.findings if f.severity == "BLOCKER")
        high_count = sum(1 for f in self.dataset.findings if f.severity == "HIGH")
        medium_count = sum(1 for f in self.dataset.findings if f.severity == "MEDIUM")
        low_count = sum(1 for f in self.dataset.findings if f.severity == "LOW")

        return {
            "total_historical_findings": total_findings,
            "blocker_count": blocker_count,
            "high_count": high_count,
            "medium_count": medium_count,
            "low_count": low_count,
            "files_with_failures": len(self.dataset.file_profiles),
            "directories_with_failures": len(self.dataset.directory_profiles),
            "authors_with_failures": len(self.dataset.author_profiles),
            "flaky_tests": len([t for t in self.dataset.test_volatility if t.flake_rate > 0.1]),
            "avg_time_to_fix_hours": self._compute_avg_time_to_fix(),
        }

    def _compute_avg_time_to_fix(self) -> Optional[float]:
        """Compute average time to fix across all findings."""
        # Group findings by file+rule
        from collections import defaultdict
        file_findings = defaultdict(list)

        for finding in self.dataset.findings:
            key = (finding.location, finding.rule_id)
            file_findings[key].append(finding)

        fix_times = []
        for key, findings in file_findings.items():
            sorted_findings = sorted(findings, key=lambda f: f.timestamp or datetime.min)
            for i in range(1, len(sorted_findings)):
                if sorted_findings[i].timestamp and sorted_findings[i-1].timestamp:
                    gap = (sorted_findings[i].timestamp - sorted_findings[i-1].timestamp).total_seconds() / 3600
                    if gap > 24:  # Gap > 24 hours suggests a fix
                        fix_times.append(gap)

        if not fix_times:
            return None

        return sum(fix_times) / len(fix_times)

    def _compute_confidence_interval(
        self,
        current_score: float,
        trend: List[ReadinessTrend]
    ) -> Tuple[float, float]:
        """Compute confidence interval for current score."""
        if len(trend) < 3:
            return (max(0, current_score - 10), min(100, current_score + 10))

        # Calculate standard deviation of recent scores
        recent_scores = [t.readiness_score for t in trend[-5:]]
        mean_score = sum(recent_scores) / len(recent_scores)

        # Simple standard deviation
        variance = sum((s - mean_score) ** 2 for s in recent_scores) / len(recent_scores)
        std_dev = variance ** 0.5

        # 95% confidence interval (approx 2 std dev)
        margin = 2 * std_dev

        lower = max(0, current_score - margin)
        upper = min(100, current_score + margin)

        return (lower, upper)

    def export_json(self, scorecard: ReadinessScorecard, output_path: Path) -> None:
        """Export scorecard to JSON file."""
        with open(output_path, 'w') as f:
            json.dump(scorecard.model_dump(), f, indent=2, default=str)

    def export_markdown(self, scorecard: ReadinessScorecard, output_path: Path) -> None:
        """Export scorecard to Markdown file."""
        lines = [
            "# Readiness Scorecard",
            "",
            f"**Generated:** {scorecard.timestamp.strftime('%Y-%m-%d %H:%M:%S')} UTC",
            f"**Commit:** `{scorecard.commit_sha or 'N/A'}`",
            f"**Branch:** {scorecard.branch or 'N/A'}",
            "",
            "## Current Status",
            "",
            f"| Metric | Value |",
            f"|--------|-------|",
            f"| Readiness Score | {scorecard.current_readiness_score:.1f}/100 |",
            f"| Status | {scorecard.current_status} |",
            f"| Findings | {scorecard.current_findings_count} |",
            f"| Trend | {scorecard.trend_direction} (confidence: {scorecard.trend_confidence:.0%}) |",
            "",
            "## Trend Analysis",
            "",
            f"Analysis based on last {len(scorecard.trend)} runs over {scorecard.analysis_window_days} days.",
            "",
        ]

        if scorecard.trend:
            lines.extend([
                "| Date | Score | Blockers | High | Medium | Low |",
                "|------|-------|----------|------|--------|-----|",
            ])
            for t in scorecard.trend:
                lines.append(
                    f"| {t.timestamp.strftime('%Y-%m-%d')} | {t.readiness_score:.1f} | "
                    f"{t.blocker_count} | {t.high_count} | {t.medium_count} | {t.low_count} |"
                )
            lines.append("")

        lines.extend([
            "## Predicted Risk Areas",
            "",
        ])
        if scorecard.predicted_risk_areas:
            for area in scorecard.predicted_risk_areas:
                lines.append(f"- {area}")
        else:
            lines.append("No significant risk areas identified.")
        lines.append("")

        lines.extend([
            "## Fragile Subsystems",
            "",
        ])
        if scorecard.fragile_subsystems:
            for subsystem in scorecard.fragile_subsystems:
                lines.append(f"- {subsystem}")
        else:
            lines.append("No fragile subsystems identified.")
        lines.append("")

        lines.extend([
            "## Recommendations",
            "",
            "### Test Focus",
            "",
        ])
        if scorecard.recommended_test_focus:
            for rec in scorecard.recommended_test_focus:
                lines.append(f"- {rec}")
        lines.append("")

        lines.extend([
            "### Code Reviews",
            "",
        ])
        if scorecard.recommended_reviews:
            for rec in scorecard.recommended_reviews:
                lines.append(f"- {rec}")
        else:
            lines.append("No specific review recommendations.")
        lines.append("")

        lines.extend([
            "## Historical Statistics",
            "",
            f"| Metric | Value |",
            f"|--------|-------|",
        ])
        for key, value in scorecard.historical_stats.items():
            if isinstance(value, float):
                lines.append(f"| {key} | {value:.2f} |")
            else:
                lines.append(f"| {key} | {value} |")
        lines.append("")

        lines.extend([
            "## Confidence",
            "",
            f"- **Confidence Interval:** [{scorecard.confidence_interval[0]:.1f}, {scorecard.confidence_interval[1]:.1f}]",
            f"- **Historical Runs Analyzed:** {scorecard.total_historical_runs}",
            "",
            "---",
            "",
            "*Generated by ReadyLayer Readiness Intelligence*",
        ])

        with open(output_path, 'w') as f:
            f.write('\n'.join(lines))
