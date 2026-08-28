"""
Core data models for the Readiness Intelligence system.
Defines schemas for historical analysis, risk prediction, and change impact.
"""

from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from pydantic import BaseModel, Field, computed_field


class RiskLevel(str, Enum):
    """Risk levels for predictive analysis."""

    CRITICAL = "CRITICAL"  # High probability of failure, must run full suite
    HIGH = "HIGH"  # Elevated risk, recommend expanded tests
    MEDIUM = "MEDIUM"  # Moderate risk, standard tests sufficient
    LOW = "LOW"  # Low risk, reduced test set acceptable


class ChangeType(str, Enum):
    """Types of code changes."""

    ADDITION = "addition"
    DELETION = "deletion"
    MODIFICATION = "modification"
    RENAME = "rename"


class FileChange(BaseModel):
    """Represents a single file change in a PR."""

    path: str = Field(..., description="File path")
    change_type: ChangeType = Field(..., description="Type of change")
    lines_added: int = Field(default=0, description="Lines added")
    lines_removed: int = Field(default=0, description="Lines removed")
    patch: Optional[str] = Field(None, description="Diff patch content")
    author: Optional[str] = Field(None, description="Author of the change")


class HistoricalFinding(BaseModel):
    """A finding enriched with historical context."""

    rule_id: str = Field(..., description="Rule identifier")
    category: str = Field(..., description="Category: type, lint, build, ui, infra, test, security")
    severity: str = Field(..., description="BLOCKER, HIGH, MEDIUM, LOW")
    location: str = Field(..., description="File path or location")
    line: Optional[int] = Field(None, description="Line number")
    tool: str = Field(..., description="Source tool")
    timestamp: datetime = Field(..., description="When the finding occurred")
    commit_sha: Optional[str] = Field(None, description="Git commit SHA")
    branch: Optional[str] = Field(None, description="Git branch")
    author: Optional[str] = Field(None, description="Author who introduced the issue")
    fixed_in: Optional[str] = Field(None, description="Commit SHA where fixed")
    time_to_fix: Optional[float] = Field(None, description="Hours to fix")
    reoccurred: bool = Field(default=False, description="Whether this finding reoccurred")
    reoccurrence_count: int = Field(default=0, description="Number of reoccurrences")


class FileRiskProfile(BaseModel):
    """Risk profile for a specific file based on historical data."""

    path: str = Field(..., description="File path")
    total_failures: int = Field(default=0, description="Total failures associated")
    failure_frequency: float = Field(default=0.0, description="Failures per run")
    severity_distribution: Dict[str, int] = Field(default_factory=dict)
    category_distribution: Dict[str, int] = Field(default_factory=dict)
    last_failure: Optional[datetime] = None
    mean_time_between_failures: Optional[float] = None  # hours
    flaky_score: float = Field(default=0.0, ge=0.0, le=1.0)
    instability_trend: str = Field(default="stable")  # improving, stable, degrading
    top_issues: List[Tuple[str, int]] = Field(default_factory=list)  # (rule_id, count)


class DirectoryRiskProfile(BaseModel):
    """Risk profile for a directory."""

    path: str = Field(..., description="Directory path")
    file_count: int = Field(default=0)
    total_failures: int = Field(default=0)
    failure_density: float = Field(default=0.0)  # failures per file
    risk_score: float = Field(default=0.0, ge=0.0, le=1.0)
    subdirectories: List[str] = Field(default_factory=list)


class AuthorRiskProfile(BaseModel):
    """Risk profile for an author based on their change history."""

    name: str = Field(..., description="Author name/email")
    total_commits: int = Field(default=0)
    total_failures_introduced: int = Field(default=0)
    failure_rate: float = Field(default=0.0)  # failures per commit
    mean_time_to_fix: Optional[float] = None  # hours
    top_categories: List[Tuple[str, int]] = Field(default_factory=list)
    recent_activity: int = Field(default=0)  # commits in last 30 days


class DependencyChange(BaseModel):
    """Represents a dependency change."""

    package: str = Field(..., description="Package name")
    old_version: Optional[str] = None
    new_version: Optional[str] = None
    change_type: str = Field(..., description="added, removed, upgraded, downgraded")
    direct_dependency: bool = Field(default=True)


class TestVolatility(BaseModel):
    """Measures test volatility/flakiness."""

    test_name: str = Field(..., description="Test identifier")
    total_runs: int = Field(default=0)
    failures: int = Field(default=0)
    passes: int = Field(default=0)
    flakes: int = Field(default=0)  # Inconsistent results
    flake_rate: float = Field(default=0.0, ge=0.0, le=1.0)
    avg_duration: float = Field(default=0.0)  # seconds
    duration_variance: float = Field(default=0.0)
    last_failure: Optional[datetime] = None


