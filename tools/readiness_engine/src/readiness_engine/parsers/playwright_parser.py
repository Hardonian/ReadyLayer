"""
Playwright test results parser.
Parses Playwright HTML reports and test results.
"""

import json
import re
from pathlib import Path
from typing import List

from readiness_engine.models import Category, Evidence, Finding, Severity, ToolOutput
from . import BaseParser


class PlaywrightParser(BaseParser):
    """Parser for Playwright test results."""

    def __init__(self, project_root: Path):
        self.project_root = project_root

    def parse(self, output: ToolOutput) -> List[Finding]:
        findings: List[Finding] = []
        
        # Parse from metadata if available
        report_dir = output.metadata.get("report_dir")
        test_results_dir = output.metadata.get("test_results_dir")
        
        if report_dir:
            findings.extend(self._parse_html_report(Path(report_dir)))
        
        if test_results_dir:
            findings.extend(self._parse_test_results(Path(test_results_dir)))
        
        return findings

    def _parse_html_report(self, report_dir: Path) -> List[Finding]:
        """Parse Playwright HTML report."""
        findings: List[Finding] = []
        
        # Try to read the JSON report data
        json_report = report_dir / "report.json"
        if json_report.exists():
            try:
                with open(json_report, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                for suite in data.get('suites', []):
                    for spec in suite.get('specs', []):
                        for test in spec.get('tests', []):
                            for result in test.get('results', []):
                                if result.get('status') != 'passed':
                                    finding = self._create_finding_from_result(
                                        spec.get('title', 'Unknown test'),
                                        test.get('title', ''),
                                        result,
                                        suite.get('title', ''),
                                    )
                                    findings.append(finding)
            except (json.JSONDecodeError, IOError):
                pass
        
        return findings

    def _parse_test_results(self, results_dir: Path) -> List[Finding]:
        """Parse test-results directory for failed tests."""
        findings: List[Finding] = []
        
        if not results_dir.exists():
            return findings
        
        # Look for test result directories
        for test_dir in results_dir.iterdir():
            if not test_dir.is_dir():
                continue
            
            # Check for trace, screenshot, or video indicating failure
            trace_file = test_dir / "trace.zip"
            screenshot = test_dir / "test-failed-1.png"
            video = test_dir / "video.webm"
            
            if trace_file.exists() or screenshot.exists():
                # Extract test name from directory name
                test_name = test_dir.name.replace('-', ' ').replace('_', ' ')
                
                evidence_list: List[Evidence] = []
                
                if screenshot.exists():
                    evidence_list.append(
                        Evidence(
                            type="screenshot",
                            path=str(screenshot.relative_to(self.project_root)),
                            metadata={"context": "failure screenshot"},
                        )
                    )
                
                if trace_file.exists():
                    evidence_list.append(
                        Evidence(
                            type="trace",
                            path=str(trace_file.relative_to(self.project_root)),
                            metadata={"context": "Playwright trace"},
                        )
                    )
                
                if video.exists():
                    evidence_list.append(
                        Evidence(
                            type="video",
                            path=str(video.relative_to(self.project_root)),
                            metadata={"context": "test video"},
                        )
                    )
                
                # Read error from test-stderr.txt if available
                stderr_file = test_dir / "test-stderr.txt"
                error_content = ""
                if stderr_file.exists():
                    try:
                        error_content = stderr_file.read_text(encoding='utf-8')[:2000]
                        evidence_list.append(
                            Evidence(type="log", content=error_content)
                        )
                    except IOError:
                        pass
                
                # Check if this is a visual regression test
                is_visual = 'visual' in test_name.lower()
                
                # Check if it's a critical route
                critical_routes = ['homepage', 'signin', 'dashboard', 'billing']
                is_critical = any(route in test_name.lower() for route in critical_routes)
                
                if is_visual and is_critical:
                    severity = Severity.HIGH
                    title = f"Visual regression on critical route: {test_name}"
                elif is_visual:
                    severity = Severity.MEDIUM
                    title = f"Visual regression: {test_name}"
                else:
                    severity = Severity.HIGH
                    title = f"E2E test failure: {test_name}"
                
                finding = Finding(
                    rule_id=f"playwright/{'visual-regression' if is_visual else 'test-failure'}",
                    category=Category.UI,
                    severity=severity,
                    title=title,
                    description=f"Playwright test failed: {test_name}\n\nError:\n{error_content[:500]}",
                    location=test_name,
                    evidence=evidence_list,
                    remediation="Review test failure and fix underlying issue",
                    tool="playwright",
                )
                findings.append(finding)
        
        return findings

    def _create_finding_from_result(
        self,
        spec_title: str,
        test_title: str,
        result: dict,
        suite_title: str,
    ) -> Finding:
        """Create a Finding from a Playwright test result."""
        status = result.get('status', 'unknown')
        error = result.get('error', {}).get('message', 'Test failed')
        
        # Determine severity based on test type
        is_visual = 'visual' in spec_title.lower()
        is_critical = any(
            route in spec_title.lower() 
            for route in ['homepage', 'signin', 'dashboard', 'billing']
        )
        
        if is_visual and is_critical:
            severity = Severity.HIGH
        elif is_visual:
            severity = Severity.MEDIUM
        else:
            severity = Severity.HIGH
        
        # Extract attachments
        evidence_list: List[Evidence] = [
            Evidence(type="log", content=error)
        ]
        
        for attachment in result.get('attachments', []):
            if attachment.get('name') in ['screenshot', 'trace', 'video']:
                evidence_list.append(
                    Evidence(
                        type=attachment['name'],
                        path=attachment.get('path', ''),
                    )
                )
        
        return Finding(
            rule_id=f"playwright/{status}",
            category=Category.UI,
            severity=severity,
            title=f"{spec_title} - {test_title}",
            description=error,
            location=f"{suite_title} > {spec_title}",
            evidence=evidence_list,
            remediation="Review Playwright test output and fix the issue",
            tool="playwright",
        )
