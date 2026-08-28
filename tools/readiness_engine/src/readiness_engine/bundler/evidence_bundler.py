"""
Evidence bundler - creates zip archive with all evidence files.
"""

import zipfile
from pathlib import Path
from typing import List, Set

from readiness_engine.models import Evidence, Finding, ReadinessVerdict


class EvidenceBundler:
    """Creates evidence bundles (zip files) with all supporting files."""

    def __init__(self, project_root: Path):
        self.project_root = project_root

    def create_bundle(self, verdict: ReadinessVerdict, output_path: Path) -> None:
        """
        Create a zip bundle with all evidence files.

        Includes:
        - Screenshots
        - Traces
        - Log excerpts
        - Diffs (if available)
        """
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Add all evidence files
            added_paths: Set[str] = set()

            for finding in verdict.findings:
                for evidence in finding.evidence:
                    if evidence.path:
                        full_path = self.project_root / evidence.path
                        if full_path.exists() and str(full_path) not in added_paths:
                            # Store with relative path
                            arcname = Path(evidence.path).as_posix()
                            zf.write(full_path, arcname)
                            added_paths.add(str(full_path))

            # Add JSON report for reference
            import json
            report_data = {
                "version": verdict.version,
                "timestamp": verdict.timestamp.isoformat(),
                "project": verdict.project,
                "ready": verdict.ready,
                "metrics": {
                    "total": verdict.metrics.total_findings,
                    "blockers": verdict.metrics.blocker_count,
                    "high": verdict.metrics.high_count,
                    "medium": verdict.metrics.medium_count,
                    "low": verdict.metrics.low_count,
                },
                "findings_summary": [
                    {
                        "rule_id": f.rule_id,
                        "severity": f.severity.value,
                        "category": f.category.value,
                        "title": f.title,
                        "location": f.location,
                    }
                    for f in verdict.findings
                ],
            }
            zf.writestr("report-summary.json", json.dumps(report_data, indent=2))
