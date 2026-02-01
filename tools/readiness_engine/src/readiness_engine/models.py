"""
Core data models for the Readiness Engine.
Defines the canonical schema for normalized findings.
"""

from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class Severity(str, Enum):
    """Severity levels for findings."""

    BLOCKER = "BLOCKER"  # Build failure, typecheck failure, route hard-500, uncaught error
    HIGH = "HIGH"  # Visual regression on critical route, console errors, broken navigation
    MEDIUM = "MEDIUM"  # Non-blocking issues, warnings
    LOW = "LOW"  # Cosmetic issues, suggestions


class Category(str, Enum):
    """Category of finding."""

    TYPE = "type"  # TypeScript type errors
    LINT = "lint"  # ESLint/style issues
    BUILD = "build"  # Build failures
    UI = "ui"  # UI/UX issues, visual regression
    INFRA = "infra"  # Infrastructure/deployment issues
    TEST = "test"  # Test failures
    SECURITY = "security"  # Security issues


class Evidence(BaseModel):
    """Evidence attached to a finding."""

    type: str = Field(..., description="Type of evidence: log, screenshot, trace, diff")
    path: Optional[str] = Field(None, description="Relative path to evidence file")
    content: Optional[str] = Field(None, description="Inline evidence content (log excerpt)")
    line_start: Optional[int] = Field(None, description="Starting line for code evidence")
    line_end: Optional[int] = Field(None, description="Ending line for code evidence")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class Finding(BaseModel):
    """
    A single normalized finding from any tool.
    This is the canonical representation of an issue.
    """

    rule_id: str = Field(..., description="Identifier for the rule/check")
    category: Category = Field(..., description="Category of the finding")
    severity: Severity = Field(..., description="Severity level")
    title: str = Field(..., description="Short description of the issue")
    description: str = Field(..., description="Detailed description")
    location: str = Field(..., description="File path, route, or test identifier")
    line: Optional[int] = Field(None, description="Line number if applicable")
    column: Optional[int] = Field(None, description="Column number if applicable")
    evidence: List[Evidence] = Field(default_factory=list, description="Supporting evidence")
    remediation: Optional[str] = Field(None, description="Suggested fix")
    tool: str = Field(..., description="Source tool that produced this finding")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return self.model_dump()


class ToolOutput(BaseModel):
    """Raw output from a tool before normalization."""

    tool: str = Field(..., description="Tool name")
    raw_output: str = Field(..., description="Raw output text")
    exit_code: int = Field(..., description="Process exit code")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SummaryMetrics(BaseModel):
    """Summary statistics for a readiness report."""

    total_findings: int = 0
    blocker_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    by_category: Dict[str, int] = Field(default_factory=dict)
    by_tool: Dict[str, int] = Field(default_factory=dict)


class ReadinessVerdict(BaseModel):
    """
    The final readiness verdict containing all findings and metadata.
    This is the machine-readable truth.
    """

    version: str = "1.0.0"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    project: str = Field(..., description="Project name")
    commit_sha: Optional[str] = Field(None, description="Git commit SHA")
    branch: Optional[str] = Field(None, description="Git branch")
    ready: bool = Field(..., description="Whether the codebase is production-ready")
    findings: List[Finding] = Field(default_factory=list)
    metrics: SummaryMetrics = Field(default_factory=SummaryMetrics)
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional context")

    class Config:
        json_schema_extra = {
            "example": {
                "version": "1.0.0",
                "timestamp": "2026-01-31T12:00:00Z",
                "project": "readylayer",
                "ready": False,
                "findings": [],
            }
        }

    def compute_metrics(self) -> None:
        """Compute summary metrics from findings."""
        self.metrics = SummaryMetrics(
            total_findings=len(self.findings),
            blocker_count=sum(1 for f in self.findings if f.severity == Severity.BLOCKER),
            high_count=sum(1 for f in self.findings if f.severity == Severity.HIGH),
            medium_count=sum(1 for f in self.findings if f.severity == Severity.MEDIUM),
            low_count=sum(1 for f in self.findings if f.severity == Severity.LOW),
            by_category={
                cat.value: sum(1 for f in self.findings if f.category == cat)
                for cat in Category
            },
            by_tool={},
        )

        # Count by tool
        for finding in self.findings:
            self.metrics.by_tool[finding.tool] = self.metrics.by_tool.get(finding.tool, 0) + 1

    def has_blockers(self) -> bool:
        """Check if there are any blocker-level findings."""
        return any(f.severity == Severity.BLOCKER for f in self.findings)

    def has_high_severity(self) -> bool:
        """Check if there are any high or blocker findings."""
        return any(f.severity in (Severity.BLOCKER, Severity.HIGH) for f in self.findings)
