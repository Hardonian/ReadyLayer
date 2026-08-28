"""
Build output parser.
Parses Next.js / npm build output.
"""

import re
from typing import List

from readiness_engine.models import Category, Evidence, Finding, Severity, ToolOutput
from . import BaseParser


class BuildParser(BaseParser):
    """Parser for build tool output (Next.js, webpack, etc.)."""

    # Common build error patterns
    PATTERNS = [
        # Module not found
        re.compile(
            r"Module not found:.*?Can't resolve '(?P<module>[^']+)'\s+in\s+'(?P<location>[^']+)'",
            re.IGNORECASE
        ),
        # Syntax error
        re.compile(
            r'SyntaxError[\s\S]*?at\s+(?P<location>[^:]+):(?P<line>\d+):(?P<col>\d+)',
            re.IGNORECASE
        ),
        # Build failed
        re.compile(
            r'(?:Build failed|Failed to compile|Compilation error)[\s\S]*?ERROR[^\n]*\n(?P<message>.*?)(?=\n\n|\n\d|$)',
            re.IGNORECASE
        ),
        # Webpack error
        re.compile(
            r'Error: (?P<message>.+?)(?=\n\s*at|\n\n|$)',
            re.MULTILINE | re.IGNORECASE
        ),
    ]

    # Patterns that indicate build success with warnings
    SUCCESS_WITH_WARNINGS = re.compile(
        r'(Compiled with warnings|warnings in \d+ modules?)',
        re.IGNORECASE
    )

    def parse(self, output: ToolOutput) -> List[Finding]:
        findings: List[Finding] = []

        raw = output.raw_output

        # Check for success with warnings
        if output.exit_code == 0:
            if self.SUCCESS_WITH_WARNINGS.search(raw):
                findings.append(
                    Finding(
                        rule_id="build/warnings-present",
                        category=Category.BUILD,
                        severity=Severity.MEDIUM,
                        title="Build completed with warnings",
                        description="The build succeeded but contains warnings that should be addressed",
                        location=".",
                        evidence=[Evidence(type="log", content=raw[-2000:])],
                        remediation="Review build warnings and fix underlying issues",
                        tool="build",
                    )
                )
            return findings

        # Build failed - extract errors
        for pattern in self.PATTERNS:
            for match in pattern.finditer(raw):
                groups = match.groupdict()

                location = groups.get('location', 'build process')
                line = int(groups['line']) if 'line' in groups and groups['line'] else None
                col = int(groups['col']) if 'col' in groups and groups['col'] else None
                message = groups.get('message', groups.get('module', 'Build error'))
                module = groups.get('module', '')

                if module:
                    description = f"Missing module: {module} in {location}"
                    remediation = f"Install missing dependency: npm install {module}"
                    rule_id = "build/missing-module"
                else:
                    description = f"Build error: {message[:200]}"
                    remediation = "Fix the build error and retry"
                    rule_id = "build/compilation-error"

                finding = Finding(
                    rule_id=rule_id,
                    category=Category.BUILD,
                    severity=Severity.BLOCKER,
                    title=message[:100],
                    description=description,
                    location=location,
                    line=line,
                    column=col,
                    evidence=[
                        Evidence(
                            type="log",
                            content=raw[
                                max(0, match.start() - 200):match.end() + 200
                            ]
                        )
                    ],
                    remediation=remediation,
                    tool="build",
                )
                findings.append(finding)

        # If no specific errors found but build failed
        if not findings:
            findings.append(
                Finding(
                    rule_id="build/failed",
                    category=Category.BUILD,
                    severity=Severity.BLOCKER,
                    title="Build failed",
                    description="The build process failed. Check the output for details.",
                    location=".",
                    evidence=[Evidence(type="log", content=raw[-5000:])],
                    remediation="Review build output and fix reported errors",
                    tool="build",
                )
            )

        return findings
