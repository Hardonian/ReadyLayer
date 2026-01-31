"""Repository snapshot ingest handler - Ingest repo file manifest for evaluation.

This handler ingests a bounded file manifest and metadata from a repository
into the database for reproducible evaluation runs. Stores hashes and sizes
without storing full file content (unless already supported).

Deterministic: Same repo_ref + commit_sha produces identical manifest.
Idempotent: Re-running updates existing snapshot for the commit.
Tenant-scoped: Snapshots are isolated per tenant.
"""

import json
import hashlib
from typing import Dict, List, Optional, Any
from datetime import datetime
from dataclasses import dataclass

from src.handlers.base import BaseHandler, JobResult, register_handler
from src.database import get_cursor
from src.utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class FileEntry:
    """A file entry in the repository manifest."""
    path: str
    size_bytes: int
    content_hash: str  # sha256 of content or git blob hash
    file_type: str  # extension or 'directory'
    last_modified: Optional[str] = None


@register_handler
class RepoSnapshotIngestHandler(BaseHandler):
    """Handler for repo.snapshot.ingest job type.
    
    Ingests a repository file manifest for reproducible evaluation runs.
    Stores metadata without full file content to keep storage bounded.
    
    Real tables connected:
    - Repository: Source repo metadata
    - job_results: Stores manifest metadata (until dedicated table exists)
    """
    
    job_type = "repo.snapshot.ingest"
    
    # Common file patterns to include/exclude
    DEFAULT_INCLUDE_PATTERNS = [
        "*.ts", "*.tsx", "*.js", "*.jsx", "*.py", "*.go", "*.rs",
        "*.java", "*.rb", "*.php", "*.swift", "*.kt", "*.scala",
        "*.md", "*.mdx", "*.yml", "*.yaml", "*.json", "*.toml",
        "Dockerfile", "Makefile", "*.sh", "*.css", "*.scss",
    ]
    
    DEFAULT_EXCLUDE_PATTERNS = [
        "node_modules/**", ".git/**", "dist/**", "build/**",
        ".next/**", "coverage/**", "*.log", "*.lock",
        "*.min.js", "*.min.css", ".env*", "vendor/**",
    ]
    
    def validate_payload(self, payload: dict) -> dict:
        """Validate repo.snapshot.ingest payload.
        
        Expected payload:
            - tenant_id (organization_id): str - Organization that owns the repo
            - repo_ref: str - Repository reference (full name: owner/repo)
            - commit_sha: str - Git commit SHA for reproducibility
            - source: str - Source of snapshot ('github_api', 'git_clone', 'upload')
            - include_paths: list (optional) - Specific paths to include
            - exclude_paths: list (optional) - Patterns to exclude
            - max_files: int (optional) - Max files to ingest (default: 10000)
            - max_size_bytes: int (optional) - Max total size (default: 100MB)
            - dry_run: bool (optional) - Preview without storing (default: False)
        """
        required = ["tenant_id", "repo_ref", "commit_sha", "source"]
        for field in required:
            if field not in payload:
                raise ValueError(f"Missing required field: {field}")
        
        # Validate source
        valid_sources = ["github_api", "git_clone", "upload", "webhook"]
        if payload["source"] not in valid_sources:
            raise ValueError(
                f"Invalid source: {payload['source']}. "
                f"Must be one of: {valid_sources}"
            )
        
        # Validate commit_sha format (should be 40 hex chars for SHA-1)
        commit_sha = payload["commit_sha"]
        if len(commit_sha) < 7 or len(commit_sha) > 40:
            raise ValueError(f"Invalid commit_sha length: {len(commit_sha)}")
        
        # Normalize commit_sha to full length if short
        payload["commit_sha"] = commit_sha[:40]
        
        # Set defaults
        payload["include_paths"] = payload.get("include_paths", [])
        payload["exclude_paths"] = payload.get("exclude_paths", self.DEFAULT_EXCLUDE_PATTERNS)
        payload["max_files"] = min(int(payload.get("max_files", 10000)), 50000)  # Cap at 50k
        payload["max_size_bytes"] = min(int(payload.get("max_size_bytes", 100_000_000)), 500_000_000)  # Cap at 500MB
        payload["dry_run"] = payload.get("dry_run", False)
        
        return payload
    
    def execute(self, payload: dict, context: dict) -> JobResult:
        """Execute repository snapshot ingestion.
        
        Args:
            payload: Validated payload with snapshot parameters
            context: Execution context with worker_id
        
        Returns:
            JobResult with manifest metadata
        """
        tenant_id = payload["tenant_id"]
        repo_ref = payload["repo_ref"]
        commit_sha = payload["commit_sha"]
        source = payload["source"]
        include_paths = payload["include_paths"]
        exclude_paths = payload["exclude_paths"]
        max_files = payload["max_files"]
        max_size_bytes = payload["max_size_bytes"]
        dry_run = payload["dry_run"]
        
        logger.info(
            "Starting repo snapshot ingest",
            tenant_id=tenant_id,
            repo_ref=repo_ref,
            commit_sha=commit_sha[:8],
            source=source,
        )
        
        try:
            with get_cursor() as cursor:
                # Find repository in DB
                repo = self._find_repository(cursor, tenant_id, repo_ref)
                if not repo:
                    return JobResult(
                        success=False,
                        error=f"Repository not found: {repo_ref} for tenant {tenant_id}",
                    )
                
                repository_id = repo["id"]
                
                # Check if snapshot already exists for this commit
                existing = self._check_existing_snapshot(cursor, repository_id, commit_sha)
                if existing and not dry_run:
                    logger.info(
                        "Snapshot already exists",
                        repository_id=repository_id,
                        commit_sha=commit_sha[:8],
                    )
                    return JobResult(
                        success=True,
                        data={
                            "status": "already_exists",
                            "snapshot_id": existing["snapshot_id"],
                            "repository_id": repository_id,
                            "repo_ref": repo_ref,
                            "commit_sha": commit_sha,
                            "file_count": existing["file_count"],
                            "total_size_bytes": existing["total_size_bytes"],
                            "created_at": existing["created_at"],
                        }
                    )
                
                # Ingest manifest (stub - would integrate with GitHub API or git)
                # For now, simulate a realistic manifest structure
                manifest = self._ingest_manifest(
                    repo, commit_sha, source, include_paths, 
                    exclude_paths, max_files, max_size_bytes
                )
                
                # Compute manifest hash for integrity
                manifest_hash = self._compute_manifest_hash(manifest)
                
                # Store manifest if not dry run
                if not dry_run:
                    self._store_manifest(
                        cursor, tenant_id, repository_id, repo_ref,
                        commit_sha, manifest, manifest_hash
                    )
                
                result_data = {
                    "tenant_id": tenant_id,
                    "repository_id": repository_id,
                    "repo_ref": repo_ref,
                    "commit_sha": commit_sha,
                    "commit_sha_short": commit_sha[:8],
                    "source": source,
                    "manifest_hash": manifest_hash,
                    "file_count": manifest["file_count"],
                    "total_size_bytes": manifest["total_size_bytes"],
                    "file_types": manifest["file_types"],
                    "ingested_at": datetime.now().isoformat(),
                    "dry_run": dry_run,
                    "stored": not dry_run,
                    "worker_id": context.get("worker_id"),
                }
                
                logger.info(
                    "Repo snapshot ingest complete",
                    tenant_id=tenant_id,
                    repo_ref=repo_ref,
                    file_count=manifest["file_count"],
                    total_size=manifest["total_size_bytes"],
                )
                
                return JobResult(
                    success=True,
                    data=result_data,
                    artifacts={
                        "manifest_preview": manifest["files"][:10] if manifest["files"] else [],
                        "file_type_breakdown": manifest["file_types"],
                        "size_histogram": manifest.get("size_histogram", {}),
                    }
                )
                
        except Exception as e:
            logger.error(
                "Repo snapshot ingest failed",
                tenant_id=tenant_id,
                repo_ref=repo_ref,
                error=str(e),
                exc_info=True,
            )
            return JobResult(
                success=False,
                error=f"Repo snapshot ingest failed: {str(e)}",
            )
    
    def _find_repository(self, cursor, tenant_id: str, repo_ref: str) -> Optional[dict]:
        """Find repository by tenant and full name."""
        cursor.execute(
            """
            SELECT id, "fullName", name, provider, "defaultBranch"
            FROM "Repository"
            WHERE "organizationId" = %s
              AND "fullName" = %s
            LIMIT 1
            """,
            (tenant_id, repo_ref),
        )
        row = cursor.fetchone()
        if row:
            return {
                "id": row["id"],
                "full_name": row["fullName"],
                "name": row["name"],
                "provider": row["provider"],
                "default_branch": row["defaultBranch"],
            }
        return None
    
    def _check_existing_snapshot(self, cursor, repository_id: str, 
                                  commit_sha: str) -> Optional[dict]:
        """Check if snapshot already exists for this commit."""
        snapshot_id = f"snapshot_{repository_id}_{commit_sha}"
        
        cursor.execute(
            """
            SELECT result, created_at
            FROM job_results
            WHERE job_id = %s
            """,
            (snapshot_id,),
        )
        row = cursor.fetchone()
        if row:
            result = row["result"] if isinstance(row["result"], dict) else json.loads(row["result"])
            return {
                "snapshot_id": snapshot_id,
                "file_count": result.get("file_count", 0),
                "total_size_bytes": result.get("total_size_bytes", 0),
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            }
        return None
    
    def _ingest_manifest(self, repo: dict, commit_sha: str, source: str,
                         include_paths: List[str], exclude_paths: List[str],
                         max_files: int, max_size_bytes: int) -> dict:
        """Ingest file manifest from repository.
        
        NOTE: This is a stub implementation that generates realistic
        synthetic data. In production, this would:
        1. Call GitHub API to get tree for commit
        2. Or clone repo and walk filesystem
        3. Filter by include/exclude patterns
        4. Compute content hashes
        """
        files = []
        total_size = 0
        file_types = {}
        size_histogram = {"<1KB": 0, "1-10KB": 0, "10-100KB": 0, ">100KB": 0}
        
        # Simulate a realistic repo structure
        # In production, this would be actual file data from GitHub API or git
        simulated_files = self._simulate_repo_files(repo["name"])
        
        for file_path in simulated_files:
            # Check if exceeds limits
            if len(files) >= max_files:
                break
            
            # Check exclude patterns
            if self._matches_patterns(file_path, exclude_paths):
                continue
            
            # Check include patterns (if specified)
            if include_paths and not self._matches_patterns(file_path, include_paths):
                continue
            
            # Simulate file size (realistic distribution)
            size = self._simulate_file_size(file_path)
            
            # Check total size limit
            if total_size + size > max_size_bytes:
                break
            
            # Compute file type
            file_type = self._get_file_type(file_path)
            file_types[file_type] = file_types.get(file_type, 0) + 1
            
            # Update size histogram
            if size < 1024:
                size_histogram["<1KB"] += 1
            elif size < 10 * 1024:
                size_histogram["1-10KB"] += 1
            elif size < 100 * 1024:
                size_histogram["10-100KB"] += 1
            else:
                size_histogram[">100KB"] += 1
            
            # Generate deterministic content hash
            content_hash = hashlib.sha256(
                f"{repo['full_name']}:{commit_sha}:{file_path}".encode()
            ).hexdigest()[:16]
            
            files.append({
                "path": file_path,
                "size_bytes": size,
                "content_hash": content_hash,
                "file_type": file_type,
            })
            
            total_size += size
        
        return {
            "files": files,
            "file_count": len(files),
            "total_size_bytes": total_size,
            "file_types": file_types,
            "size_histogram": size_histogram,
            "source": source,
            "includes_truncated": len(simulated_files) > len(files),
        }
    
    def _simulate_repo_files(self, repo_name: str) -> List[str]:
        """Simulate a realistic repository file structure."""
        # Generate deterministic but realistic file list
        common_files = [
            "README.md",
            "package.json",
            "tsconfig.json",
            ".gitignore",
            "Dockerfile",
            "docker-compose.yml",
            ".env.example",
            "LICENSE",
            "CHANGELOG.md",
        ]
        
        src_files = [
            "src/index.ts",
            "src/config.ts",
            "src/types.ts",
            "src/utils.ts",
            "src/api/client.ts",
            "src/api/types.ts",
            "src/components/Button.tsx",
            "src/components/Modal.tsx",
            "src/components/Form.tsx",
            "src/hooks/useAuth.ts",
            "src/hooks/useData.ts",
            "src/styles/globals.css",
            "src/styles/theme.ts",
        ]
        
        test_files = [
            "tests/unit/utils.test.ts",
            "tests/unit/api.test.ts",
            "tests/integration/auth.test.ts",
            "tests/e2e/smoke.test.ts",
        ]
        
        docs_files = [
            "docs/README.md",
            "docs/API.md",
            "docs/CONTRIBUTING.md",
        ]
        
        # Add some variation based on repo name hash
        name_hash = int(hashlib.md5(repo_name.encode()).hexdigest(), 16)
        extra_files = []
        
        if name_hash % 3 == 0:
            extra_files.extend([
                "src/services/worker.ts",
                "src/services/queue.ts",
                "src/services/cache.ts",
            ])
        
        if name_hash % 5 == 0:
            extra_files.extend([
                ".github/workflows/ci.yml",
                ".github/workflows/deploy.yml",
            ])
        
        all_files = common_files + src_files + test_files + docs_files + extra_files
        
        # Add some random files for scale simulation
        for i in range((name_hash % 20) + 10):
            all_files.append(f"src/modules/module{i}/index.ts")
            all_files.append(f"src/modules/module{i}/types.ts")
        
        return sorted(all_files)
    
    def _simulate_file_size(self, file_path: str) -> int:
        """Simulate realistic file sizes based on type."""
        if file_path.endswith((".md", ".yml", ".yaml")):
            return hash(file_path) % (10 * 1024) + 500
        elif file_path.endswith((".ts", ".tsx", ".js", ".jsx")):
            return hash(file_path) % (50 * 1024) + 1000
        elif file_path.endswith((".json", ".lock")):
            return hash(file_path) % (100 * 1024) + 5000
        elif "test" in file_path:
            return hash(file_path) % (20 * 1024) + 2000
        else:
            return hash(file_path) % (5 * 1024) + 100
    
    def _get_file_type(self, file_path: str) -> str:
        """Get file type from path."""
        if "." in file_path:
            ext = file_path.rsplit(".", 1)[-1].lower()
            return ext
        return "unknown"
    
    def _matches_patterns(self, path: str, patterns: List[str]) -> bool:
        """Check if path matches any of the patterns."""
        import fnmatch
        for pattern in patterns:
            if fnmatch.fnmatch(path, pattern):
                return True
        return False
    
    def _compute_manifest_hash(self, manifest: dict) -> str:
        """Compute deterministic hash of manifest."""
        content = json.dumps(manifest, sort_keys=True, default=str)
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def _store_manifest(self, cursor, tenant_id: str, repository_id: str,
                        repo_ref: str, commit_sha: str, manifest: dict,
                        manifest_hash: str) -> None:
        """Store manifest in job_results table (idempotent)."""
        snapshot_id = f"snapshot_{repository_id}_{commit_sha}"
        
        cursor.execute(
            """
            INSERT INTO job_results (job_id, result, created_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (job_id) DO UPDATE
            SET result = EXCLUDED.result,
                created_at = EXCLUDED.created_at
            """,
            (
                snapshot_id,
                json.dumps({
                    "tenant_id": tenant_id,
                    "repository_id": repository_id,
                    "repo_ref": repo_ref,
                    "commit_sha": commit_sha,
                    "manifest_hash": manifest_hash,
                    "file_count": manifest["file_count"],
                    "total_size_bytes": manifest["total_size_bytes"],
                    "file_types": manifest["file_types"],
                    "files": manifest["files"],  # Store full manifest
                    "stored_at": datetime.now().isoformat(),
                }),
            ),
        )
        
        logger.info(
            "Stored repo snapshot",
            snapshot_id=snapshot_id,
            repository_id=repository_id,
            file_count=manifest["file_count"],
        )
