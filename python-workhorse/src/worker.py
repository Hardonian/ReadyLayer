"""Main worker polling loop and job execution."""

import concurrent.futures
import signal
import time
import traceback
from typing import Optional

from src.config import settings
from src.database import (
    Job,
    close_pool,
    fetch_pending_jobs,
    get_queue_depth,
    mark_job_completed,
    mark_job_failed,
    mark_job_processing,
    setup_signal_handlers,
)
from src.handlers import get_handler
from src.utils.logging_config import get_logger

logger = get_logger(__name__)

# Global flag for graceful shutdown
_shutdown_requested = False


def execute_job(job: Job) -> None:
    """Execute a single job with timeout and error handling."""
    start_time = time.time()
    metrics = {"startedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    
    try:
        # Mark as processing
        if not mark_job_processing(job.id):
            logger.warning("Job no longer pending, skipping", job_id=job.id)
            return
        
        logger.info("Processing job",
                   job_id=job.id,
                   job_type=job.type,
                   organization_id=job.payload.get("organizationId"))
        
        # Get handler and execute
        handler = get_handler(job.type)
        
        # Execute with timeout
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(handler.handle, job.payload)
            try:
                result = future.result(timeout=settings.job_timeout_seconds)
            except concurrent.futures.TimeoutError:
                raise TimeoutError(f"Job exceeded timeout of {settings.job_timeout_seconds}s")
        
        # Calculate metrics
        duration_ms = int((time.time() - start_time) * 1000)
        metrics.update({
            "durationMs": duration_ms,
            "completedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        })
        
        # Mark completed
        mark_job_completed(job.id, result, metrics)
        
        logger.info("Job completed successfully",
                   job_id=job.id,
                   duration_ms=duration_ms)
        
    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        error_message = f"{type(e).__name__}: {str(e)}"
        
        logger.error("Job failed",
                    job_id=job.id,
                    error=error_message,
                    duration_ms=duration_ms,
                    traceback=traceback.format_exc())
        
        # Mark failed (will retry if under max_retries)
        will_retry = mark_job_failed(job.id, error_message, job.retry_count + 1, job.max_retries)
        
        if not will_retry:
            logger.error("Job failed permanently after max retries", job_id=job.id)


def run_worker_iteration() -> None:
    """Run one iteration of the worker loop."""
    try:
        # Fetch pending jobs
        jobs = fetch_pending_jobs(limit=settings.max_concurrent_jobs)
        
        if not jobs:
            return
        
        logger.info(f"Fetched {len(jobs)} jobs to process")
        
        # Process jobs concurrently up to max_concurrent_jobs
        with concurrent.futures.ThreadPoolExecutor(
            max_workers=settings.max_concurrent_jobs
        ) as executor:
            futures = {executor.submit(execute_job, job): job for job in jobs}
            
            for future in concurrent.futures.as_completed(futures):
                job = futures[future]
                try:
                    future.result()
                except Exception as e:
                    logger.error("Unexpected error in job execution",
                               job_id=job.id,
                               error=str(e))
    
    except Exception as e:
        logger.error("Error in worker iteration", error=str(e), traceback=traceback.format_exc())


def run_worker() -> None:
    """Main worker loop."""
    global _shutdown_requested
    
    logger.info("Starting Python workhorse worker",
               poll_interval=settings.poll_interval_seconds,
               max_concurrent=settings.max_concurrent_jobs,
               job_timeout=settings.job_timeout_seconds)
    
    # Setup signal handlers for graceful shutdown
    setup_signal_handlers()
    
    try:
        while not _shutdown_requested:
            run_worker_iteration()
            
            # Sleep before next poll
            time.sleep(settings.poll_interval_seconds)
    
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt, shutting down...")
    finally:
        logger.info("Worker shutting down, closing connections...")
        close_pool()
        logger.info("Worker shutdown complete")


def shutdown_handler(signum, frame) -> None:
    """Handle shutdown signals."""
    global _shutdown_requested
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    _shutdown_requested = True


# Register signal handlers
signal.signal(signal.SIGTERM, shutdown_handler)
signal.signal(signal.SIGINT, shutdown_handler)


if __name__ == "__main__":
    run_worker()
