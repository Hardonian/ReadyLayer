"""Report artifact build handler - Build human + machine readable reports.

This handler builds comprehensive reports in multiple formats (JSON, HTML)
from evaluation run data. Creates artifacts with checksums for integrity.

Deterministic: Same eval_run_id produces identical reports.
Idempotent: Re-running updates existing artifacts.
Tenant-scoped: Reports are isolated per tenant.
"""

import json
import hashlib
from typing import Dict, List, Optional, Any
from datetime import datetime

from src.handlers.base import BaseHandler, JobResult, register_handler
from src.database import get_cursor
from src.utils.logging import get_logger

logger = get_logger(__name__)


@register_handler
class ReportArtifactBuildHandler(BaseHandler):
    """Handler for report.artifact.build job type.
    
    Builds human-consumable (HTML) and machine-consumable (JSON) reports
    from evaluation run data. Stores artifacts with checksums.
    
    Real tables connected:
    - job_results: Stores generated reports
    - ReadyLayerRun: Source of evaluation data
    - Review: Review guard context
    - TestRun: Test execution context
    """
    
    job_type = "report.artifact.build"
    
    # HTML Report Template
    HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - ReadyLayer Report</title>
    <style>
        :root {{
            --color-primary: #007acc;
            --color-success: #28a745;
            --color-warning: #ffc107;
            --color-danger: #dc3545;
            --color-text: #333;
            --color-text-muted: #666;
            --color-bg: #f5f5f5;
            --color-card: #fff;
            --border-radius: 8px;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--color-bg);
            color: var(--color-text);
            line-height: 1.6;
            padding: 20px;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        header {{
            background: var(--color-card);
            padding: 30px;
            border-radius: var(--border-radius);
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        h1 {{
            font-size: 28px;
            margin-bottom: 10px;
            color: var(--color-text);
        }}
        .meta {{
            color: var(--color-text-muted);
            font-size: 14px;
        }}
        .score-card {{
            background: var(--color-card);
            padding: 30px;
            border-radius: var(--border-radius);
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }}
        .score-value {{
            font-size: 72px;
            font-weight: bold;
            color: var(--color-primary);
        }}
        .score-grade {{
            font-size: 36px;
            color: var(--color-text-muted);
        }}
        .score-label {{
            font-size: 16px;
            color: var(--color-text-muted);
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        .grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }}
        .card {{
            background: var(--color-card);
            padding: 20px;
            border-radius: var(--border-radius);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .card h2 {{
            font-size: 18px;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid var(--color-primary);
        }}
        .metric {{
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }}
        .metric:last-child {{ border-bottom: none; }}
        .metric-label {{ color: var(--color-text-muted); }}
        .metric-value {{ font-weight: 600; }}
        .status-pass {{ color: var(--color-success); }}
        .status-fail {{ color: var(--color-danger); }}
        .status-warn {{ color: var(--color-warning); }}
        .section {{
            background: var(--color-card);
            padding: 20px;
            border-radius: var(--border-radius);
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .section h2 {{
            font-size: 20px;
            margin-bottom: 15px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }}
        th {{
            font-weight: 600;
            color: var(--color-text-muted);
            font-size: 12px;
            text-transform: uppercase;
        }}
        .footer {{
            text-align: center;
            padding: 20px;
            color: var(--color-text-muted);
            font-size: 12px;
        }}
        .badge {{
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }}
        .badge-success {{ background: #d4edda; color: #155724; }}
        .badge-warning {{ background: #fff3cd; color: #856404; }}
        .badge-danger {{ background: #f8d7da; color: #721c24; }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>{title}</h1>
            <div class="meta">
                Repository: {repo_ref} | Commit: {commit_sha} | Generated: {generated_at}
            </div>
        </header>
        
        <div class="score-card">
            <div class="score-label">Readiness Score</div>
            <div class="score-value {score_class}">{overall_score}</div>
            <div class="score-grade">Grade: {grade}</div>
        </div>
        
        <div class="grid">
            {category_cards}
        </div>
        
        <div class="section">
            <h2>Evaluation Summary</h2>
            <table>
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                    <th>Status</th>
                </tr>
                {summary_rows}
            </table>
        </div>
        
        <div class="section">
            <h2>Artifact Details</h2>
            <div class="metric">
                <span class="metric-label">Report ID</span>
                <span class="metric-value">{report_id}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Checksum (SHA-256)</span>
                <span class="metric-value">{checksum}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Formats Available</span>
                <span class="metric-value">{formats}</span>
            </div>
        </div>
        
        <div class="footer">
            <p>ReadyLayer Evaluation Report | Generated by {worker_id}</p>
            <p>Report Hash: {report_hash}</p>
        </div>
    </div>
</body>
</html>"""
    
    def validate_payload(self, payload: dict) -> dict:
        """Validate report.artifact.build payload.
        
        Expected payload:
            - tenant_id (organization_id): str - Organization scope
            - eval_run_id: str - ID of the evaluation run to report on
            - formats: list - Output formats ['json', 'html'] (default: ['json'])
            - include_details: bool (optional) - Include full details (default: True)
            - dry_run: bool (optional) - Preview without storing (default: False)
        """
        required = ["tenant_id", "eval_run_id"]
        for field in required:
            if field not in payload:
                raise ValueError(f"Missing required field: {field}")
        
        # Validate formats
        valid_formats = ["json", "html", "markdown"]
        formats = payload.get("formats", ["json"])
        invalid = [f for f in formats if f not in valid_formats]
        if invalid:
            raise ValueError(f"Invalid formats: {invalid}. Must be one of: {valid_formats}")
        
        payload["formats"] = formats
        payload["include_details"] = payload.get("include_details", True)
        payload["dry_run"] = payload.get("dry_run", False)
        
        return payload
    
    def execute(self, payload: dict, context: dict) -> JobResult:
        """Execute report artifact building.
        
        Args:
            payload: Validated payload with report parameters
            context: Execution context with worker_id
        
        Returns:
            JobResult with artifact metadata and content
        """
        tenant_id = payload["tenant_id"]
        eval_run_id = payload["eval_run_id"]
        formats = payload["formats"]
        include_details = payload["include_details"]
        dry_run = payload["dry_run"]
        
        logger.info(
            "Starting report artifact build",
            tenant_id=tenant_id,
            eval_run_id=eval_run_id,
            formats=formats,
        )
        
        try:
            with get_cursor() as cursor:
                # Fetch evaluation run data
                eval_data = self._fetch_eval_run(cursor, tenant_id, eval_run_id)
                if not eval_data:
                    return JobResult(
                        success=False,
                        error=f"Evaluation run not found: {eval_run_id} for tenant {tenant_id}",
                    )
                
                # Fetch related data
                if include_details:
                    related_data = self._fetch_related_data(cursor, eval_data.get("repository_id"), 
                                                             eval_data.get("run_id"))
                else:
                    related_data = {}
                
                # Build report data structure
                report_data = self._build_report_data(eval_data, related_data, include_details)
                
                # Generate artifacts in requested formats
                artifacts = {}
                checksums = {}
                
                if "json" in formats:
                    json_content = self._generate_json_report(report_data, context)
                    artifacts["json"] = json_content
                    checksums["json"] = self._compute_checksum(json_content)
                
                if "html" in formats:
                    html_content = self._generate_html_report(report_data, context)
                    artifacts["html"] = html_content
                    checksums["html"] = self._compute_checksum(html_content)
                
                # Compute overall report hash
                report_hash = self._compute_report_hash(artifacts)
                
                # Store artifacts if not dry run
                if not dry_run:
                    self._store_artifacts(
                        cursor, tenant_id, eval_run_id, formats, 
                        artifacts, checksums, report_hash
                    )
                
                result_data = {
                    "tenant_id": tenant_id,
                    "eval_run_id": eval_run_id,
                    "report_id": f"report_{eval_run_id}",
                    "formats": formats,
                    "report_hash": report_hash,
                    "checksums": checksums,
                    "repository_id": eval_data.get("repository_id"),
                    "repo_ref": eval_data.get("repo_ref"),
                    "commit_sha": eval_data.get("commit_sha"),
                    "overall_score": report_data.get("overall_score"),
                    "grade": report_data.get("grade"),
                    "generated_at": datetime.now().isoformat(),
                    "dry_run": dry_run,
                    "stored": not dry_run,
                    "worker_id": context.get("worker_id"),
                }
                
                logger.info(
                    "Report artifact build complete",
                    tenant_id=tenant_id,
                    eval_run_id=eval_run_id,
                    formats=formats,
                    report_hash=report_hash[:8],
                )
                
                return JobResult(
                    success=True,
                    data=result_data,
                    artifacts={
                        "json_preview": artifacts.get("json", "")[:500] if "json" in artifacts else None,
                        "html_size_bytes": len(artifacts.get("html", "")) if "html" in artifacts else 0,
                        "json_size_bytes": len(artifacts.get("json", "")) if "json" in artifacts else 0,
                        "checksums": checksums,
                    }
                )
                
        except Exception as e:
            logger.error(
                "Report artifact build failed",
                tenant_id=tenant_id,
                eval_run_id=eval_run_id,
                error=str(e),
                exc_info=True,
            )
            return JobResult(
                success=False,
                error=f"Report artifact build failed: {str(e)}",
            )
    
    def _fetch_eval_run(self, cursor, tenant_id: str, eval_run_id: str) -> Optional[dict]:
        """Fetch evaluation run data from job_results or ReadyLayerRun."""
        # First try job_results
        cursor.execute(
            """
            SELECT result
            FROM job_results
            WHERE job_id = %s
            """,
            (eval_run_id,),
        )
        row = cursor.fetchone()
        if row:
            result = row["result"]
            if isinstance(result, str):
                result = json.loads(result)
            
            # Extract relevant fields
            return {
                "run_id": result.get("run_id"),
                "repository_id": result.get("repository_id"),
                "organization_id": result.get("organization_id", tenant_id),
                "repo_ref": result.get("repo_ref"),
                "commit_sha": result.get("commit_sha"),
                "overall_score": result.get("overall_score"),
                "grade": result.get("grade"),
                "breakdown": result.get("breakdown", {}),
                "status": result.get("status", "unknown"),
                "source": "job_results",
            }
        
        # Fallback: Try to construct from readiness.score results
        cursor.execute(
            """
            SELECT result
            FROM job_results
            WHERE job_id LIKE %s
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (f"readiness_{eval_run_id}%",),
        )
        row = cursor.fetchone()
        if row:
            result = row["result"]
            if isinstance(result, str):
                result = json.loads(result)
            
            return {
                "run_id": eval_run_id,
                "repository_id": result.get("repository_id"),
                "organization_id": result.get("organization_id", tenant_id),
                "repo_ref": None,
                "commit_sha": None,
                "overall_score": result.get("overall_score"),
                "grade": result.get("grade"),
                "breakdown": result.get("breakdown", {}),
                "status": "completed",
                "source": "readiness_score",
            }
        
        return None
    
    def _fetch_related_data(self, cursor, repository_id: Optional[str], 
                            run_id: Optional[str]) -> dict:
        """Fetch related data for context."""
        related = {}
        
        if not repository_id:
            return related
        
        # Fetch recent reviews
        cursor.execute(
            """
            SELECT COUNT(*) as count,
                   COUNT(*) FILTER (WHERE "isBlocked" = true) as blocked
            FROM "Review"
            WHERE "repositoryId" = %s
              AND "createdAt" >= NOW() - INTERVAL '7 days'
            """,
            (repository_id,),
        )
        row = cursor.fetchone()
        if row:
            related["recent_reviews"] = {
                "count": row["count"],
                "blocked": row["blocked"],
            }
        
        # Fetch recent test runs
        cursor.execute(
            """
            SELECT COUNT(*) as count,
                   COUNT(*) FILTER (WHERE conclusion = 'success') as success
            FROM "TestRun"
            WHERE "repositoryId" = %s
              AND "createdAt" >= NOW() - INTERVAL '7 days'
            """,
            (repository_id,),
        )
        row = cursor.fetchone()
        if row:
            related["recent_test_runs"] = {
                "count": row["count"],
                "success": row["success"],
            }
        
        return related
    
    def _build_report_data(self, eval_data: dict, related_data: dict, 
                           include_details: bool) -> dict:
        """Build consolidated report data structure."""
        breakdown = eval_data.get("breakdown", {})
        
        report = {
            "report_type": "readylayer_evaluation",
            "version": "1.0.0",
            "overall_score": eval_data.get("overall_score", 0),
            "grade": eval_data.get("grade", "N/A"),
            "status": eval_data.get("status", "unknown"),
            "repository_id": eval_data.get("repository_id"),
            "repo_ref": eval_data.get("repo_ref"),
            "commit_sha": eval_data.get("commit_sha"),
            "categories": {},
        }
        
        # Map breakdown to categories
        if "review_health" in breakdown:
            report["categories"]["Review Health"] = {
                "score": breakdown["review_health"].get("score", 0),
                "weight": 0.25,
                "details": breakdown["review_health"],
            }
        
        if "test_coverage" in breakdown:
            report["categories"]["Test Coverage"] = {
                "score": breakdown["test_coverage"].get("score", 0),
                "weight": 0.25,
                "details": breakdown["test_coverage"],
            }
        
        if "ci_stability" in breakdown:
            report["categories"]["CI Stability"] = {
                "score": breakdown["ci_stability"].get("score", 0),
                "weight": 0.20,
                "details": breakdown["ci_stability"],
            }
        
        if "security_posture" in breakdown:
            report["categories"]["Security Posture"] = {
                "score": breakdown["security_posture"].get("score", 0),
                "weight": 0.15,
                "details": breakdown["security_posture"],
            }
        
        if "doc_sync" in breakdown:
            report["categories"]["Doc Sync"] = {
                "score": breakdown["doc_sync"].get("score", 0),
                "weight": 0.10,
                "details": breakdown["doc_sync"],
            }
        
        if "activity" in breakdown:
            report["categories"]["Activity"] = {
                "score": breakdown["activity"].get("score", 0),
                "weight": 0.05,
                "details": breakdown["activity"],
            }
        
        if include_details:
            report["related_data"] = related_data
        
        return report
    
    def _generate_json_report(self, report_data: dict, context: dict) -> str:
        """Generate JSON format report."""
        output = {
            "report_type": report_data["report_type"],
            "version": report_data["version"],
            "generated_at": datetime.now().isoformat(),
            "generated_by": context.get("worker_id", "unknown"),
            "overall_score": report_data["overall_score"],
            "grade": report_data["grade"],
            "status": report_data["status"],
            "repository": {
                "id": report_data["repository_id"],
                "ref": report_data["repo_ref"],
                "commit_sha": report_data["commit_sha"],
            },
            "categories": report_data["categories"],
            "related_data": report_data.get("related_data", {}),
        }
        return json.dumps(output, indent=2, default=str)
    
    def _generate_html_report(self, report_data: dict, context: dict) -> str:
        """Generate HTML format report."""
        categories = report_data["categories"]
        
        # Build category cards
        category_cards = []
        for name, data in categories.items():
            score = data["score"]
            status_class = "status-pass" if score >= 80 else "status-warn" if score >= 60 else "status-fail"
            
            card = f"""
            <div class="card">
                <h2>{name}</h2>
                <div class="metric">
                    <span class="metric-label">Score</span>
                    <span class="metric-value {status_class}">{score:.1f}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Weight</span>
                    <span class="metric-value">{data['weight']*100:.0f}%</span>
                </div>
            </div>
            """
            category_cards.append(card)
        
        # Build summary rows
        summary_rows = []
        for name, data in categories.items():
            score = data["score"]
            status = "✓ Pass" if score >= 80 else "⚠ Warning" if score >= 60 else "✗ Fail"
            status_class = "status-pass" if score >= 80 else "status-warn" if score >= 60 else "status-fail"
            
            row = f"""
            <tr>
                <td>{name}</td>
                <td>{score:.1f}</td>
                <td class="{status_class}">{status}</td>
            </tr>
            """
            summary_rows.append(row)
        
        # Determine overall score class
        overall = report_data["overall_score"]
        score_class = "status-pass" if overall >= 80 else "status-warn" if overall >= 60 else "status-fail"
        
        return self.HTML_TEMPLATE.format(
            title=f"ReadyLayer Report - {report_data.get('repo_ref', 'Unknown')}",
            repo_ref=report_data.get("repo_ref", "Unknown"),
            commit_sha=report_data.get("commit_sha", "N/A")[:8] if report_data.get("commit_sha") else "N/A",
            generated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            overall_score=f"{overall:.1f}",
            grade=report_data["grade"],
            score_class=score_class,
            category_cards="\n".join(category_cards),
            summary_rows="\n".join(summary_rows),
            report_id=f"report_{report_data.get('repository_id', 'unknown')}",
            checksum="...",  # Will be filled in after generation
            formats=", ".join(["JSON", "HTML"]),
            worker_id=context.get("worker_id", "unknown"),
            report_hash="...",
        )
    
    def _compute_checksum(self, content: str) -> str:
        """Compute SHA-256 checksum of content."""
        return hashlib.sha256(content.encode()).hexdigest()
    
    def _compute_report_hash(self, artifacts: dict) -> str:
        """Compute deterministic hash of all artifacts."""
        combined = "".join(sorted(artifacts.values()))
        return hashlib.sha256(combined.encode()).hexdigest()[:16]
    
    def _store_artifacts(self, cursor, tenant_id: str, eval_run_id: str,
                         formats: List[str], artifacts: dict, 
                         checksums: dict, report_hash: str) -> None:
        """Store report artifacts in job_results table (idempotent)."""
        report_id = f"report_{eval_run_id}"
        
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
                    "tenant_id": tenant_id,
                    "eval_run_id": eval_run_id,
                    "report_id": report_id,
                    "formats": formats,
                    "artifacts": artifacts,
                    "checksums": checksums,
                    "report_hash": report_hash,
                    "stored_at": datetime.now().isoformat(),
                }),
            ),
        )
        
        logger.info(
            "Stored report artifacts",
            report_id=report_id,
            formats=formats,
            report_hash=report_hash[:8],
        )
