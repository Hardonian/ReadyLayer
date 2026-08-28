"""Ingest normalization handler - CSV/JSON data normalization stub."""

from src.handlers.base import BaseHandler, JobResult, register_handler
from src.utils.logging import get_logger

logger = get_logger(__name__)


@register_handler
class IngestNormalizeHandler(BaseHandler):
    """Handler for ingest.normalize job type.

    Normalizes CSV/JSON data into standard format.
    Safe no-op unless input data exists.
    """

    job_type = "ingest.normalize"

    def validate_payload(self, payload: dict) -> dict:
        """Validate ingest.normalize payload.

        Expected payload:
            - source: str - Data source identifier
            - format: str - 'csv' or 'json'
            - data_url: str (optional) - URL to fetch data from
            - data_content: str (optional) - Inline data content
            - schema: dict (optional) - Target schema definition
        """
        required = ["source", "format"]
        for field in required:
            if field not in payload:
                raise ValueError(f"Missing required field: {field}")

        if payload["format"] not in ["csv", "json"]:
            raise ValueError(f"Invalid format: {payload['format']}. Must be 'csv' or 'json'")

        # Ensure at least one data source is provided
        if not payload.get("data_url") and not payload.get("data_content"):
            raise ValueError("Must provide either data_url or data_content")

        return payload

    def execute(self, payload: dict, context: dict) -> JobResult:
        """Execute data normalization.

        Args:
            payload: Validated payload
            context: Execution context with worker_id

        Returns:
            JobResult with normalized data or error
        """
        source = payload["source"]
        format_type = payload["format"]
        data_url = payload.get("data_url")
        data_content = payload.get("data_content")

        logger.info(
            "Starting data normalization",
            source=source,
            format=format_type,
            has_data_url=bool(data_url),
            has_data_content=bool(data_content),
        )

        # Safe no-op: Check if we actually have data to process
        if not data_url and not data_content:
            logger.info("No data provided, returning empty result")
            return JobResult(
                success=True,
                data={
                    "source": source,
                    "format": format_type,
                    "normalized_rows": 0,
                    "status": "no_data",
                    "message": "No data provided to normalize",
                }
            )

        # Stub: Simulate normalization
        # In production, this would:
        # 1. Fetch data from URL or parse content
        # 2. Parse CSV/JSON
        # 3. Apply schema transformations
        # 4. Write to target tables

        normalized_count = 0
        if data_content:
            # Stub: Count lines/records as proxy for work done
            normalized_count = len(data_content.split("\n")) if format_type == "csv" else 1

        result_data = {
            "source": source,
            "format": format_type,
            "normalized_rows": normalized_count,
            "status": "normalized",
            "worker_id": context.get("worker_id"),
        }

        logger.info(
            "Data normalization complete",
            source=source,
            normalized_rows=normalized_count,
        )

        return JobResult(
            success=True,
            data=result_data,
            artifacts={
                "schema_applied": payload.get("schema", {}),
            }
        )
