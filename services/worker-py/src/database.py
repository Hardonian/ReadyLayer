"""Database operations for job queue."""

import json
import time
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Optional, List
from datetime import datetime

import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor

from src.config import settings
from src.utils.logging import get_logger, set_correlation_id

logger = get_logger(__name__)

# Connection pool
_connection_pool: Optional[pool.ThreadedConnectionPool] = None


@dataclass
class Job:
    """Job model."""
    id: str
    type: str
    payload: dict
    status: str
    retry_count: int
    max_retries: int
    created_at: datetime
    updated_at: datetime
    correlation_id: Optional[str] = None


def get_pool() -> pool.ThreadedConnectionPool:
    """Get or create connection pool."""
    global _connection_pool
    if _connection_pool is None:
        _connection_pool = pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=settings.max_concurrent_jobs + 2,
            dsn=settings.database_url_str,
        )
    return _connection_pool


def get_pool_status() -> dict:
    """Get connection pool status for health checks."""
    global _connection_pool
    if _connection_pool is None:
        return {"healthy": False, "status": "not_initialized"}
    
    try:
        # Try to get a connection to verify health
        conn = _connection_pool.getconn()
        _connection_pool.putconn(conn)
        return {
            "healthy": True,
            "status": "connected"
        }
    except Exception as e:
        logger.warning("Pool health check failed", error=str(e))
        return {
            "healthy": False,
            "status": "error",
            "error": str(e)
        }


def close_pool() -> None:
    """Close connection pool."""
    global _connection_pool
    if _connection_pool:
        _connection_pool.closeall()
        _connection_pool = None
        logger.info("Database pool closed")


@contextmanager
def get_connection():
    """Get a database connection from the pool."""
    conn = None
    try:
        conn = get_pool().getconn()
        yield conn
    finally:
        if conn:
            get_pool().putconn(conn)


@contextmanager
def get_cursor():
    """Get a database cursor."""
    with get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            yield cursor
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()


