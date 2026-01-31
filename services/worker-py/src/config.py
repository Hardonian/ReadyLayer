"""Configuration with strict env validation using pydantic-settings."""

from functools import lru_cache
from typing import Optional

from pydantic import Field, PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Worker configuration with validation."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Required: Database
    database_url: PostgresDsn = Field(
        ...,
        description="PostgreSQL connection string",
        validation_alias="DATABASE_URL",
    )

    # Worker identity
    worker_id: str = Field(
        default="worker-py",
        description="Unique worker identifier",
        validation_alias="WORKER_ID",
    )

    # Polling configuration
    poll_interval_seconds: int = Field(
        default=5,
        ge=1,
        le=300,
        description="Seconds between job polls",
        validation_alias="POLL_INTERVAL_SECONDS",
    )
    job_timeout_seconds: int = Field(
        default=300,
        ge=10,
        le=3600,
        description="Maximum seconds per job before timeout",
        validation_alias="JOB_TIMEOUT_SECONDS",
    )
    max_concurrent_jobs: int = Field(
        default=3,
        ge=1,
        le=50,
        description="Max jobs to process simultaneously",
        validation_alias="MAX_CONCURRENT_JOBS",
    )

    # Retry configuration
    max_retries: int = Field(
        default=3,
        ge=0,
        le=10,
        description="Max retry attempts before dead-letter",
        validation_alias="MAX_RETRIES",
    )
    retry_backoff_base: int = Field(
        default=2,
        ge=1,
        le=10,
        description="Exponential backoff base (seconds)",
        validation_alias="RETRY_BACKOFF_BASE",
    )

    # Heartbeat
    heartbeat_interval_seconds: int = Field(
        default=30,
        ge=5,
        le=300,
        description="Seconds between heartbeats for long jobs",
        validation_alias="HEARTBEAT_INTERVAL_SECONDS",
    )

    # Logging
    log_level: str = Field(
        default="INFO",
        pattern="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$",
        description="Logging level",
        validation_alias="LOG_LEVEL",
    )
    log_format: str = Field(
        default="json",
        pattern="^(json|console)$",
        description="Log output format",
        validation_alias="LOG_FORMAT",
    )

    # Health check
    health_check_port: int = Field(
        default=8080,
        ge=1024,
        le=65535,
        description="Port for health check endpoint",
        validation_alias="HEALTH_CHECK_PORT",
    )

    # Feature flags
    enable_dead_letter_queue: bool = Field(
        default=True,
        description="Move failed jobs to DLQ after max retries",
        validation_alias="ENABLE_DEAD_LETTER_QUEUE",
    )

    @field_validator("worker_id")
    @classmethod
    def validate_worker_id(cls, v: str) -> str:
        """Ensure worker_id is safe for logging."""
        # Prevent secrets from being used as worker_id
        if len(v) > 100:
            raise ValueError("WORKER_ID too long (max 100 chars)")
        if any(c in v for c in ['\n', '\r', '\t']):
            raise ValueError("WORKER_ID contains invalid characters")
        return v

    @property
    def database_url_str(self) -> str:
        """Get database URL as string."""
        return str(self.database_url)


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Convenience export
settings = get_settings()
