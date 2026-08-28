"""
Vitest test output parser.
Parses Vitest test results from stdout or JSON output.
"""

import json
import re
from typing import List

from readiness_engine.models import Category, Evidence, Finding, Severity, ToolOutput
from . import BaseParser


class VitestParser(BaseParser):
    """Parser for Vitest test output."""

    # Pattern for test failure summary
    FAILURE_PATTERN = re.compile(
        r'FAIL\s+(?P<test_file>[^\s]+)|'
        r'AssertionError[\s\S]*?at\s+(?P<location>[^:]+):(?P<line>\d+):(?P<col>\d+)',
        re.MULTILINE
    )

    def parse(self, output: ToolOutput) -> List[Finding]:
        findings: List[Finding] = []

        if output.exit_code == 0:
            # Check if there are failures despite exit code 0 (unlikely but possible)
            if 'FAIL' not in output.raw_output:
                return findings

        raw = output.raw_output

        # Look for failure patterns
        # Vitest outputs failures in sections starting with FAIL
        failure_sections = re.split(r'\n(?=FAIL\s+)', raw)

        for section in failure_sections:
            if not section.startswith('FAIL'):
                continue

            # Extract test file
            lines = section.split('\n')
            test_file = lines[0].replace('FAIL', '').strip()

            # Extract error message
            error_match = re.search(
                r'(?:AssertionError|Error):\s*(.+?)(?=\n\s*at|\n\n|$)',
                section,
                re.DOTALL
            )
            error_message = error_match.group(1).strip() if error_match else "Test assertion failed"

            # Extract location
            location_match = re.search(r'at\s+([^:]+):(\d+):(\d+)', section)
            if location_match:
                location = location_match.group(1)
                line = int(location_match.group(2))
                col = int(location_match.group(3))
            else:
                location = test_file
                line = None
                col = None

            finding = Finding(
                rule_id="vitest/test-failure",
                category=Category.TEST,
                severity=Severity.HIGH,
                title=f"Test failure: {test_file}",
                description=error_message[:500],
                location=location,
                line=line,
                column=col,
                evidence=[
                    Evidence(
                        type="log",
                        content=section[:2000]
                    )
                ],
                remediation="Fix the failing test assertion or update test expectations",
                tool="vitest",
            )
            findings.append(finding)

        # If no specific failures parsed but exit code indicates failure
        if not findings and output.exit_code != 0:
            findings.append(
                Finding(
                    rule_id="vitest/suite-failure",
                    category=Category.TEST,
                    severity=Severity.HIGH,
                    title="Test suite failed",
                    description="One or more tests failed. Check the test output for details.",
                    location=".",
                    evidence=[Evidence(type="log", content=raw[-5000:])],
                    remediation="Review test failures and fix underlying issues",
                    tool="vitest",
                )
            )

        return findings