def claim_jobs(worker_id: str, limit: int = 3) -> List[Job]:
    """Claim pending jobs for processing.
    
    Uses atomic update to prevent race conditions.
    
    Args:
        worker_id: Unique worker identifier
        limit: Maximum jobs to claim
    
    Returns:
        List of claimed jobs
    """
    with get_cursor() as cursor:
        # Claim jobs atomically
        cursor.execute(
            """
            UPDATE jobs
            SET status = 'processing',
                worker_id = %s,
                started_at = NOW(),
                updated_at = NOW(),
                claimed_at = NOW()
            WHERE id IN (
                SELECT id FROM jobs
                WHERE status = 'pending'
                  AND (scheduled_at IS NULL OR scheduled_at <= NOW())
                  AND retry_count <= max_retries
                ORDER BY priority DESC, created_at ASC
                FOR UPDATE SKIP LOCKED
                LIMIT %s
            )
            RETURNING 
                id, type, payload, status, retry_count, max_retries,
                created_at, updated_at, correlation_id
            """,
            (worker_id, limit),
        )
        
        rows = cursor.fetchall()
        jobs = []
        for row in rows:
            job = Job(
                id=str(row["id"]),
                type=row["type"],
                payload=row["payload"] if isinstance(row["payload"], dict) else json.loads(row["payload"]),
                status=row["status"],
                retry_count=row["retry_count"],
                max_retries=row["max_retries"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                correlation_id=row.get("correlation_id"),
            )
            jobs.append(job)
        
        if jobs:
            logger.info(
                "Claimed jobs",
                count=len(jobs),
                job_ids=[j.id for j in jobs]
            )
        
        return jobs


def mark_job_completed(
    job_id: str,
    result: dict,
    metrics: Optional[dict] = None,
) -> None:
    """Mark job as completed successfully.
    
    Args:
        job_id: Job ID
        result: Job result (JSON-serializable)
        metrics: Optional metrics dict
    """
    with get_cursor() as cursor:
        cursor.execute(
            """
            UPDATE jobs
            SET status = 'completed',
                result = %s,
                metrics = %s,
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = %s
            """,
            (json.dumps(result), json.dumps(metrics) if metrics else None, job_id),
        )
        
        # Also insert into job_results table
        cursor.execute(
            """
            INSERT INTO job_results (job_id, result, created_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (job_id) DO UPDATE
            SET result = EXCLUDED.result,
                created_at = EXCLUDED.created_at
            """,
            (job_id, json.dumps(result)),
        )
        
        logger.info("Job marked completed", job_id=job_id)


def mark_job_failed(
    job_id: str,
    error: str,
    retry_count: int,
    max_retries: int,
) -> bool:
    """Mark job as failed, with retry or DLQ logic.
    
    Args:
        job_id: Job ID
        error: Error message
        retry_count: Current retry count
        max_retries: Maximum allowed retries
    
    Returns:
        True if job will be retried, False if moved to DLQ
    """
    will_retry = retry_count < max_retries
    
    with get_cursor() as cursor:
        if will_retry:
            # Schedule for retry with exponential backoff
            delay_seconds = min(
                settings.retry_backoff_base ** retry_count,
                300  # Max 5 minutes
            )
            
            cursor.execute(
                """
                UPDATE jobs
                SET status = 'pending',
                    retry_count = %s,
                    error_message = %s,
                    scheduled_at = NOW() + INTERVAL '%s seconds',
                    updated_at = NOW()
                WHERE id = %s
                """,
                (retry_count, error[:500], delay_seconds, job_id),
            )
            
            logger.info(
                "Job scheduled for retry",
                job_id=job_id,
                attempt=retry_count,
                max_retries=max_retries,
                delay_seconds=delay_seconds,
            )
        else:
            # Move to permanent failure
            cursor.execute(
                """
                UPDATE jobs
                SET status = 'failed',
                    error_message = %s,
                    failed_at = NOW(),
                    updated_at = NOW()
                WHERE id = %s
                """,
                (error[:500], job_id),
            )
            
            # Move to DLQ if enabled
            if settings.enable_dead_letter_queue:
                cursor.execute(
                    """
                    INSERT INTO dead_letter_jobs (
                        job_id, type, payload, error_message,
                        retry_count, max_retries, failed_at
                    )
                    SELECT 
                        id, type, payload, %s,
                        retry_count, max_retries, NOW()
                    FROM jobs WHERE id = %s
                    ON CONFLICT (job_id) DO NOTHING
                    """,
                    (error[:500], job_id),
                )
            
            logger.error(
                "Job failed permanently",
                job_id=job_id,
                total_attempts=retry_count,
            )
    
    return will_retry


def update_heartbeat(job_id: str, progress: Optional[dict] = None) -> None:
    """Update job heartbeat for long-running jobs.
    
    Args:
        job_id: Job ID
        progress: Optional progress information
    """
    with get_cursor() as cursor:
        cursor.execute(
            """
            UPDATE jobs
            SET heartbeat_at = NOW(),
                progress = %s,
                updated_at = NOW()
            WHERE id = %s
            """,
            (json.dumps(progress) if progress else None, job_id),
        )


def reset_stale_jobs(worker_id: str, timeout_minutes: int = 10) -> int:
    """Reset jobs that appear stuck (no heartbeat).
    
    Args:
        worker_id: This worker's ID (only reset jobs from crashed workers)
        timeout_minutes: Minutes since last heartbeat
    
    Returns:
        Number of jobs reset
    """
    with get_cursor() as cursor:
        cursor.execute(
            """
            UPDATE jobs
            SET status = 'pending',
                worker_id = NULL,
                scheduled_at = NOW(),
                updated_at = NOW()
            WHERE status = 'processing'
              AND worker_id != %s
              AND (heartbeat_at IS NULL OR heartbeat_at < NOW() - INTERVAL '%s minutes')
            RETURNING id
            """,
            (worker_id, timeout_minutes),
        )
        
        rows = cursor.fetchall()
        count = len(rows)
        
        if count > 0:
            logger.warning(
                "Reset stale jobs",
                count=count,
                job_ids=[str(r["id"]) for r in rows],
            )
        
        return count
