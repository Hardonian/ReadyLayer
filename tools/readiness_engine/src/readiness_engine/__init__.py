"""
Readiness Engine - AI Code Readiness Aggregator

Judges whether a codebase is production-ready using evidence, invariants, and auditable artifacts.
"""

from .models import (
    Finding,
    ReadinessVerdict,
    Severity,
    Category,
    Evidence,
    ToolOutput,
)
from .engine import ReadinessEngine

__version__ = "1.0.0"
__all__ = [
    "Finding",
    "ReadinessVerdict",
    "Severity",
    "Category",
    "Evidence",
    "ToolOutput",
    "ReadinessEngine",
]
