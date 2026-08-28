#!/usr/bin/env python3
"""Health check script for monitoring."""

import sys
import json

# Add src to path
sys.path.insert(0, "src")

from src.database import get_health_status
from src.config import settings


def main():
    """Run health check and exit with appropriate code."""
    try:
        status = get_health_status()

        # Print status as JSON
        print(json.dumps(status, indent=2))

        # Exit 0 if healthy, 1 if unhealthy
        if status.get("status") == "healthy":
            sys.exit(0)
        else:
            sys.exit(1)

    except Exception as e:
        print(json.dumps({
            "status": "unhealthy",
            "error": str(e),
        }, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()
