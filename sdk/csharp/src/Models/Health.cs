using System.Text.Json.Serialization;

namespace ReadyLayer.SDK.Models;

#pragma warning disable CS8618

// ==================== Health Models ====================

/// <summary>
/// Service health status.
/// </summary>
public enum HealthStatus
{
    [JsonPropertyName("healthy")]
    Healthy,
    
    [JsonPropertyName("unhealthy")]
    Unhealthy
}

/// <summary>
/// Response from health check endpoint.
/// </summary>
public record HealthResponse
{
    [JsonPropertyName("status")]
    public HealthStatus Status { get; init; }

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; init; }

    [JsonPropertyName("version")]
    public string? Version { get; init; }
}

/// <summary>
/// Service dependency status.
/// </summary>
public record Dependencies
{
    [JsonPropertyName("database")]
    public bool Database { get; init; }

    [JsonPropertyName("redis")]
    public bool Redis { get; init; }

    [JsonPropertyName("stripe")]
    public bool Stripe { get; init; }
}

/// <summary>
/// Response from readiness check endpoint.
/// </summary>
public record ReadyResponse
{
    [JsonPropertyName("ready")]
    public bool Ready { get; init; }

    [JsonPropertyName("dependencies")]
    public Dependencies Dependencies { get; init; }
}
