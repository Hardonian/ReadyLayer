using System.Text.Json.Serialization;

namespace ReadyLayer.SDK.Models;

#pragma warning disable CS8618

// ==================== Common Models ====================

/// <summary>
/// Pagination information for list responses.
/// </summary>
public record Pagination
{
    /// <summary>
    /// Total number of items available.
    /// </summary>
    [JsonPropertyName("total")]
    public int Total { get; init; }

    /// <summary>
    /// Number of items returned in this response.
    /// </summary>
    [JsonPropertyName("limit")]
    public int Limit { get; init; }

    /// <summary>
    /// Number of items skipped.
    /// </summary>
    [JsonPropertyName("offset")]
    public int Offset { get; init; }

    /// <summary>
    /// Whether there are more items available.
    /// </summary>
    [JsonPropertyName("hasMore")]
    public bool HasMore { get; init; }
}

/// <summary>
/// Organization information.
/// </summary>
public record Organization
{
    [JsonPropertyName("id")]
    public string Id { get; init; }

    [JsonPropertyName("name")]
    public string Name { get; init; }

    [JsonPropertyName("slug")]
    public string Slug { get; init; }
}

/// <summary>
/// Request parameters for pagination.
/// </summary>
public class PaginationParams
{
    /// <summary>
    /// Number of results to return (default: 20, max: 100).
    /// </summary>
    public int? Limit { get; set; }

    /// <summary>
    /// Number of results to skip.
    /// </summary>
    public int? Offset { get; set; }

    internal Dictionary<string, string?> ToQueryParams()
    {
        var params_dict = new Dictionary<string, string?>();
        if (Limit.HasValue) params_dict["limit"] = Limit.Value.ToString();
        if (Offset.HasValue) params_dict["offset"] = Offset.Value.ToString();
        return params_dict;
    }
}
