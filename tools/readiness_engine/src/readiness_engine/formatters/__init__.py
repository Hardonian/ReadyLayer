"""
Formatters for output generation.
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, List

from readiness_engine.models import ReadinessVerdict


class BaseFormatter(ABC):
    """Base class for output formatters."""

    @abstractmethod
    def format(self, verdict: ReadinessVerdict, output_path: Path) -> None:
        """Format the verdict and write to output_path."""
        pass


class JSONFormatter(BaseFormatter):
    """Format verdict as JSON."""

    def format(self, verdict: ReadinessVerdict, output_path: Path) -> None:
        import json
        
        # Convert to dict with proper datetime handling
        data = verdict.model_dump()
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, default=str)


class MarkdownFormatter(BaseFormatter):
    """Format verdict as human-readable Markdown."""

    def format(self, verdict: ReadinessVerdict, output_path: Path) -> None:
        lines: List[str] = []
        
        # Header
        status_icon = "✅" if verdict.ready else "❌"
        lines.append(f"# Readiness Report: {status_icon} {verdict.project}")
        lines.append("")
        lines.append(f"**Timestamp:** {verdict.timestamp.isoformat()}")
        if verdict.commit_sha:
            lines.append(f"**Commit:** `{verdict.commit_sha[:8]}`")
        if verdict.branch:
            lines.append(f"**Branch:** {verdict.branch}")
        lines.append("")
        
        # Verdict
        lines.append("## Verdict")
        lines.append("")
        if verdict.ready:
            lines.append("🟢 **READY FOR PRODUCTION**")
            lines.append("")
            lines.append("All checks passed. No blockers or high-severity issues found.")
        else:
            lines.append("🔴 **NOT READY FOR PRODUCTION**")
            lines.append("")
            lines.append("Blockers or high-severity issues detected. See findings below.")
        lines.append("")
        
        # Metrics
        lines.append("## Summary")
        lines.append("")
        lines.append(f"- **Total Findings:** {verdict.metrics.total_findings}")
        lines.append(f"- **Blockers:** {verdict.metrics.blocker_count} 🔴")
        lines.append(f"- **High:** {verdict.metrics.high_count} 🟠")
        lines.append(f"- **Medium:** {verdict.metrics.medium_count} 🟡")
        lines.append(f"- **Low:** {verdict.metrics.low_count} 🟢")
        lines.append("")
        
        # By category
        lines.append("### By Category")
        lines.append("")
        for cat, count in sorted(verdict.metrics.by_category.items()):
            if count > 0:
                lines.append(f"- {cat}: {count}")
        lines.append("")
        
        # By tool
        lines.append("### By Tool")
        lines.append("")
        for tool, count in sorted(verdict.metrics.by_tool.items()):
            if count > 0:
                lines.append(f"- {tool}: {count}")
        lines.append("")
        
        # Findings by severity
        if verdict.findings:
            lines.append("## Findings")
            lines.append("")
            
            # Group by severity
            by_severity: Dict[str, List] = {
                "BLOCKER": [],
                "HIGH": [],
                "MEDIUM": [],
                "LOW": [],
            }
            for f in verdict.findings:
                by_severity[f.severity.value].append(f)
            
            for severity in ["BLOCKER", "HIGH", "MEDIUM", "LOW"]:
                findings = by_severity[severity]
                if not findings:
                    continue
                
                icon = {"BLOCKER": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🟢"}[severity]
                lines.append(f"### {icon} {severity} ({len(findings)})")
                lines.append("")
                
                for finding in findings:
                    lines.append(f"#### {finding.title}")
                    lines.append("")
                    lines.append(f"- **Rule:** `{finding.rule_id}`")
                    lines.append(f"- **Category:** {finding.category.value}")
                    lines.append(f"- **Location:** `{finding.location}`")
                    if finding.line:
                        lines.append(f"- **Line:** {finding.line}")
                    lines.append(f"- **Tool:** {finding.tool}")
                    lines.append("")
                    lines.append(f"**Description:** {finding.description}")
                    lines.append("")
                    
                    if finding.remediation:
                        lines.append(f"**Remediation:** {finding.remediation}")
                        lines.append("")
                    
                    # Evidence
                    if finding.evidence:
                        lines.append("**Evidence:**")
                        lines.append("")
                        for ev in finding.evidence:
                            if ev.path:
                                lines.append(f"- {ev.type}: `{ev.path}`")
                            elif ev.content:
                                lines.append(f"```")
                                lines.append(ev.content[:500])
                                lines.append(f"```")
                        lines.append("")
                    
                    lines.append("---")
                    lines.append("")
        
        # Write to file
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))


class CSVFormatter(BaseFormatter):
    """Format findings as CSV for triage."""

    def format(self, verdict: ReadinessVerdict, output_path: Path) -> None:
        import csv
        
        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            
            # Header
            writer.writerow([
                'severity',
                'category',
                'rule_id',
                'title',
                'location',
                'line',
                'column',
                'tool',
                'remediation',
            ])
            
            # Sort by severity (blockers first)
            severity_order = {"BLOCKER": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
            sorted_findings = sorted(
                verdict.findings,
                key=lambda f: severity_order.get(f.severity.value, 99)
            )
            
            for finding in sorted_findings:
                writer.writerow([
                    finding.severity.value,
                    finding.category.value,
                    finding.rule_id,
                    finding.title,
                    finding.location,
                    finding.line or '',
                    finding.column or '',
                    finding.tool,
                    finding.remediation or '',
                ])
