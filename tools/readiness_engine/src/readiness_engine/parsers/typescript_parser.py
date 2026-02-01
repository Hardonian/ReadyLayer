"""
TypeScript compiler output parser.
Parses tsc --noEmit error format.
"""

import re
from typing import List

from readiness_engine.models import Category, Evidence, Finding, Severity, ToolOutput
from . import BaseParser


class TypeScriptParser(BaseParser):
    """Parser for TypeScript compiler output."""

    # Pattern: file(line,col): error TSxxxx: message
    TSC_PATTERN = re.compile(
        r'^(?P<path>[^\(]+)\((?P<line>\d+),(?P<col>\d+)\):\s+'
        r'(?P<severity>error|warning)\s+'
        r'(?P<code>TS\d+):\s+'
        r'(?P<message>.+)$',
        re.MULTILINE
    )

    def parse(self, output: ToolOutput) -> List[Finding]:
        findings: List[Finding] = []
        
        if output.exit_code == 0 and not output.raw_output.strip():
            # No type errors
            return findings
        
        for match in self.TSC_PATTERN.finditer(output.raw_output):
            path = match.group('path').strip()
            line = int(match.group('line'))
            col = int(match.group('col'))
            severity_str = match.group('severity')
            code = match.group('code')
            message = match.group('message')
            
            # Type errors are always blockers - they prevent the build
            severity = Severity.BLOCKER if severity_str == 'error' else Severity.HIGH
            
            finding = Finding(
                rule_id=code,
                category=Category.TYPE,
                severity=severity,
                title=message,
                description=f"TypeScript {severity_str}: {message}",
                location=path,
                line=line,
                column=col,
                evidence=[
                    Evidence(
                        type="log",
                        content=output.raw_output[
                            match.start():match.end()
                        ]
                    )
                ],
                remediation=self._get_remediation(code, message),
                tool="typescript",
            )
            findings.append(finding)
        
        # If no specific errors found but exit code is non-zero
        if output.exit_code != 0 and not findings:
            findings.append(
                Finding(
                    rule_id="typescript/config-error",
                    category=Category.TYPE,
                    severity=Severity.BLOCKER,
                    title="TypeScript configuration or execution error",
                    description=output.raw_output[:1000],
                    location=".",
                    evidence=[Evidence(type="log", content=output.raw_output)],
                    tool="typescript",
                )
            )
        
        return findings

    def _get_remediation(self, code: str, message: str) -> str:
        """Get remediation hint for common TypeScript errors."""
        remediations = {
            "TS2322": "Type assignment mismatch - ensure types are compatible",
            "TS2345": "Function argument type mismatch - check parameter types",
            "TS2304": "Cannot find name - check for undefined variable or missing import",
            "TS2307": "Cannot find module - check import path or install missing dependency",
            "TS7006": "Parameter implicitly has 'any' type - add explicit type annotation",
            "TS7005": "Variable implicitly has 'any' type - add explicit type annotation",
            "TS2769": "No overload matches - check function signature compatibility",
            "TS2349": "Cannot invoke an object which is possibly 'undefined' - add null check",
            "TS2532": "Object is possibly 'undefined' - add optional chaining or null check",
            "TS2531": "Object is possibly 'null' - add null check",
            "TS2554": "Expected arguments but got X - check function signature",
            "TS2551": "Property does not exist - check property name or type definition",
            "TS2339": "Property does not exist on type - check type definition",
            "TS7053": "Return type annotation - add explicit return type",
        }
        return remediations.get(code, f"Fix TypeScript error: {message}")
