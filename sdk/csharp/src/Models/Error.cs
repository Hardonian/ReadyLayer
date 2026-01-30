using System.Text.Json.Serialization;

namespace ReadyLayer.SDK.Models;

#pragma warning disable CS8618

// ==================== Error Models ====================

/// <summary>
/// Validation error details.
/// </summary>
public record ValidationErrorDetail
{
    [JsonPropertyName("path")]
    public IReadOnlyList<object>? Path { get; init; }

    [JsonPropertyName("message")]
    public string Message { get; init; }
}

/// <summary>
/// Error details from the API.
/// </summary>
public record ErrorDetails
{
    [JsonPropertyName("code")]
    public string Code { get; init; }

    [JsonPropertyName("message")]
    public string Message { get; init; }

    [JsonPropertyName("context")]
    public object? Context { get; init; }

    [JsonPropertyName("details")]
    public object? Details { get; init; }

    [JsonPropertyName("errors")]
    public IReadOnlyList<ValidationErrorDetail>? Errors { get; init; }
}

/// <summary>
/// API error response.
/// </summary>
public record ErrorResponse
{
    [JsonPropertyName("error")]
    public ErrorDetails Error { get; init; }
}
