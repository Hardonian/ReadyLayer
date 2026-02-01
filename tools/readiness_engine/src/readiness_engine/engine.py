"""
Core engine that orchestrates parsing, classification, and output generation.
"""

import subprocess
from pathlib import Path
from typing import Dict, List, Optional

from .models import Category, Finding, ReadinessVerdict, Severity, ToolOutput
from .parsers.eslint_parser import ESLintParser
from .parsers.typescript_parser import TypeScriptParser
from .parsers.build_parser import BuildParser
from .parsers.playwright_parser import PlaywrightParser
from .parsers.vitest_parser import VitestParser
from .classifiers.severity_classifier import SeverityClassifier
from .formatters.json_formatter import JSONFormatter
from .formatters.markdown_formatter import MarkdownFormatter
from .formatters.csv_formatter import CSVFormatter
from .bundler.evidence_bundler import EvidenceBundler


class ReadinessEngine:
    """
    Main engine that coordinates the readiness assessment pipeline.
    """

    def __init__(self, project_name: str, project_root: Path):
        self.project_name = project_name
        self.project_root = project_root
        self.parsers = {
            "eslint": ESLintParser(),
            "typescript": TypeScriptParser(),
            "build": BuildParser(),
            "playwright": PlaywrightParser(project_root),
            "vitest": VitestParser(),
        }
        self.classifier = SeverityClassifier()
        self.formatters = {
            "json": JSONFormatter(),
            "markdown": MarkdownFormatter(),
            "csv": CSVFormatter(),
        }
        self.bundler = EvidenceBundler(project_root)

    def run_tool(self, tool_name: str, command: List[str]) -> ToolOutput:
        """Execute a tool and capture its output."""
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                cwd=self.project_root,
                timeout=300,  # 5 minute timeout
            )
            return ToolOutput(
                tool=tool_name,
                raw_output=result.stdout + result.stderr,
                exit_code=result.returncode,
            )
        except subprocess.TimeoutExpired:
            return ToolOutput(
                tool=tool_name,
                raw_output="Tool execution timed out after 300 seconds",
                exit_code=124,
            )
        except Exception as e:
            return ToolOutput(
                tool=tool_name,
                raw_output=f"Failed to execute tool: {str(e)}",
                exit_code=1,
            )

    def parse_tool_output(self, tool_name: str, output: ToolOutput) -> List[Finding]:
        """Parse raw tool output into normalized findings."""
        parser = self.parsers.get(tool_name)
        if not parser:
            raise ValueError(f"No parser available for tool: {tool_name}")
        return parser.parse(output)

    def assess_readiness(
        self,
        commit_sha: Optional[str] = None,
        branch: Optional[str] = None,
    ) -> ReadinessVerdict:
        """
        Run full readiness assessment by executing all tools.
        """
        findings: List[Finding] = []

        # Run ESLint
        eslint_output = self.run_tool("eslint", ["npm", "run", "lint"])
        findings.extend(self.parse_tool_output("eslint", eslint_output))

        # Run TypeScript type check
        tsc_output = self.run_tool("typescript", ["npm", "run", "type-check"])
        findings.extend(self.parse_tool_output("typescript", tsc_output))

        # Run Build
        build_output = self.run_tool("build", ["npm", "run", "build"])
        findings.extend(self.parse_tool_output("build", build_output))

        # Run Vitest tests
        vitest_output = self.run_tool("vitest", ["npm", "test"])
        findings.extend(self.parse_tool_output("vitest", vitest_output))

        # Check for Playwright results (run separately, read from report)
        findings.extend(self.parse_playwright_results())

        # Apply severity classification
        for finding in findings:
            self.classifier.classify(finding)

        # Determine readiness
        ready = not any(
            f.severity in (Severity.BLOCKER, Severity.HIGH) for f in findings
        )

        verdict = ReadinessVerdict(
            project=self.project_name,
            commit_sha=commit_sha,
            branch=branch,
            ready=ready,
            findings=findings,
        )
        verdict.compute_metrics()

        return verdict

    def parse_playwright_results(self) -> List[Finding]:
        """Parse Playwright results from report directory."""
        report_dir = self.project_root / "playwright-report"
        test_results_dir = self.project_root / "test-results"
        
        findings: List[Finding] = []
        
        if report_dir.exists():
            output = ToolOutput(
                tool="playwright",
                raw_output="",
                exit_code=0,
                metadata={
                    "report_dir": str(report_dir),
                    "test_results_dir": str(test_results_dir) if test_results_dir.exists() else None,
                },
            )
            findings.extend(self.parsers["playwright"].parse(output))
        
        return findings

    def generate_outputs(
        self,
        verdict: ReadinessVerdict,
        output_dir: Path,
    ) -> Dict[str, Path]:
        """Generate all output formats."""
        output_dir.mkdir(parents=True, exist_ok=True)
        outputs = {}

        # JSON report
        json_path = output_dir / "readiness.json"
        self.formatters["json"].format(verdict, json_path)
        outputs["json"] = json_path

        # Markdown report
        md_path = output_dir / "readiness.md"
        self.formatters["markdown"].format(verdict, md_path)
        outputs["markdown"] = md_path

        # CSV findings
        csv_path = output_dir / "findings.csv"
        self.formatters["csv"].format(verdict, csv_path)
        outputs["csv"] = csv_path

        # Evidence bundle
        evidence_path = output_dir / "evidence.zip"
        self.bundler.create_bundle(verdict, evidence_path)
        outputs["evidence"] = evidence_path

        return outputs
