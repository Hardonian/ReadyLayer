using System.Text.Json.Serialization;

namespace ReadyLayer.SDK.Models;

#pragma warning disable CS8618

// ==================== Waiver Models ====================

/// <summary>
/// Waiver information for bypassing policy rules.
/// </summary>
public record Waiver
{
    [JsonPropertyName("id")]
    public string Id { get; init; }

    [JsonPropertyName("organizationId")]
    public string OrganizationId { get; init; }

    [JsonPropertyName("repositoryId")]
    public string? RepositoryId { get; init; }

    [JsonPropertyName("ruleId")]
    public string RuleId { get; init; }

    [JsonPropertyName("reason")]
    public string Reason { get; init; }

    [JsonPropertyName("expiresAt")]
    public DateTime ExpiresAt { get; init; }

    [JsonPropertyName("createdBy")]
    public string? CreatedBy { get; init; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; init; }
}

/// <summary>
/// Request to create a new waiver.
/// </summary>
public record CreateWaiverRequest
{
    [JsonPropertyName("organizationId")]
    public string OrganizationId { get; init; }

    [JsonPropertyName("repositoryId")]
    public string? RepositoryId { get; init; }

    [JsonPropertyName("ruleId")]
    public string RuleId { get; init; }

    [JsonPropertyName("reason")]
    public string Reason { get; init; }

    [JsonPropertyName("expiresAt")]
    public DateTime ExpiresAt { get; init; }
}

/// <summary>
/// Response containing a list of waivers.
/// </summary>
public record WaiverListResponse
{
    [JsonPropertyName("waivers")]
    public IReadOnlyList<Waiver> Waivers { get; init; }

    [JsonPropertyName("pagination")]
    public Pagination Pagination { get; init; }
}

/// <summary>
/// Parameters for listing waivers.
/// </summary>
public class ListWaiversParams : PaginationParams
{
    public string? OrganizationId { get; set; }
    public string? RepositoryId { get; set; }

    internal new Dictionary<string, string?> ToQueryParams()
    {
        var params_dict = base.ToQueryParams();
        if (!string.IsNullOrWhiteSpace(OrganizationId))
            params_dict["organizationId"] = OrganizationId;
        if (!string.IsNullOrWhiteSpace(RepositoryId))
            params_dict["repositoryId"] = RepositoryId;
        return params_dict;
    }
}
