"""Main worker with polling loop, heartbeats, and graceful shutdown."""

import asyncio
import signal
import time
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from src.config import settings
from src.database import (
    Job,
    claim_jobs,
    close_pool,
    mark_job_completed,
    mark_job_failed,
    reset_stale_jobs,
    update_heartbeat,
)
from src.handlers import get_handler, list_registered_handlers
from src.health_server import start_health_server, update_worker_state
from src.utils.logging import configure_logging, get_logger, set_correlation_id

# Configure logging first
configure_logging()
logger = get_logger(__name__)

# Global shutdown flag
_shutdown_requested = False

# Job counters for metrics
_jobs_processed = 0
_jobs_failed = 0


@dataclass
class JobContext:
    """Context passed to job handlers."""
    worker_id: str
    started_at: datetime
    heartbeat_interval: int


class HeartbeatManager:
    """Manages heartbeats for long-running jobs."""

    def __init__(self, job_id: str, interval_seconds: int):
        self.job_id = job_id
        self.interval = interval_seconds
        self._stop = False
        self._task: Optional[asyncio.Task] = None

    async def _heartbeat_loop(self) -> None:
        """Send periodic heartbeats."""
        while not self._stop:
            try:
                update_heartbeat(self.job_id, {"last_beat": datetime.utcnow().isoformat()})
                logger.debug("Heartbeat sent", job_id=self.job_id)
            except Exception as e:
                logger.error("Failed to send heartbeat", job_id=self.job_id, error=str(e))

            # Sleep with early exit check
            for _ in range(self.interval):
                if self._stop:
                    break
                await asyncio.sleep(1)

    def start(self) -> None:
        """Start heartbeat in background."""
        # Note: In production, use asyncio.create_task in async context
        # For sync worker, we'll do manual heartbeats
        pass

    def stop(self) -> None:
        """Stop heartbeat."""
        self._stop = True


def execute_job(job: Job, context: JobContext) -> None:
    """Execute a single job with full lifecycle management.

    Args:
        job: Job to execute
        context: Execution context
    """
    global _jobs_processed, _jobs_failed
    start_time = time.time()

    logger.info(
        "Job execution started",
        job_id=job.id,
        job_type=job.type,
        attempt=job.retry_count + 1,
        max_retries=job.max_retries,
    )

    # Set correlation ID for logging
    if job.correlation_id:
        set_correlation_id(job.correlation_id)

    try:
        # Get handler
        handler = get_handler(job.type)
        if not handler:
            raise ValueError(f"No handler registered for job type: {job.type}")

        # Execute handler
        handler_context = {
            "worker_id": context.worker_id,
            "started_at": context.started_at.isoformat(),
        }

        result = handler.handle(job, handler_context)

        # Calculate metrics
        duration_ms = int((time.time() - start_time) * 1000)
        metrics = {
            "duration_ms": duration_ms,
            "completed_at": datetime.utcnow().isoformat(),
        }

        if result.success:
            # Mark completed
            mark_job_completed(
                job.id,
                result.to_dict(),
                metrics,
            )

            # Update metrics
            _jobs_processed += 1
            update_worker_state(
                jobs_processed=_jobs_processed,
                last_job_completed=datetime.utcnow().isoformat()
            )

            logger.info(
                "Job completed successfully",
                job_id=job.id,
                duration_ms=duration_ms,
            )
        else:
            # Mark failed (will retry if under max)
            will_retry = mark_job_failed(
                job.id,
                result.error or "Handler returned failure",
                job.retry_count + 1,
                job.max_retries,
            )

            # Update failure metrics
            _jobs_failed += 1
            update_worker_state(jobs_failed=_jobs_failed)

            if not will_retry:
                logger.error(
                    "Job failed permanently after max retries",
                    job_id=job.id,
                    total_attempts=job.retry_count + 1,
                )

    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        error_msg = f"{type(e).__name__}: {str(e)}"

        logger.error(
            "Job execution failed with exception",
            job_id=job.id,
            error=error_msg,
            duration_ms=duration_ms,
            traceback=traceback.format_exc(),
        )

        # Update failure metrics
        _jobs_failed += 1
        update_worker_state(jobs_failed=_jobs_failed)

        # Mark failed (will retry if under max)
        try:
            will_retry = mark_job_failed(
                job.id,
                error_msg,
                job.retry_count + 1,
                job.max_retries,
            )

            if not will_retry:
                logger.error(
                    "Job failed permanently",
                    job_id=job.id,
                    total_attempts=job.retry_count + 1,
                )
        except Exception as mark_error:
            logger.critical(
                "Failed to mark job as failed",
                job_id=job.id,
                error=str(mark_error),
            )

    finally:
        set_correlation_id(None)


