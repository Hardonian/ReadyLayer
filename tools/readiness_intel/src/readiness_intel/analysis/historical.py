"""
Historical analysis engine for computing risk metrics and correlations.
"""

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np
from dateutil import parser as date_parser

from readiness_intel.models import (
    AuthorRiskProfile,
    CorrelationPattern,
    DirectoryRiskProfile,
    FileRiskProfile,
    HistoricalDataset,
    HistoricalFinding,
    TestVolatility,
)


class HistoricalAnalyzer:
    """Analyzes historical readiness data to extract risk patterns."""

    def __init__(self, findings: List[HistoricalFinding]):
        self.findings = findings
        self._file_profiles: Optional[Dict[str, FileRiskProfile]] = None
        self._directory_profiles: Optional[Dict[str, DirectoryRiskProfile]] = None
        self._author_profiles: Optional[Dict[str, AuthorRiskProfile]] = None

    def compute_failure_frequency(self, file_path: str) -> float:
        """Compute failure frequency for a specific file."""
        file_failures = [f for f in self.findings if f.location == file_path]

        # Group by unique runs (commit_sha + timestamp)
        unique_runs = set()
        for f in file_failures:
            key = (f.commit_sha, f.timestamp.strftime("%Y-%m-%d"))
            unique_runs.add(key)

        if not unique_runs:
            return 0.0

        # Count total unique runs across all findings
        all_runs = set()
        for f in self.findings:
            key = (f.commit_sha, f.timestamp.strftime("%Y-%m-%d"))
            all_runs.add(key)

        return len(unique_runs) / len(all_runs) if all_runs else 0.0

    def compute_regression_density(self, directory: str) -> float:
        """Compute regression density (failures per file) for a directory."""
        dir_findings = [f for f in self.findings if f.location.startswith(directory)]

        # Count unique files in directory
        unique_files = set(f.location for f in dir_findings)

        if not unique_files:
            return 0.0

        return len(dir_findings) / len(unique_files)

    def compute_mean_time_to_fix(
        self,
        file_path: Optional[str] = None,
        author: Optional[str] = None
    ) -> Optional[float]:
        """Compute mean time to fix in hours."""
        # Group findings by file and track when they disappear
        file_findings_map: Dict[Tuple[str, str], List[HistoricalFinding]] = defaultdict(list)

        for finding in self.findings:
            if file_path and finding.location != file_path:
                continue
            if author and finding.author != author:
                continue

            key = (finding.location, finding.rule_id)
            file_findings_map[key].append(finding)

        fix_times: List[float] = []

        for key, findings_list in file_findings_map.items():
            # Sort by timestamp
            sorted_findings = sorted(findings_list, key=lambda f: f.timestamp)

            # Look for gaps (indicating fix)
            for i in range(1, len(sorted_findings)):
                gap = (sorted_findings[i].timestamp - sorted_findings[i-1].timestamp).total_seconds() / 3600
                if gap > 24:  # Gap > 24 hours suggests a fix
                    fix_times.append(gap)

        if not fix_times:
            return None

        return float(np.mean(fix_times))

    def compute_flake_probability(self, test_name: str) -> float:
        """Compute probability of test flakiness."""
        test_findings = [f for f in self.findings if test_name in f.location]

        if len(test_findings) < 3:
            return 0.0

        # Group by unique runs
        run_results = defaultdict(list)
        for f in test_findings:
            key = f.commit_sha or f.timestamp.strftime("%Y-%m-%d")
            run_results[key].append(f.severity)

        # Count inconsistent runs
        inconsistent_runs = 0
        for run_id, severities in run_results.items():
            # If same test has different severities in close timestamps, it's flaky
            if len(set(severities)) > 1:
                inconsistent_runs += 1

        return inconsistent_runs / len(run_results)

    def build_file_profiles(self) -> Dict[str, FileRiskProfile]:
        """Build risk profiles for all files with findings."""
        if self._file_profiles is not None:
            return self._file_profiles

        profiles = {}
        file_findings = defaultdict(list)

        for finding in self.findings:
            file_findings[finding.location].append(finding)

        for file_path, findings_list in file_findings.items():
            # Severity distribution
            severity_dist = defaultdict(int)
            category_dist = defaultdict(int)
            rule_counts = defaultdict(int)

            for f in findings_list:
                severity_dist[f.severity] += 1
                category_dist[f.category] += 1
                rule_counts[f.rule_id] += 1

            # Compute failure frequency
            total_runs = len(set(
                (f.commit_sha, f.timestamp.strftime("%Y-%m-%d"))
                for f in self.findings
            ))

            file_run_count = len(set(
                (f.commit_sha, f.timestamp.strftime("%Y-%m-%d"))
                for f in findings_list
            ))

            failure_freq = file_run_count / total_runs if total_runs > 0 else 0.0

            # Compute flaky score
            flake_score = self._compute_file_flaky_score(findings_list)

            # Determine trend
            sorted_findings = sorted(findings_list, key=lambda f: f.timestamp)
            trend = self._compute_instability_trend(sorted_findings)

            # Top issues
            top_issues = sorted(rule_counts.items(), key=lambda x: x[1], reverse=True)[:5]

            # Last failure
            last_failure = max((f.timestamp for f in findings_list), default=None)

            profiles[file_path] = FileRiskProfile(
                path=file_path,
                total_failures=len(findings_list),
                failure_frequency=failure_freq,
                severity_distribution=dict(severity_dist),
                category_distribution=dict(category_dist),
                last_failure=last_failure,
                flaky_score=flake_score,
                instability_trend=trend,
                top_issues=top_issues,
            )

        self._file_profiles = profiles
        return profiles

    def _compute_file_flaky_score(self, findings: List[HistoricalFinding]) -> float:
        """Compute a flaky score (0-1) based on reoccurrence patterns."""
        if len(findings) < 3:
            return 0.0

        # Count unique rules that reoccur
        rule_timestamps = defaultdict(list)
        for f in findings:
            rule_timestamps[f.rule_id].append(f.timestamp)

        reoccurring_rules = 0
        for rule_id, timestamps in rule_timestamps.items():
            if len(timestamps) > 1:
                # Check if reoccurrences are spread out (indicates flakiness)
                time_spread = (max(timestamps) - min(timestamps)).total_seconds() / 86400
                if time_spread > 7:  # Reoccurs over more than a week
                    reoccurring_rules += 1

        return min(reoccurring_rules / len(rule_timestamps), 1.0)

    def _compute_instability_trend(self, sorted_findings: List[HistoricalFinding]) -> str:
        """Determine if file is improving, stable, or degrading."""
        if len(sorted_findings) < 5:
            return "stable"

        # Split into first and second half
        mid = len(sorted_findings) // 2
        first_half = sorted_findings[:mid]
        second_half = sorted_findings[mid:]

        first_rate = len(first_half)
        second_rate = len(second_half)

        if second_rate < first_rate * 0.7:
            return "improving"
        elif second_rate > first_rate * 1.3:
            return "degrading"
        else:
            return "stable"

    def build_directory_profiles(self) -> Dict[str, DirectoryRiskProfile]:
        """Build risk profiles for directories."""
        if self._directory_profiles is not None:
            return self._directory_profiles

        file_profiles = self.build_file_profiles()
        dir_stats: Dict[str, Dict[str, Any]] = {}

        for file_path, profile in file_profiles.items():
            # Extract directory from file path
            parts = file_path.split("/")
            for i in range(1, len(parts)):
                dir_path = "/".join(parts[:i])
                if dir_path not in dir_stats:
                    dir_stats[dir_path] = {"files": set(), "failures": 0}
                dir_stats[dir_path]["files"].add(file_path)
                dir_stats[dir_path]["failures"] += profile.total_failures

        profiles: Dict[str, DirectoryRiskProfile] = {}
        for dir_path, stats in dir_stats.items():
            files_set: Set[str] = stats["files"]
            file_count = len(files_set)
            failures: int = stats["failures"]
            failure_density = failures / file_count if file_count > 0 else 0.0

            # Compute risk score based on failure density and frequency
            risk_score = min(failure_density / 10.0, 1.0)  # Normalize

            profiles[dir_path] = DirectoryRiskProfile(
                path=dir_path,
                file_count=file_count,
                total_failures=stats["failures"],
                failure_density=failure_density,
                risk_score=risk_score,
            )

        self._directory_profiles = profiles
        return profiles

    def build_author_profiles(self) -> Dict[str, AuthorRiskProfile]:
        """Build risk profiles for authors."""
        if self._author_profiles is not None:
            return self._author_profiles

        author_stats: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
            "commits": set(),
            "failures": 0,
            "categories": defaultdict(int),
            "recent_commits": 0,
        })

        cutoff_date = datetime.utcnow() - timedelta(days=30)

        for finding in self.findings:
            author = finding.author or "unknown"
            author_stats[author]["commits"].add(finding.commit_sha)
            author_stats[author]["failures"] += 1
            author_stats[author]["categories"][finding.category] += 1

            if finding.timestamp and finding.timestamp > cutoff_date:
                author_stats[author]["recent_commits"] += 1

        profiles = {}
        for author, stats in author_stats.items():
            commit_count = len(stats["commits"])
            failure_rate = stats["failures"] / commit_count if commit_count > 0 else 0.0

            top_categories = sorted(
                stats["categories"].items(),
                key=lambda x: x[1],
                reverse=True
            )[:3]

            profiles[author] = AuthorRiskProfile(
                name=author,
                total_commits=commit_count,
                total_failures_introduced=stats["failures"],
                failure_rate=failure_rate,
                top_categories=top_categories,
                recent_activity=stats["recent_commits"],
            )

        self._author_profiles = profiles
        return profiles

    def compute_test_volatility(self) -> List[TestVolatility]:
        """Analyze test volatility from historical findings."""
        test_stats: Dict[str, Dict[str, Any]] = {}

        for finding in self.findings:
            # Extract test name from location or rule_id
            test_name = self._extract_test_name(finding)
            if not test_name:
                continue

            run_id = finding.commit_sha or finding.timestamp.strftime("%Y-%m-%d")
            if test_name not in test_stats:
                test_stats[test_name] = {
                    "runs": set(),
                    "failures": 0,
                    "results": defaultdict(list),
                }
            test_stats[test_name]["runs"].add(run_id)
            test_stats[test_name]["failures"] += 1
            test_stats[test_name]["results"][run_id].append(finding.severity)

        volatilities: List[TestVolatility] = []
        for test_name, stats in test_stats.items():
            runs_set: Set[str] = stats["runs"]
            total_runs = len(runs_set)
            failures: int = stats["failures"]
            results_map: Dict[str, List[str]] = stats["results"]

            # Count flakes (inconsistent results)
            flakes = 0
            for run_id, results in results_map.items():
                if len(set(results)) > 1:
                    flakes += 1

            flake_rate = flakes / total_runs if total_runs > 0 else 0.0

            volatilities.append(TestVolatility(
                test_name=test_name,
                total_runs=total_runs,
                failures=failures,
                passes=total_runs - failures,
                flakes=flakes,
                flake_rate=flake_rate,
            ))

        return volatilities

    def _extract_test_name(self, finding: HistoricalFinding) -> Optional[str]:
        """Extract test name from finding data."""
        # Try to identify test from rule_id or location
        if "test" in finding.tool.lower():
            return finding.location

        if finding.rule_id.startswith("test/"):
            return finding.rule_id.split("/")[-1]

        return None

    def find_correlations(self) -> List[CorrelationPattern]:
        """Find correlation patterns between files and failures."""
        correlations = []

        # File-to-file correlations (co-failing files)
        file_failure_matrix = defaultdict(lambda: defaultdict(int))

        runs = defaultdict(list)
        for finding in self.findings:
            run_key = (finding.commit_sha, finding.timestamp.strftime("%Y-%m-%d"))
            runs[run_key].append(finding.location)

        for run_id, files in runs.items():
            for i, file1 in enumerate(files):
                for file2 in files[i+1:]:
                    file_failure_matrix[file1][file2] += 1
                    file_failure_matrix[file2][file1] += 1

        # Find strong correlations
        seen_pairs = set()
        for file1, related in file_failure_matrix.items():
            for file2, count in related.items():
                if count >= 3:  # Minimum support
                    pair = tuple(sorted([file1, file2]))
                    if pair not in seen_pairs:
                        seen_pairs.add(pair)
                        correlations.append(CorrelationPattern(
                            pattern_type="file_file",
                            entities=list(pair),
                            confidence=min(count / 10.0, 1.0),
                            support_count=count,
                        ))

        return correlations

    def build_dataset(self, project_name: str = "readylayer") -> HistoricalDataset:
        """Build complete historical dataset."""
        timestamps = [f.timestamp for f in self.findings if f.timestamp]

        return HistoricalDataset(
            project=project_name,
            total_runs=len(self.findings),
            date_range_start=min(timestamps) if timestamps else datetime.utcnow(),
            date_range_end=max(timestamps) if timestamps else datetime.utcnow(),
            findings=self.findings,
            file_profiles=list(self.build_file_profiles().values()),
            directory_profiles=list(self.build_directory_profiles().values()),
            author_profiles=list(self.build_author_profiles().values()),
            test_volatility=self.compute_test_volatility(),
            correlations=self.find_correlations(),
        )
