"""
Base parser interface and utilities.
"""

from abc import ABC, abstractmethod
from typing import List

from readiness_engine.models import Finding, ToolOutput


class BaseParser(ABC):
    """Base class for all tool output parsers."""

    @abstractmethod
    def parse(self, output: ToolOutput) -> List[Finding]:
        """
        Parse raw tool output and return normalized findings.

        Args:
            output: The raw tool output to parse

        Returns:
            List of normalized Finding objects
        """
        pass

    def _extract_location(self, path_str: str) -> tuple[str, int | None, int | None]:
        """
        Extract file path, line, and column from a location string.
        Handles formats like:
        - /path/to/file.ts
        - /path/to/file.ts:123
        - /path/to/file.ts:123:45
        """
        import re

        # Pattern: path:line:col or path:line
        match = re.match(r'^(.+?):(\d+)(?::(\d+))?$', path_str)
        if match:
            path = match.group(1)
            line = int(match.group(2))
            col = int(match.group(3)) if match.group(3) else None
            return path, line, col

        return path_str, None, None
