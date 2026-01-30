using System.Text.Json.Serialization;

namespace ReadyLayer.SDK.Models;

#pragma warning disable CS8618

// ==================== Repository Models ====================

/// <summary>
/// Source control provider.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum RepositoryProvider
{
    GitHub,
    GitLab,
    Bitbucket
}

/// <summary>
/// Repository information.
/// </summary>
public record Repository
{
    [JsonPropertyName("id")]
    public string Id { get; init; }

    [JsonPropertyName("name")]
    public string Name { get; init; }

    [JsonPropertyName("fullName")]
    public string FullName { get; init; }

    [JsonPropertyName("provider")]
    public RepositoryProvider Provider { get; init; }

    [JsonPropertyName("url")]
    public string? Url { get; init; }

    [JsonPropertyName("enabled")]
    public bool Enabled { get; init; }

    [JsonPropertyName("organization")]
    public Organization? Organization { get; init; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; init; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; init; }
}

/// <summary>
/// Request to create a new repository.
/// </summary>
public record CreateRepositoryRequest
{
    [JsonPropertyName("organizationId")]
    public string OrganizationId { get; init; }

    [JsonPropertyName("name")]
    public string Name { get; init; }

    [JsonPropertyName("fullName")]
    public string FullName { get; init; }

    [JsonPropertyName("provider")]
    public RepositoryProvider Provider { get; init; }

    [JsonPropertyName("providerId")]
    public string? ProviderId { get; init; }

    [JsonPropertyName("url")]
    public string? Url { get; init; }

    [JsonPropertyName("defaultBranch")]
    public string? DefaultBranch { get; init; }
}

/// <summary>
/// Request to update a repository.
/// </summary>
public record UpdateRepositoryRequest
{
    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("enabled")]
    public bool? Enabled { get; init; }

    [JsonPropertyName("defaultBranch")]
    public string? DefaultBranch { get; init; }
}

/// <summary>
/// Response containing a list of repositories.
/// </summary>
public record RepositoryListResponse
{
    [JsonPropertyName("repositories")]
    public IReadOnlyList<Repository> Repositories { get; init; }

    [JsonPropertyName("pagination")]
    public Pagination Pagination { get; init; }
}

/// <summary>
/// Response from repository connection test.
/// </summary>
public record TestConnectionResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; init; }

    [JsonPropertyName("message")]
    public string Message { get; init; }

    [JsonPropertyName("details")]
    public object? Details { get; init; }
}

/// <summary>
/// Parameters for listing repositories.
/// </summary>
public class ListRepositoriesParams : PaginationParams
{
    /// <summary>
    /// Filter by organization ID.
    /// </summary>
    public string? OrganizationId { get; set; }

    internal new Dictionary<string, string?> ToQueryParams()
    {
        var params_dict = base.ToQueryParams();
        if (!string.IsNullOrWhiteSpace(OrganizationId))
            params_dict["organizationId"] = OrganizationId;
        return params_dict;
    }
}
