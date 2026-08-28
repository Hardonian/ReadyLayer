"""
Artifact ingestion system for loading and normalizing readiness.json files.
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Iterator, List, Optional, Union

from readiness_intel.models import HistoricalFinding


class ReadinessArtifactLoader:
    """Loads and parses readiness.json artifacts from various sources."""

    def __init__(self, artifacts_path: Union[str, Path]):
        self.artifacts_path = Path(artifacts_path)
        self._loaded_count = 0
        self._error_count = 0

    def load_single(self, filepath: Path) -> Optional[dict]:
        """Load a single readiness.json file."""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self._loaded_count += 1
            return data
        except (json.JSONDecodeError, IOError, UnicodeDecodeError) as e:
            self._error_count += 1
            print(f"Error loading {filepath}: {e}")
            return None

    def load_directory(
        self,
        pattern: str = "**/readiness*.json",
        recursive: bool = True
    ) -> Iterator[dict]:
        """Load all readiness artifacts matching pattern."""
        search_path = self.artifacts_path
        if recursive:
            files = search_path.rglob(pattern)
        else:
            files = search_path.glob(pattern)

        for filepath in files:
            if filepath.is_file():
                data = self.load_single(filepath)
                if data:
                    yield data

    def load_from_git_history(
        self,
        repo_path: Union[str, Path],
        since: Optional[datetime] = None,
        branch: Optional[str] = None
    ) -> Iterator[dict]:
        """Load artifacts stored in git history (e.g., in .readiness/ directory)."""
        try:
            from git import Repo
        except ImportError:
            print("GitPython not installed. Install with: pip install gitpython")
            return

        repo = Repo(repo_path)

        # Find all blobs matching readiness pattern
        for commit in repo.iter_commits(branch or "HEAD"):
            if since and commit.committed_datetime < since:
                break

            try:
                tree = commit.tree
                for blob in tree.traverse():
                    if blob.type == "blob" and "readiness" in blob.name and blob.name.endswith(".json"):
                        try:
                            content = blob.data_stream.read().decode('utf-8')
                            data = json.loads(content)
                            data["_git_metadata"] = {
                                "commit_sha": commit.hexsha,
                                "commit_date": commit.committed_datetime.isoformat(),
                                "author": commit.author.email,
                                "branch": branch or repo.active_branch.name
                            }
                            self._loaded_count += 1
                            yield data
                        except (json.JSONDecodeError, UnicodeDecodeError):
                            self._error_count += 1
                            continue
            except Exception as e:
                print(f"Error processing commit {commit.hexsha}: {e}")
                continue

    def get_stats(self) -> dict:
        """Return loading statistics."""
        return {
            "loaded": self._loaded_count,
            "errors": self._error_count,
        }


class ReadinessNormalizer:
    """Normalizes readiness artifacts into HistoricalFinding objects."""

    def normalize_artifact(
        self,
        artifact: dict,
        git_metadata: Optional[dict] = None
    ) -> List[HistoricalFinding]:
        """Convert a readiness artifact into HistoricalFinding objects."""
        findings = []

        # Extract base metadata
        commit_sha = artifact.get("commit_sha") or git_metadata.get("commit_sha") if git_metadata else None
        branch = artifact.get("branch") or git_metadata.get("branch") if git_metadata else None

        timestamp_str = artifact.get("timestamp")
        timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00")) if timestamp_str else datetime.utcnow()

        author = git_metadata.get("author") if git_metadata else None

        for finding_data in artifact.get("findings", []):
            finding = HistoricalFinding(
                rule_id=finding_data.get("rule_id", "unknown"),
                category=finding_data.get("category", "unknown"),
                severity=finding_data.get("severity", "MEDIUM"),
                location=finding_data.get("location", ""),
                line=finding_data.get("line"),
                tool=finding_data.get("tool", "unknown"),
                timestamp=timestamp,
                commit_sha=commit_sha,
                branch=branch,
                author=author,
            )
            findings.append(finding)

        return findings

    def normalize_batch(
        self,
        artifacts: List[dict]
    ) -> List[HistoricalFinding]:
        """Normalize a batch of artifacts."""
        all_findings = []
        for artifact in artifacts:
            git_metadata = artifact.pop("_git_metadata", None)
            findings = self.normalize_artifact(artifact, git_metadata)
            all_findings.extend(findings)
        return all_findings


class ArtifactIngestionPipeline:
    """Complete ingestion pipeline from raw artifacts to normalized findings."""

    def __init__(
        self,
        artifacts_path: Union[str, Path],
        repo_path: Optional[Union[str, Path]] = None
    ):
        self.loader = ReadinessArtifactLoader(artifacts_path)
        self.normalizer = ReadinessNormalizer()
        self.repo_path = Path(repo_path) if repo_path else None

    def ingest_from_directory(
        self,
        pattern: str = "**/readiness*.json"
    ) -> List[HistoricalFinding]:
        """Ingest all artifacts from directory."""
        artifacts = list(self.loader.load_directory(pattern))
        return self.normalizer.normalize_batch(artifacts)

    def ingest_from_git_history(
        self,
        since_days: int = 30
    ) -> List[HistoricalFinding]:
        """Ingest artifacts from git history."""
        if not self.repo_path:
            raise ValueError("repo_path required for git history ingestion")

        since = datetime.utcnow() - __import__('datetime').timedelta(days=since_days)
        artifacts = list(self.loader.load_from_git_history(self.repo_path, since=since))
        return self.normalizer.normalize_batch(artifacts)

    def get_stats(self) -> dict:
        """Return ingestion statistics."""
        return self.loader.get_stats()
