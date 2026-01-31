#!/usr/bin/env python3
"""Smoke test for integration verification."""

import sys
import uuid
import time

# Add src to path
sys.path.insert(0, "src")

from src.config import settings
from src.database import (
    get_pool,
    close_pool,
    fetch_pending_jobs,
    get_queue_depth,
    mark_job_completed,
)
from src.utils.logging_config import get_logger

logger = get_logger(__name__)


def test_database_connection():
    """Test database connectivity."""
    logger.info("Testing database connection...")
    try:
        pool = get_pool()
        logger.info("✓ Database pool initialized")
        return True
    except Exception as e:
        logger.error(f"✗ Database connection failed: {e}")
        return False


def test_queue_operations():
    """Test basic queue operations."""
    logger.info("Testing queue operations...")
    
    try:
        # Check queue depth
        depth = get_queue_depth()
        logger.info(f"✓ Queue depth: {depth}")
        
        # Fetch jobs (may be empty)
        jobs = fetch_pending_jobs(limit=1)
        logger.info(f"✓ Fetched {len(jobs)} pending jobs")
        
        return True
    except Exception as e:
        logger.error(f"✗ Queue operations failed: {e}")
        return False


def test_config():
    """Test configuration loading."""
    logger.info("Testing configuration...")
    
    try:
        logger.info(f"✓ Log level: {settings.log_level}")
        logger.info(f"✓ Poll interval: {settings.poll_interval_seconds}s")
        logger.info(f"✓ Max concurrent: {settings.max_concurrent_jobs}")
        logger.info(f"✓ Job timeout: {settings.job_timeout_seconds}s")
        logger.info(f"✓ Pool size: {settings.pool_size}")
        return True
    except Exception as e:
        logger.error(f"✗ Configuration error: {e}")
        return False


def main():
    """Run all smoke tests."""
    logger.info("=" * 50)
    logger.info("Python Workhorse Smoke Test")
    logger.info("=" * 50)
    
    results = []
    
    try:
        # Test 1: Configuration
        results.append(("Configuration", test_config()))
        
        # Test 2: Database
        results.append(("Database Connection", test_database_connection()))
        
        # Test 3: Queue
        results.append(("Queue Operations", test_queue_operations()))
        
    finally:
        close_pool()
    
    # Summary
    logger.info("=" * 50)
    logger.info("Test Summary")
    logger.info("=" * 50)
    
    all_passed = True
    for name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        logger.info(f"{status}: {name}")
        if not passed:
            all_passed = False
    
    if all_passed:
        logger.info("All tests passed!")
        sys.exit(0)
    else:
        logger.error("Some tests failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
