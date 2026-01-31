"""PostgreSQL database connection and Job table operations."""

import json
import signal
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool

from src.config import settings
from src.utils.logging_config import get_logger

logger = get_logger(__name__)

# Global connection pool
_pool: Optional[SimpleConnectionPool] = None

# Python-specific job types we handle
PYTHON_JOB_TYPES = [
    "python.report.generate",
    "python.batch.export",
    "python.analytics.score",
    "python.ingest.document",
    "python.reconcile.violations",
]


@dataclass
class Job:
    """Represents a Job from the database."""
    id: str
    type: str
    status: str
    payload: Dict[str, Any]
    result: Optional[Dict[str, Any]]
    error: Optional[str]
    retry_count: int
    max_retries: int
    repository_id: Optional[str]
    user_id: Optional[str]
    run_id: Optional[str]


def get_pool() -> SimpleConnectionPool:
    """Get or create the database connection pool."""
    global _pool
    if _pool is None:
        logger.info("Initializing database connection pool", pool_size=settings.pool_size)
        _pool = SimpleConnectionPool(
            minconn=1,
            maxconn=settings.pool_size,
            dsn=settings.database_url_str,
            connect_timeout=settings.pool_timeout,
        )
    return _pool


def close_pool() -> None:
    """Close all database connections."""
    global _pool
    if _pool:
        logger.info("Closing database connection pool")
        _pool.closeall()
        _pool = None


@contextmanager
def get_connection():
    """Context manager for database connections."""
    pool = get_pool()
    conn = None
    try:
        conn = pool.getconn()
        yield conn
    finally:
        if conn:
            pool.putconn(conn)


@contextmanager
def get_cursor(cursor_factory=RealDictCursor):
    """Context manager for database cursors."""
    with get_connection() as conn:
        cursor = conn.cursor(cursor_factory=cursor_factory)
        try:
            yield cursor
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()


def fetch_pending_jobs(limit: int = 10) -> List[Job]:
    """Fetch pending Python jobs from the queue.
    
    Respects tenant isolation - jobs include organizationId in payload.
    """
    query = """
        SELECT 
            id, type, status, payload, result, error,
            retry_count as "retryCount", max_retries as "maxRetries",
            repository_id as "repositoryId", user_id as "userId", run_id as "runId"
        FROM "Job"
        WHERE status = 'pending'
            AND type = ANY(%s)
            AND scheduled_at <= NOW()
        ORDER BY scheduled_at ASC
        LIMIT %s
        FOR UPDATE SKIP LOCKED
    """
    
    with get_cursor() as cursor:
        cursor.execute(query, (PYTHON_JOB_TYPES, limit))
        rows = cursor.fetchall()
    
    jobs = []
    for row in rows:
        jobs.append(Job(
            id=row["id"],
            type=row["type"],
            status=row["status"],
            payload=row["payload"] if isinstance(row["payload"], dict) else json.loads(row["payload"]),
            result=row["result"] if isinstance(row["result"], dict) else json.loads(row["result"]) if row["result"] else None,
            error=row["error"],
            retry_count=row["retryCount"],
            max_retries=row["maxRetries"],
            repository_id=row["repositoryId"],
            user_id=row["userId"],
            run_id=row["runId"],
        ))
    
    return jobs


def mark_job_processing(job_id: str) -> bool:
    """Mark a job as processing. Returns True if successful."""
    query = """
        UPDATE "Job"
        SET status = 'processing', started_at = NOW(), updated_at = NOW()
        WHERE id = %s AND status = 'pending'
        RETURNING id
    """
    
    with get_cursor() as cursor:
        cursor.execute(query, (job_id,))
        return cursor.fetchone() is not None


def mark_job_completed(job_id: str, result: Dict[str, Any], metrics: Optional[Dict[str, Any]] = None) -> None:
    """Mark a job as completed with result and metrics."""
    full_result = {
        "status": "completed",
        "output": result,
    }
    if metrics:
        full_result["metrics"] = metrics
    
    query = """
        UPDATE "Job"
        SET 
            status = 'completed',
            result = %s,
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = %s
    """
    
    with get_cursor() as cursor:
        cursor.execute(query, (json.dumps(full_result), job_id))
    
    logger.info("Job completed", job_id=job_id, result_keys=list(result.keys()))


def mark_job_failed(job_id: str, error: str, retry_count: int, max_retries: int) -> bool:
    """Mark a job as failed or retrying. Returns True if will retry."""
    if retry_count < max_retries:
        # Schedule retry with exponential backoff
        delay_seconds = 2 ** retry_count
        query = """
            UPDATE "Job"
            SET 
                status = 'retrying',
                retry_count = %s,
                error = %s,
                scheduled_at = NOW() + INTERVAL '%s seconds',
                updated_at = NOW()
            WHERE id = %s
        """
        
        with get_cursor() as cursor:
            cursor.execute(query, (retry_count, error, delay_seconds, job_id))
        
        logger.warning(
            "Job failed, will retry",
            job_id=job_id,
            retry_count=retry_count,
            max_retries=max_retries,
            delay_seconds=delay_seconds,
            error=error[:200],  # Truncate long errors
        )
        return True
    else:
        # Max retries exceeded
        query = """
            UPDATE "Job"
            SET 
                status = 'failed',
                error = %s,
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = %s
        """
        
        with get_cursor() as cursor:
            cursor.execute(query, (error, job_id))
        
        logger.error(
            "Job failed permanently after max retries",
            job_id=job_id,
            error=error[:200],
        )
        return False


def get_queue_depth() -> int:
    """Get current queue depth for monitoring."""
    query = """
        SELECT COUNT(*) as count
        FROM "Job"
        WHERE status = 'pending'
            AND type = ANY(%s)
            AND scheduled_at <= NOW()
    """
    
    with get_cursor() as cursor:
        cursor.execute(query, (PYTHON_JOB_TYPES,))
        row = cursor.fetchone()
        return row["count"] if row else 0


def get_health_status() -> Dict[str, Any]:
    """Get health status for monitoring."""
    try:
        queue_depth = get_queue_depth()
        
        # Check database connectivity
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        
        return {
            "status": "healthy",
            "queue_depth": queue_depth,
            "python_job_types": PYTHON_JOB_TYPES,
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
        }


# Signal handlers for graceful shutdown
def setup_signal_handlers():
    """Setup handlers for graceful shutdown."""
    def signal_handler(signum, frame):
        logger.info(f"Received signal {signum}, shutting down gracefully...")
        close_pool()
        exit(0)
    
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
