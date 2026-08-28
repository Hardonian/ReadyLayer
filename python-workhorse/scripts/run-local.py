"""Development runner with verbose logging."""

import sys
import argparse

# Add src to path
sys.path.insert(0, "src")

from src.worker import run_worker
from src.utils.logging_config import get_logger

logger = get_logger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Run Python workhorse worker locally")
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose (DEBUG) logging"
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run one iteration and exit (for testing)"
    )

    args = parser.parse_args()

    if args.verbose:
        import logging
        logging.getLogger().setLevel(logging.DEBUG)
        logger.info("Verbose logging enabled")

    if args.once:
        logger.info("Running single iteration...")
        from src.worker import run_worker_iteration
        from src.database import close_pool
        try:
            run_worker_iteration()
        finally:
            close_pool()
    else:
        logger.info("Starting worker (press Ctrl+C to stop)...")
        run_worker()


if __name__ == "__main__":
    main()
