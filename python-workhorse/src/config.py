"""Typed environment configuration with Pydantic Settings."""

from functools import lru_cache
from typing import Optional

from pydantic import Field, PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with validation."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # Allow extra env vars without error
    )

    # Required settings
    database_url: PostgresDsn = Field(
        ...,
        description="PostgreSQL connection string",
        validation_alias="DATABASE_URL",
    )
    supabase_url: str = Field(
        ...,
        description="Supabase project URL",
        validation_alias="SUPABASE_URL",
    )
    supabase_service_key: str = Field(
        ...,
        description="Supabase service role key",
        validation_alias="SUPABASE_SERVICE_KEY",
    )

    # Worker tuning (optional)
    poll_interval_seconds: int = Field(
        default=5,
        ge=1,
        le=60,
        description="Seconds between job polls",
        validation_alias="POLL_INTERVAL_SECONDS",
    )
    job_timeout_seconds: int = Field(
        default=300,
        ge=30,
        le=3600,
        description="Maximum seconds per job",
        validation_alias="JOB_TIMEOUT_SECONDS",
    )
    max_concurrent_jobs: int = Field(
        default=3,
        ge=1,
        le=20,
        description="Max jobs to process simultaneously",
        validation_alias="MAX_CONCURRENT_JOBS",
    )
    pool_size: int = Field(
        default=5,
        ge=1,
        le=50,
        description="DB connection pool size",
        validation_alias="POOL_SIZE",
    )
    pool_timeout: int = Field(
        default=30,
        ge=5,
        le=300,
        description="Seconds to wait for DB connection",
        validation_alias="POOL_TIMEOUT",
    )

    # Logging (optional)
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

    # Health check (optional)
    health_check_port: int = Field(
        default=8080,
        ge=1024,
        le=65535,
        description="Port for health check endpoint",
        validation_alias="HEALTH_CHECK_PORT",
    )
    health_check_host: str = Field(
        default="0.0.0.0",
        description="Host for health check endpoint",
        validation_alias="HEALTH_CHECK_HOST",
    )

    # Feature flags (optional)
    enable_metrics: bool = Field(
        default=True,
        description="Enable job metrics collection",
        validation_alias="ENABLE_METRICS",
    )
    enable_dead_letter_queue: bool = Field(
        default=True,
        description="Move failed jobs to DLQ after max retries",
        validation_alias="ENABLE_DEAD_LETTER_QUEUE",
    )

    @field_validator("supabase_url")
    @classmethod
    def validate_supabase_url(cls, v: str) -> str:
        """Ensure Supabase URL is valid."""
        if not v.startswith("https://"):
            raise ValueError("SUPABASE_URL must start with https://")
        if not v.endswith(".supabase.co"):
            raise ValueError("SUPABASE_URL must be a supabase.co domain")
        return v

    @field_validator("supabase_service_key")
    @classmethod
    def validate_service_key(cls, v: str) -> str:
        """Basic validation for JWT format."""
        if not v.startswith("eyJ"):
            raise ValueError("SUPABASE_SERVICE_KEY appears invalid (must start with eyJ)")
        if len(v) < 100:
            raise ValueError("SUPABASE_SERVICE_KEY appears too short")
        return v

    @property
    def database_url_str(self) -> str:
        """Get database URL as string for psycopg2."""
        return str(self.database_url)


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance.

    Uses lru_cache to avoid re-parsing env vars on every call.
    """
    return Settings()


# Convenience export
settings = get_settings()
