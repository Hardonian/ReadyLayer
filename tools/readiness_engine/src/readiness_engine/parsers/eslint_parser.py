"""
ESLint output parser.
Parses ESLint stdout format: file:line:column severity rule_id message
"""

import re
from typing import List

from readiness_engine.models import Category, Evidence, Finding, Severity, ToolOutput
from . import BaseParser


class ESLintParser(BaseParser):
    """Parser for ESLint output."""

    # Pattern: filepath:line:column severity rule_id message
    ESLINT_PATTERN = re.compile(
        r'^(?P<path>[^:]+):(?P<line>\d+)(?::(?P<col>\d+))?\s+'
        r'(?P<severity>error|warning)\s+'
        r'(?P<rule>[^\s]+)\s+'
        r'(?P<message>.+)$',
        re.MULTILINE
    )

    def parse(self, output: ToolOutput) -> List[Finding]:
        findings: List[Finding] = []

        if output.exit_code == 0 and not output.raw_output.strip():
            # No lint errors
            return findings

        for match in self.ESLINT_PATTERN.finditer(output.raw_output):
            path = match.group('path')
            line = int(match.group('line'))
            col = match.group('col')
            severity_str = match.group('severity')
            rule_id = match.group('rule')
            message = match.group('message')

            severity = Severity.HIGH if severity_str == 'error' else Severity.MEDIUM

            finding = Finding(
                rule_id=rule_id,
                category=Category.LINT,
                severity=severity,
                title=message,
                description=f"ESLint {severity_str}: {message}",
                location=path,
                line=line,
                column=int(col) if col else None,
                evidence=[
                    Evidence(
                        type="log",
                        content=output.raw_output[
                            match.start():match.end()
                        ]
                    )
                ],
                remediation=self._get_remediation(rule_id),
                tool="eslint",
            )
            findings.append(finding)

        # If exit code is non-zero but we didn't parse anything, there's a configuration error
        if output.exit_code != 0 and not findings:
            findings.append(
                Finding(
                    rule_id="eslint/config-error",
                    category=Category.LINT,
                    severity=Severity.BLOCKER,
                    title="ESLint configuration or execution error",
                    description=output.raw_output[:1000],
                    location=".",
                    evidence=[Evidence(type="log", content=output.raw_output)],
                    tool="eslint",
                )
            )

        return findings

    def _get_remediation(self, rule_id: str) -> str:
        """Get remediation hint for common ESLint rules."""
        remediations = {
            "@typescript-eslint/no-unused-vars": "Remove unused variable or prefix with _ to ignore",
            "@typescript-eslint/no-explicit-any": "Replace 'any' with specific type or use unknown",
            "@typescript-eslint/explicit-function-return-type": "Add explicit return type annotation",
            "@typescript-eslint/explicit-module-boundary-types": "Add type annotations to function parameters and return type",
            "no-console": "Remove console statement or use allowed logger methods",
            "prefer-const": "Use 'const' instead of 'let' for variables that don't change",
            "no-var": "Replace 'var' with 'let' or 'const'",
            "react-hooks/exhaustive-deps": "Add missing dependencies to useEffect/useCallback array",
            "react-hooks/rules-of-hooks": "Only call hooks at top level of React functions",
            "@next/next/no-sync-scripts": "Use async scripts or next/script component",
        }
        return remediations.get(rule_id, f"Fix the ESLint error for rule {rule_id}")
