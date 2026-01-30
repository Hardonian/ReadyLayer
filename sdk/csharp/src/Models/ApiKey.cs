using System.Text.Json.Serialization;

namespace ReadyLayer.SDK.Models;

#pragma warning disable CS8618

// ==================== API Key Models ====================

/// <summary>
/// API key scope.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ApiKeyScope
{
    Read,
    Write,
    Admin
}

/// <summary>
/// API key information.
/// </summary>
public record ApiKey
{
    [JsonPropertyName("id")]
    public string Id { get; init; }

    [JsonPropertyName("name")]
    public string Name { get; init; }

    [JsonPropertyName("keyPreview")]
    public string? KeyPreview { get; init; }

    [JsonPropertyName("scopes")]
    public IReadOnlyList<ApiKeyScope> Scopes { get; init; }

    [JsonPropertyName("expiresAt")]
    public DateTime? ExpiresAt { get; init; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; init; }

    [JsonPropertyName("lastUsedAt")]
    public DateTime? LastUsedAt { get; init; }
}

/// <summary>
/// Request to create a new API key.
/// </summary>
public record CreateApiKeyRequest
{
    [JsonPropertyName("name")]
    public string Name { get; init; }

    [JsonPropertyName("scopes")]
    public IReadOnlyList<ApiKeyScope> Scopes { get; init; }

    [JsonPropertyName("expiresAt")]
    public DateTime? ExpiresAt { get; init; }
}

/// <summary>
/// Response containing a list of API keys.
/// </summary>
public record ApiKeyListResponse
{
    [JsonPropertyName("keys")]
    public IReadOnlyList<ApiKey> Keys { get; init; }
}
