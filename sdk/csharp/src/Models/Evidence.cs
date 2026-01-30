using System.Text.Json.Serialization;

namespace ReadyLayer.SDK.Models;

#pragma warning disable CS8618

// ==================== Evidence Models ====================

/// <summary>
/// Evidence bundle containing review findings.
/// </summary>
public record EvidenceBundle
{
    [JsonPropertyName("id")]
    public string Id { get; init; }

    [JsonPropertyName("reviewId")]
    public string ReviewId { get; init; }

    [JsonPropertyName("findings")]
    public IReadOnlyList<Finding> Findings { get; init; }

    [JsonPropertyName("metadata")]
    public object? Metadata { get; init; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; init; }
}

/// <summary>
/// Response containing a list of evidence bundles.
/// </summary>
public record EvidenceListResponse
{
    [JsonPropertyName("bundles")]
    public IReadOnlyList<EvidenceBundle> Bundles { get; init; }

    [JsonPropertyName("pagination")]
    public Pagination Pagination { get; init; }
}

/// <summary>
/// Parameters for listing evidence bundles.
/// </summary>
public class ListEvidenceParams : PaginationParams
{
    public string? ReviewId { get; set; }

    internal new Dictionary<string, string?> ToQueryParams()
    {
        var params_dict = base.ToQueryParams();
        if (!string.IsNullOrWhiteSpace(ReviewId))
            params_dict["reviewId"] = ReviewId;
        return params_dict;
    }
}