def poll_and_execute(context: JobContext) -> int:
    """Poll for jobs and execute them.

    Args:
        context: Execution context

    Returns:
        Number of jobs processed
    """
    try:
        # Claim jobs
        jobs = claim_jobs(context.worker_id, settings.max_concurrent_jobs)

        if not jobs:
            return 0

        logger.info(
            "Claimed jobs for processing",
            count=len(jobs),
            job_ids=[j.id for j in jobs],
        )

        # Process jobs concurrently
        with ThreadPoolExecutor(max_workers=settings.max_concurrent_jobs) as executor:
            futures = {
                executor.submit(execute_job, job, context): job
                for job in jobs
            }

            for future in as_completed(futures):
                job = futures[future]
                try:
                    future.result()
                except Exception as e:
                    logger.error(
                        "Unexpected error in job execution",
                        job_id=job.id,
                        error=str(e),
                    )

        return len(jobs)

    except Exception as e:
        logger.error(
            "Error in poll and execute cycle",
            error=str(e),
            traceback=traceback.format_exc(),
        )
        return 0


def run_worker() -> None:
    """Main worker loop with graceful shutdown."""
    global _shutdown_requested

    # Setup context
    context = JobContext(
        worker_id=settings.worker_id,
        started_at=datetime.utcnow(),
        heartbeat_interval=settings.heartbeat_interval_seconds,
    )

    # Start health server
    health_port = getattr(settings, 'health_check_port', 8080)
    health_server = start_health_server(port=health_port)
    update_worker_state(status="starting")

    logger.info(
        "Worker starting",
        worker_id=context.worker_id,
        registered_handlers=list_registered_handlers(),
        poll_interval=settings.poll_interval_seconds,
        max_concurrent=settings.max_concurrent_jobs,
        job_timeout=settings.job_timeout_seconds,
        max_retries=settings.max_retries,
        health_port=health_port,
    )

    # Reset any stale jobs from crashed workers
    try:
        reset_count = reset_stale_jobs(context.worker_id, timeout_minutes=10)
        if reset_count > 0:
            logger.info("Reset stale jobs", count=reset_count)
    except Exception as e:
        logger.warning("Failed to reset stale jobs", error=str(e))

    # Update state to running
    update_worker_state(status="running")

    # Main loop
    try:
        while not _shutdown_requested:
            # Process jobs
            processed = poll_and_execute(context)

            if processed == 0:
                # No jobs, sleep before next poll
                time.sleep(settings.poll_interval_seconds)

            # Brief yield to allow signal handling
            time.sleep(0.1)

    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    except Exception as e:
        logger.error(
            "Fatal error in worker loop",
            error=str(e),
            traceback=traceback.format_exc(),
        )
        raise
    finally:
        logger.info("Worker shutting down...")
        update_worker_state(status="shutting_down")
        health_server.stop()
        close_pool()
        logger.info("Worker shutdown complete")


def signal_handler(signum: int, frame) -> None:
    """Handle shutdown signals."""
    global _shutdown_requested
    logger.info(
        "Received shutdown signal",
        signal=signum,
    )
    _shutdown_requested = True


# Register signal handlers
signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)


if __name__ == "__main__":
    run_worker()
