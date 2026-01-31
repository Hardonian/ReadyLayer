#!/usr/bin/env python3
"""
Health check server for worker-py
Provides HTTP endpoint for load balancers and monitoring
"""

import http.server
import json
import socketserver
import threading
from datetime import datetime
from typing import Any

from src.config import settings
from src.database import get_pool_status
from src.utils.logging import get_logger

logger = get_logger(__name__)

# Global state (updated by worker)
_worker_state: dict[str, Any] = {
    "status": "starting",
    "started_at": datetime.utcnow().isoformat(),
    "jobs_processed": 0,
    "jobs_failed": 0,
    "last_heartbeat": None,
}


def update_worker_state(**kwargs: Any) -> None:
    """Update worker state from main worker thread."""
    _worker_state.update(kwargs)
    _worker_state["last_heartbeat"] = datetime.utcnow().isoformat()


class HealthHandler(http.server.BaseHTTPRequestHandler):
    """HTTP request handler for health checks."""

    def log_message(self, format: str, *args: Any) -> None:
        # Suppress health check logging to reduce noise
        pass

    def do_GET(self) -> None:
        """Handle GET requests."""
        if self.path == "/health":
            self._send_health_response()
        elif self.path == "/metrics":
            self._send_metrics_response()
        elif self.path == "/ready":
            self._send_ready_response()
        else:
            self._send_error(404, "Not found")

    def _send_health_response(self) -> None:
        """Send health status."""
        try:
            # Check database connectivity
            pool_status = get_pool_status()
            db_healthy = pool_status.get("healthy", False)

            is_healthy = (
                _worker_state["status"] == "running"
                and db_healthy
            )

            status_code = 200 if is_healthy else 503
            response = {
                "status": "healthy" if is_healthy else "unhealthy",
                "worker_id": settings.worker_id,
                "worker_status": _worker_state["status"],
                "database": "connected" if db_healthy else "disconnected",
                "timestamp": datetime.utcnow().isoformat(),
                "uptime_seconds": self._get_uptime_seconds(),
            }

            self._send_json_response(status_code, response)

        except Exception as e:
            logger.error("Health check failed", error=str(e))
            self._send_json_response(503, {
                "status": "unhealthy",
                "error": str(e),
            })

    def _send_ready_response(self) -> None:
        """Send readiness status (for Kubernetes)."""
        is_ready = _worker_state["status"] in ["running", "starting"]
        status_code = 200 if is_ready else 503

        self._send_json_response(status_code, {
            "ready": is_ready,
            "status": _worker_state["status"],
        })

    def _send_metrics_response(self) -> None:
        """Send Prometheus-style metrics."""
        metrics = f"""# HELP worker_jobs_processed_total Total jobs processed
# TYPE worker_jobs_processed_total counter
worker_jobs_processed_total{{worker_id="{settings.worker_id}"}} {_worker_state["jobs_processed"]}

# HELP worker_jobs_failed_total Total jobs failed
# TYPE worker_jobs_failed_total counter
worker_jobs_failed_total{{worker_id="{settings.worker_id}"}} {_worker_state["jobs_failed"]}

# HELP worker_status Worker status (1=running, 0=stopped)
# TYPE worker_status gauge
worker_status{{worker_id="{settings.worker_id}"}} {1 if _worker_state["status"] == "running" else 0}

# HELP worker_uptime_seconds Worker uptime in seconds
# TYPE worker_uptime_seconds gauge
worker_uptime_seconds{{worker_id="{settings.worker_id}"}} {self._get_uptime_seconds()}
"""
        self._send_text_response(200, metrics, "text/plain")

    def _get_uptime_seconds(self) -> float:
        """Calculate uptime in seconds."""
        started = datetime.fromisoformat(_worker_state["started_at"])
        return (datetime.utcnow() - started).total_seconds()

    def _send_json_response(self, status_code: int, data: dict) -> None:
        """Send JSON response."""
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _send_text_response(self, status_code: int, text: str, content_type: str = "text/plain") -> None:
        """Send text response."""
        self.send_response(status_code)
        self.send_header("Content-Type", content_type)
        self.end_headers()
        self.wfile.write(text.encode())

    def _send_error(self, status_code: int, message: str) -> None:
        """Send error response."""
        self._send_json_response(status_code, {"error": message})


class HealthServer:
    """HTTP health check server."""

    def __init__(self, port: int = 8080):
        self.port = port
        self.server: socketserver.TCPServer | None = None
        self.thread: threading.Thread | None = None

    def start(self) -> None:
        """Start health server in background thread."""
        try:
            socketserver.TCPServer.allow_reuse_address = True
            self.server = socketserver.TCPServer(("", self.port), HealthHandler)
            self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
            self.thread.start()
            logger.info("Health server started", port=self.port)
        except Exception as e:
            logger.error("Failed to start health server", error=str(e))

    def stop(self) -> None:
        """Stop health server."""
        if self.server:
            self.server.shutdown()
            self.server.server_close()
            logger.info("Health server stopped")


def start_health_server(port: int = 8080) -> HealthServer:
    """Start and return health server instance."""
    server = HealthServer(port)
    server.start()
    return server