class CorrelationPattern(BaseModel):
    """A correlation pattern between files and failures."""

    pattern_type: str = Field(..., description="Type: file_file, file_dir, author_category, etc.")
    entities: List[str] = Field(..., description="Related entities")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Correlation confidence")
    support_count: int = Field(..., description="Number of observations")
    failure_categories: List[str] = Field(default_factory=list)
    first_observed: Optional[datetime] = None
    last_observed: Optional[datetime] = None


class RiskPrediction(BaseModel):
    """Prediction for a specific file or change."""

    target: str = Field(..., description="File path or identifier")
    risk_level: RiskLevel = Field(..., description="Predicted risk level")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Prediction confidence")
    predicted_categories: List[Tuple[str, float]] = Field(default_factory=list)  # (category, prob)
    predicted_severities: List[Tuple[str, float]] = Field(default_factory=list)  # (severity, prob)
    affected_invariants: List[str] = Field(default_factory=list)
    recommended_tests: List[str] = Field(default_factory=list)
    risk_factors: List[str] = Field(default_factory=list)
    similar_historical_failures: List[str] = Field(default_factory=list)


class ChangeImpactAnalysis(BaseModel):
    """Complete analysis of a PR/diff impact."""

    commit_sha: str = Field(..., description="Commit SHA")
    branch: str = Field(..., description="Branch name")
    author: str = Field(..., description="Author")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    files_changed: List[FileChange] = Field(default_factory=list)
    dependencies_changed: List[DependencyChange] = Field(default_factory=list)
    overall_risk: RiskLevel = Field(..., description="Overall risk assessment")
    risk_confidence: float = Field(..., ge=0.0, le=1.0)
    file_predictions: List[RiskPrediction] = Field(default_factory=list)
    predicted_readiness_delta: float = Field(..., description="Predicted change in readiness score")
    recommended_test_strategy: str = Field(..., description="Test strategy recommendation")
    estimated_ci_duration: float = Field(..., description="Estimated CI duration in minutes")
    invariant_risks: List[str] = Field(default_factory=list)
    explanation: str = Field(..., description="Human-readable explanation")


class ReadinessTrend(BaseModel):
    """Trend data for readiness over time."""

    timestamp: datetime
    readiness_score: float = Field(..., ge=0.0, le=100.0)
    total_findings: int
    blocker_count: int
    high_count: int
    medium_count: int
    low_count: int
    commit_sha: Optional[str] = None
    branch: Optional[str] = None


class ReadinessScorecard(BaseModel):
    """Complete readiness scorecard with predictions."""

    version: str = "1.0.0"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    commit_sha: Optional[str] = None
    branch: Optional[str] = None

    # Current state
    current_readiness_score: float = Field(..., ge=0.0, le=100.0)
    current_findings_count: int
    current_status: str = Field(..., description="PASS, FAIL, WARNING")

    # Trend analysis (last 10 runs)
    trend: List[ReadinessTrend] = Field(default_factory=list)
    trend_direction: str = Field(..., description="improving, stable, degrading")
    trend_confidence: float = Field(..., ge=0.0, le=1.0)

    # Predictive insights
    predicted_risk_areas: List[str] = Field(default_factory=list)
    high_risk_files: List[FileRiskProfile] = Field(default_factory=list)
    fragile_subsystems: List[str] = Field(default_factory=list)

    # Recommendations
    recommended_test_focus: List[str] = Field(default_factory=list)
    recommended_reviews: List[str] = Field(default_factory=list)

    # Statistics
    historical_stats: Dict[str, Any] = Field(default_factory=dict)
    confidence_interval: Tuple[float, float] = Field(..., description="(lower, upper) bounds")

    # Metadata
    analysis_window_days: int = Field(default=30)
    total_historical_runs: int
    metadata: Dict[str, Any] = Field(default_factory=dict)


class HistoricalDataset(BaseModel):
    """Complete historical dataset for analysis."""

    project: str = Field(..., description="Project name")
    ingestion_timestamp: datetime = Field(default_factory=datetime.utcnow)
    total_runs: int
    date_range_start: datetime
    date_range_end: datetime
    findings: List[HistoricalFinding] = Field(default_factory=list)
    file_profiles: List[FileRiskProfile] = Field(default_factory=list)
    directory_profiles: List[DirectoryRiskProfile] = Field(default_factory=list)
    author_profiles: List[AuthorRiskProfile] = Field(default_factory=list)
    test_volatility: List[TestVolatility] = Field(default_factory=list)
    correlations: List[CorrelationPattern] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
