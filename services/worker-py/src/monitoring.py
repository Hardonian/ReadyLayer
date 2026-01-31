"""Monitoring and alerting utilities for the worker."""

import os
from typing import Any
from urllib.parse import urljoin

import httpx

from src.config import settings
from src.utils.logging import get_logger

logger = get_logger(__name__)


class AlertManager:
    """Manages alerts for worker issues."""
    
    def __init__(self):
        self.webhook_url = os.getenv("ALERT_WEBHOOK_URL")
        self.pagerduty_key = os.getenv("ALERT_PAGERDUTY_KEY")
        self.slack_webhook = os.getenv("SLACK_WEBHOOK_URL")
        self._last_alert_time: dict[str, float] = {}
        self._cooldown_seconds = 300  # 5 minutes between same alert type
    
    def _should_send(self, alert_type: str) -> bool:
        """Check if enough time has passed since last alert of this type."""
        import time
        now = time.time()
        last_sent = self._last_alert_time.get(alert_type, 0)
        if now - last_sent > self._cooldown_seconds:
            self._last_alert_time[alert_type] = now
            return True
        return False
    
    async def send_alert(self, title: str, message: str, severity: str = "warning", details: dict[str, Any] | None = None) -> None:
        """Send alert through configured channels."""
        alert_type = f"{severity}:{title}"
        
        if not self._should_send(alert_type):
            logger.debug("Alert cooldown active, skipping", alert_type=alert_type)
            return
        
        payload = {
            "worker_id": settings.worker_id,
            "severity": severity,
            "title": title,
            "message": message,
            "details": details or {},
            "timestamp": __import__('datetime').datetime.utcnow().isoformat(),
        }
        
        # Send to webhook if configured
        if self.webhook_url:
            await self._send_webhook(payload)
        
        # Send to Slack if configured
        if self.slack_webhook:
            await self._send_slack(title, message, severity, details)
        
        # Send to PagerDuty if critical and configured
        if severity == "critical" and self.pagerduty_key:
            await self._send_pagerduty(title, message, details)
        
        logger.info("Alert sent", title=title, severity=severity)
    
    async def _send_webhook(self, payload: dict[str, Any]) -> None:
        """Send to generic webhook."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(self.webhook_url, json=payload)
                response.raise_for_status()
        except Exception as e:
            logger.error("Failed to send webhook alert", error=str(e))
    
    async def _send_slack(self, title: str, message: str, severity: str, details: dict[str, Any] | None) -> None:
        """Send to Slack webhook."""
        color = {
            "info": "#36a64f",
            "warning": "#ff9900",
            "critical": "#ff0000",
        }.get(severity, "#cccccc")
        
        fields = []
        if details:
            for key, value in details.items():
                fields.append({
                    "title": key,
                    "value": str(value),
                    "short": True,
                })
        
        slack_payload = {
            "attachments": [{
                "color": color,
                "title": f"🚨 {title}",
                "text": message,
                "fields": fields,
                "footer": f"Worker: {settings.worker_id}",
                "ts": int(__import__('time').time()),
            }]
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(self.slack_webhook, json=slack_payload)
                response.raise_for_status()
        except Exception as e:
            logger.error("Failed to send Slack alert", error=str(e))
    
    async def _send_pagerduty(self, title: str, message: str, details: dict[str, Any] | None) -> None:
        """Send to PagerDuty."""
        pagerduty_payload = {
            "routing_key": self.pagerduty_key,
            "event_action": "trigger",
            "dedup_key": f"{settings.worker_id}:{title}",
            "payload": {
                "summary": f"[{settings.worker_id}] {title}: {message}",
                "severity": "critical",
                "source": settings.worker_id,
                "custom_details": details or {},
            }
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    "https://events.pagerduty.com/v2/enqueue",
                    json=pagerduty_payload
                )
                response.raise_for_status()
        except Exception as e:
            logger.error("Failed to send PagerDuty alert", error=str(e))
    
    async def alert_high_failure_rate(self, failure_rate: float, window_minutes: int) -> None:
        """Alert when job failure rate is high."""
        await self.send_alert(
            title="High Job Failure Rate",
            message=f"Failure rate is {failure_rate:.1%} over the last {window_minutes} minutes",
            severity="critical" if failure_rate > 0.5 else "warning",
            details={
                "failure_rate": f"{failure_rate:.1%}",
                "window_minutes": window_minutes,
            }
        )
    
    async def alert_stale_jobs(self, count: int) -> None:
        """Alert when jobs are stuck."""
        await self.send_alert(
            title="Stale Jobs Detected",
            message=f"{count} jobs have been running for over 10 minutes without heartbeat",
            severity="warning",
            details={"stale_job_count": count}
        )
    
    async def alert_database_error(self, error: str) -> None:
        """Alert on database connectivity issues."""
        await self.send_alert(
            title="Database Connection Error",
            message=f"Failed to connect to database: {error}",
            severity="critical",
            details={"error": error}
        )
    
    async def alert_worker_crash(self, error: str) -> None:
        """Alert when worker crashes."""
        await self.send_alert(
            title="Worker Crash",
            message=f"Worker has crashed: {error}",
            severity="critical",
            details={"error": error}
        )


# Global alert manager instance
alert_manager = AlertManager()
