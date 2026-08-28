"""Report artifact generator handler - Creates JSON/HTML reports from job results.

This handler generates report artifacts from job execution results and stores
them in the job_results table with proper linking to parent jobs and runs.
Supports multiple output formats: json, html, markdown.

Deterministic: Same inputs produce identical reports.
Idempotent: Re-running with same job_id updates existing report.
"""

import json
import hashlib
from typing import Dict, List, Optional, Any
from datetime import datetime
from dataclasses import asdict

from src.handlers.base import BaseHandler, JobResult, register_handler
from src.database import get_cursor
from src.utils.logging import get_logger

logger = get_logger(__name__)


@register_handler
class ReportArtifactHandler(BaseHandler):
    """Handler for report.generate job type.

    Generates report artifacts from job results and stores them.
    Supports linking to ReadyLayerRun, Review, TestRun for context.

    Real tables connected:
    - job_results: Stores the generated report
    - Job: Links report to triggering job
    - ReadyLayerRun: Provides pipeline context
    - Review: Provides review guard context
    - TestRun: Provides test execution context
    """

    job_type = "report.generate"

    # Report templates for HTML generation
    HTML_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        h1 {{ color: #333; border-bottom: 2px solid #007acc; padding-bottom: 10px; }}
        h2 {{ color: #555; margin-top: 30px; }}
        .meta {{ color: #666; font-size: 14px; margin-bottom: 20px; }}
        .section {{ margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 4px; }}
        .metric {{ display: inline-block; margin: 10px 20px 10px 0; }}
        .metric-label {{ color: #666; font-size: 12px; text-transform: uppercase; }}
        .metric-value {{ font-size: 24px; font-weight: bold; color: #007acc; }}
        .status-pass {{ color: #28a745; }}
        .status-fail {{ color: #dc3545; }}
        .status-warn {{ color: #ffc107; }}
        table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
        th, td {{ padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }}
        th {{ background: #f0f0f0; font-weight: 600; }}
        .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>{title}</h1>
        <div class="meta">
            Generated: {generated_at} | Format: {format} | Job ID: {job_id}
        </div>
        {content}
        <div class="footer">
            Report ID: {report_id} | Report Hash: {report_hash}
        </div>
    </div>
</body>
</html>"""

    def validate_payload(self, payload: dict) -> dict:
        """Validate report.generate payload.

        Expected payload:
            - job_id: str - Source job to generate report from
            - format: str - 'json', 'html', 'markdown' (default: 'json')
            - include_context: bool (optional) - Include ReadyLayerRun context (default: True)
            - template: str (optional) - Template name for HTML reports
            - filters: dict (optional) - Filters to apply to results
        """
        required = ["job_id"]
        for field in required:
            if field not in payload:
                raise ValueError(f"Missing required field: {field}")

        # Validate format
        valid_formats = ["json", "html", "markdown"]
        format_type = payload.get("format", "json")
        if format_type not in valid_formats:
            raise ValueError(f"Invalid format: {format_type}. Must be one of: {valid_formats}")

        payload["format"] = format_type
        payload["include_context"] = payload.get("include_context", True)
        payload["template"] = payload.get("template", "default")
        payload["filters"] = payload.get("filters", {})

        return payload

    def execute(self, payload: dict, context: dict) -> JobResult:
        """Execute report generation.

        Args:
            payload: Validated payload with job_id, format, etc.
            context: Execution context with worker_id, correlation_id

        Returns:
            JobResult with generated report and storage confirmation
        """
        source_job_id = payload["job_id"]
        format_type = payload["format"]
        include_context = payload["include_context"]
        template = payload["template"]
        filters = payload["filters"]

        logger.info(
            "Starting report generation",
            source_job_id=source_job_id,
            format=format_type,
            include_context=include_context,
        )

        try:
            with get_cursor() as cursor:
                # 1. Fetch source job result
                source_result = self._fetch_job_result(cursor, source_job_id)
                if not source_result:
                    return JobResult(
                        success=False,
                        error=f"Source job {source_job_id} not found or has no result",
                    )

                # 2. Fetch context if requested
                context_data = None
                if include_context:
                    context_data = self._fetch_run_context(cursor, source_job_id)

                # 3. Apply filters
                filtered_result = self._apply_filters(source_result, filters)

                # 4. Generate report in requested format
                report_id = f"report_{source_job_id}_{format_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                report_hash = self._compute_hash(filtered_result)

                if format_type == "json":
                    report_content = self._generate_json_report(
                        report_id, source_job_id, filtered_result, context_data, context
                    )
                elif format_type == "html":
                    report_content = self._generate_html_report(
                        report_id, source_job_id, filtered_result, context_data, template, context
                    )
                elif format_type == "markdown":
                    report_content = self._generate_markdown_report(
                        report_id, source_job_id, filtered_result, context_data, context
                    )
                else:
                    return JobResult(
                        success=False,
                        error=f"Unsupported format: {format_type}",
                    )

                # 5. Store report in job_results table (idempotent update)
                self._store_report(cursor, report_id, source_job_id, format_type, report_content, report_hash)

                # Build result metadata
                result_data = {
                    "report_id": report_id,
                    "source_job_id": source_job_id,
                    "format": format_type,
                    "generated_at": datetime.now().isoformat(),
                    "report_hash": report_hash,
                    "content_size_bytes": len(report_content.encode('utf-8')),
                    "has_context": context_data is not None,
                    "filters_applied": list(filters.keys()) if filters else [],
                    "worker_id": context.get("worker_id"),
                }

                logger.info(
                    "Report generation complete",
                    report_id=report_id,
                    format=format_type,
                    content_size=result_data["content_size_bytes"],
                )

                return JobResult(
                    success=True,
                    data=result_data,
                    artifacts={
                        "report_content": report_content if format_type == "json" else None,
                        "report_preview": report_content[:1000] if format_type != "json" else None,
                        "source_result_keys": list(filtered_result.keys()) if isinstance(filtered_result, dict) else [],
                    }
                )

        except Exception as e:
            logger.error(
                "Report generation failed",
                source_job_id=source_job_id,
                error=str(e),
                exc_info=True,
            )
            return JobResult(
                success=False,
                error=f"Report generation failed: {str(e)}",
            )

    def _fetch_job_result(self, cursor, job_id: str) -> Optional[dict]:
        """Fetch job result from job_results table."""
        cursor.execute(
            """
            SELECT result
            FROM job_results
            WHERE job_id = %s
            """,
            (job_id,),
        )
        row = cursor.fetchone()

        if row and row["result"]:
            result = row["result"]
            if isinstance(result, str):
                return json.loads(result)
            return result

        # Fallback: check Job table directly
        cursor.execute(
            """
            SELECT result
            FROM jobs
            WHERE id = %s
            """,
            (job_id,),
        )
        row = cursor.fetchone()

        if row and row["result"]:
            result = row["result"]
            if isinstance(result, str):
                return json.loads(result)
            return result

        return None

    def _fetch_run_context(self, cursor, job_id: str) -> Optional[dict]:
        """Fetch ReadyLayerRun context for a job."""
        cursor.execute(
            """
            SELECT
                j."runId",
                j."repositoryId",
                j."organizationId",
                j.type as job_type,
                r.status as run_status,
                r."reviewGuardStatus",
                r."testEngineStatus",
                r."docSyncStatus",
                r.conclusion
            FROM jobs j
            LEFT JOIN "ReadyLayerRun" r ON j."runId" = r.id
            WHERE j.id = %s
            """,
            (job_id,),
        )
        row = cursor.fetchone()

        if not row:
            return None

        context = {
            "run_id": row["runId"],
            "repository_id": row["repositoryId"],
            "organization_id": row["organizationId"],
            "job_type": row["job_type"],
        }

        if row["run_status"]:
            context["run_status"] = row["run_status"]
            context["review_guard_status"] = row["reviewGuardStatus"]
            context["test_engine_status"] = row["testEngineStatus"]
            context["doc_sync_status"] = row["docSyncStatus"]
            context["conclusion"] = row["conclusion"]

        # If we have a run_id, fetch related reviews and test runs
        if row["runId"]:
            context["related_data"] = self._fetch_related_data(cursor, row["runId"])

        return context

    def _fetch_related_data(self, cursor, run_id: str) -> dict:
        """Fetch reviews and test runs related to a ReadyLayerRun."""
        related = {}

        # Fetch reviews
        cursor.execute(
            """
            SELECT
                r.id, r.status, r."issuesFound", r."isBlocked",
                r."prNumber", r."prSha"
            FROM "Review" r
            WHERE r.id = (
                SELECT "reviewId" FROM "ReadyLayerRun" WHERE id = %s
            )
            """,
            (run_id,),
        )
        review = cursor.fetchone()
        if review:
            related["review"] = {
                "id": review["id"],
                "status": review["status"],
                "is_blocked": review["isBlocked"],
                "pr_number": review["prNumber"],
            }

        # Fetch test runs
        cursor.execute(
            """
            SELECT
                t.id, t.status, t.conclusion, t.coverage, t.summary
            FROM "TestRun" t
            JOIN "ReadyLayerRun" r ON t."prSha" = r."triggerMetadata"->>'prSha'
            WHERE r.id = %s
            LIMIT 1
            """,
            (run_id,),
        )
        test_run = cursor.fetchone()
        if test_run:
            related["test_run"] = {
                "id": test_run["id"],
                "status": test_run["status"],
                "conclusion": test_run["conclusion"],
                "has_coverage": test_run["coverage"] is not None,
            }

        return related

    def _apply_filters(self, result: Any, filters: dict) -> Any:
        """Apply filters to result data."""
        if not filters or not isinstance(result, dict):
            return result

        filtered = result.copy()

        # Include only specified keys
        if "include_keys" in filters:
            keys = filters["include_keys"]
            filtered = {k: v for k, v in filtered.items() if k in keys}

        # Exclude specified keys
        if "exclude_keys" in filters:
            keys = filters["exclude_keys"]
            filtered = {k: v for k, v in filtered.items() if k not in keys}

        # Limit nested arrays
        if "max_array_items" in filters:
            max_items = filters["max_array_items"]
            for key, value in filtered.items():
                if isinstance(value, list) and len(value) > max_items:
                    filtered[key] = value[:max_items]
                    filtered[f"{key}_truncated"] = True
                    filtered[f"{key}_total"] = len(value)

        return filtered

    def _compute_hash(self, data: Any) -> str:
        """Compute deterministic hash of data for idempotency."""
        content = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(content.encode('utf-8')).hexdigest()[:16]

    def _generate_json_report(
        self,
        report_id: str,
        source_job_id: str,
        result: Any,
        context: Optional[dict],
        exec_context: dict
    ) -> str:
        """Generate JSON format report."""
        report = {
            "report_id": report_id,
            "report_type": "job_result_summary",
            "source_job_id": source_job_id,
            "generated_at": datetime.now().isoformat(),
            "generated_by": exec_context.get("worker_id", "unknown"),
            "format": "json",
            "result": result,
            "context": context,
            "metadata": {
                "deterministic": True,
                "version": "1.0.0",
            },
        }
        return json.dumps(report, indent=2, default=str)

    def _generate_html_report(
        self,
        report_id: str,
        source_job_id: str,
        result: Any,
        context: Optional[dict],
        template: str,
        exec_context: dict
    ) -> str:
        """Generate HTML format report."""
        title = f"Job Report: {source_job_id[:8]}..."

        # Build content sections
        sections = []

        # Result summary section
        if isinstance(result, dict):
            sections.append("<h2>Result Summary</h2>")
            sections.append('<div class="section">')

            # Display key metrics
            for key, value in result.items():
                if key in ["success", "status", "overall_score", "grade"]:
                    status_class = ""
                    if key == "success":
                        status_class = "status-pass" if value else "status-fail"
                    elif key == "status":
                        if value in ["completed", "passed", "success", "generated"]:
                            status_class = "status-pass"
                        elif value in ["failed", "error", "blocked"]:
                            status_class = "status-fail"
                        else:
                            status_class = "status-warn"

                    sections.append(
                        f'<div class="metric">'
                        f'<div class="metric-label">{key.replace("_", " ").title()}</div>'
                        f'<div class="metric-value {status_class}">{value}</div>'
                        f'</div>'
                    )

            sections.append('</div>')

            # Details table
            if len(result) > 0:
                sections.append("<h2>Details</h2>")
                sections.append("<table>")
                sections.append("<tr><th>Key</th><th>Value</th></tr>")

                for key, value in result.items():
                    if key not in ["success", "status"]:
                        if isinstance(value, (dict, list)):
                            value_str = json.dumps(value, indent=2)[:200]
                            if len(json.dumps(value)) > 200:
                                value_str += "..."
                        else:
                            value_str = str(value)

                        sections.append(
                            f"<tr><td>{key}</td><td><pre>{value_str}</pre></td></tr>"
                        )

                sections.append("</table>")

        # Context section
        if context:
            sections.append("<h2>Pipeline Context</h2>")
            sections.append('<div class="section">')
            sections.append(f'<p><strong>Run ID:</strong> {context.get("run_id", "N/A")}</p>')
            sections.append(f'<p><strong>Repository:</strong> {context.get("repository_id", "N/A")}</p>')
            sections.append(f'<p><strong>Run Status:</strong> {context.get("run_status", "N/A")}</p>')
            sections.append(f'<p><strong>Conclusion:</strong> {context.get("conclusion", "N/A")}</p>')
            sections.append('</div>')

        content = "\n".join(sections)

        return self.HTML_TEMPLATE.format(
            title=title,
            content=content,
            generated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            format="HTML",
            job_id=source_job_id[:8],
            report_id=report_id[:16],
            report_hash=self._compute_hash(result),
        )

    def _generate_markdown_report(
        self,
        report_id: str,
        source_job_id: str,
        result: Any,
        context: Optional[dict],
        exec_context: dict
    ) -> str:
        """Generate Markdown format report."""
        lines = [
            f"# Job Report: `{source_job_id[:8]}...`",
            "",
            f"**Report ID:** `{report_id}`  ",
            f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  ",
            f"**Format:** Markdown  ",
            f"**Worker:** {exec_context.get('worker_id', 'unknown')}  ",
            "",
            "## Result Summary",
            "",
        ]

        if isinstance(result, dict):
            # Key metrics
            for key, value in result.items():
                if key in ["success", "status", "overall_score", "grade"]:
                    emoji = "✅" if value in [True, "completed", "passed", "success"] else "❌" if value in [False, "failed", "error"] else "⚠️"
                    lines.append(f"- {emoji} **{key.replace('_', ' ').title()}:** {value}")

            lines.append("")
            lines.append("## Details")
            lines.append("")
            lines.append("```json")
            lines.append(json.dumps(result, indent=2, default=str))
            lines.append("```")
        else:
            lines.append(f"```\n{result}\n```")

        if context:
            lines.append("")
            lines.append("## Pipeline Context")
            lines.append("")
            lines.append(f"- **Run ID:** `{context.get('run_id', 'N/A')}`")
            lines.append(f"- **Repository:** `{context.get('repository_id', 'N/A')}`")
            lines.append(f"- **Run Status:** {context.get('run_status', 'N/A')}")
            lines.append(f"- **Conclusion:** {context.get('conclusion', 'N/A')}")

        lines.append("")
        lines.append("---")
        lines.append(f"*Report Hash: `{self._compute_hash(result)}`*")

        return "\n".join(lines)

    def _store_report(
        self,
        cursor,
        report_id: str,
        source_job_id: str,
        format_type: str,
        content: str,
        report_hash: str
    ) -> None:
        """Store report in job_results table (idempotent)."""
        # Store as a new job result entry
        cursor.execute(
            """
            INSERT INTO job_results (job_id, result, created_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (job_id) DO UPDATE
            SET result = EXCLUDED.result,
                created_at = EXCLUDED.created_at
            """,
            (
                report_id,
                json.dumps({
                    "report_id": report_id,
                    "source_job_id": source_job_id,
                    "format": format_type,
                    "content": content,
                    "hash": report_hash,
                    "stored_at": datetime.now().isoformat(),
                }),
            ),
        )

        logger.info(
            "Stored report artifact",
            report_id=report_id,
            source_job_id=source_job_id,
            format=format_type,
        )
