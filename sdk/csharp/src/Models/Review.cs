using System.Text.Json.Serialization;

namespace ReadyLayer.SDK.Models;

#pragma warning disable CS8618

// ==================== Review Models ====================

/// <summary>
/// Review status.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ReviewStatus
{
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled
}

/// <summary>
/// Review finding status.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum FindingStatus
{
    Open,
    Acknowledged,
    Resolved,
    Ignored
}

/// <summary>
/// Detection method for a finding.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum DetectedBy
{
    Ai,
    Human,
    Policy
}

/// <summary>
/// Summary of review findings by severity.
/// </summary>
public record ReviewSummary
{
    [JsonPropertyName("total")]
    public int Total { get; init; }

    [JsonPropertyName("critical")]
    public int Critical { get; init; }

    [JsonPropertyName("high")]
    public int High { get; init; }

    [JsonPropertyName("medium")]
    public int Medium { get; init; }

    [JsonPropertyName("low")]
    public int Low { get; init; }
}

/// <summary>
/// A finding from a code review.
/// </summary>
public record Finding
{
    [JsonPropertyName("id")]
    public string Id { get; init; }

    [JsonPropertyName("ruleId")]
    public string RuleId { get; init; }

    [JsonPropertyName("title")]
    public string Title { get; init; }

    [JsonPropertyName("description")]
    public string Description { get; init; }

    [JsonPropertyName("severity")]
    public SeverityLevel Severity { get; init; }

    [JsonPropertyName("status")]
    public FindingStatus Status { get; init; }

    [JsonPropertyName("file")]
    public string? File { get; init; }

    [JsonPropertyName("line")]
    public int? Line { get; init; }

    [JsonPropertyName("confidence")]
    public double? Confidence { get; init; }

    [JsonPropertyName("detectedBy")]
    public DetectedBy DetectedBy { get; init; }

    [JsonPropertyName("remediation")]
    public string? Remediation { get; init; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; init; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; init; }

    [JsonPropertyName("modelId")]
    public string? ModelId { get; init; }

    [JsonPropertyName("modelEpoch")]
    public string? ModelEpoch { get; init; }

    [JsonPropertyName("variance_score")]
    public double? VarianceScore { get; init; }

    [JsonPropertyName("metadata")]
    public object? Metadata { get; init; }
}

/// <summary>
/// Simplified repository information in review context.
/// </summary>
public record ReviewRepositoryInfo
{
    [JsonPropertyName("id")]
    public string Id { get; init; }

    [JsonPropertyName("name")]
    public string Name { get; init; }

    [JsonPropertyName("fullName")]
    public string FullName { get; init; }

    [JsonPropertyName("organizationId")]
    public string OrganizationId { get; init; }
}

/// <summary>
/// Code review information.
/// </summary>
public record Review
{
    [JsonPropertyName("id")]
    public string Id { get; init; }

    [JsonPropertyName("repositoryId")]
    public string RepositoryId { get; init; }

    [JsonPropertyName("prNumber")]
    public int PrNumber { get; init; }

    [JsonPropertyName("prSha")]
    public string PrSha { get; init; }

    [JsonPropertyName("prTitle")]
    public string? PrTitle { get; init; }

    [JsonPropertyName("status")]
    public ReviewStatus Status { get; init; }

    [JsonPropertyName("isBlocked")]
    public bool IsBlocked { get; init; }

    [JsonPropertyName("blockedReason")]
    public string? BlockedReason { get; init; }

    [JsonPropertyName("result")]
    public object? Result { get; init; }

    [JsonPropertyName("issuesFound")]
    public int? IssuesFound { get; init; }

    [JsonPropertyName("summary")]
    public ReviewSummary Summary { get; init; }

    [JsonPropertyName("startedAt")]
    public DateTime? StartedAt { get; init; }

    [JsonPropertyName("completedAt")]
    public DateTime? CompletedAt { get; init; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; init; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; init; }

    [JsonPropertyName("repository")]
    public ReviewRepositoryInfo? Repository { get; init; }
}

/// <summary>
/// File content for review.
/// </summary>
public record ReviewFile
{
    [JsonPropertyName("path")]
    public string Path { get; init; }

    [JsonPropertyName("content")]
    public string Content { get; init; }

    [JsonPropertyName("beforeContent")]
    public string? BeforeContent { get; init; }
}

/// <summary>
/// Review configuration options.
/// </summary>
public record ReviewConfig
{
    [JsonPropertyName("failOnCritical")]
    public bool? FailOnCritical { get; init; }

    [JsonPropertyName("failOnHigh")]
    public bool? FailOnHigh { get; init; }

    [JsonPropertyName("failOnMedium")]
    public bool? FailOnMedium { get; init; }

    [JsonPropertyName("failOnLow")]
    public bool? FailOnLow { get; init; }

    [JsonPropertyName("enabledRules")]
    public IReadOnlyList<string>? EnabledRules { get; init; }

    [JsonPropertyName("disabledRules")]
    public IReadOnlyList<string>? DisabledRules { get; init; }

    [JsonPropertyName("excludedPaths")]
    public IReadOnlyList<string>? ExcludedPaths { get; init; }
}

/// <summary>
/// Request to create a new review.
/// </summary>
public record CreateReviewRequest
{
    [JsonPropertyName("repositoryId")]
    public string RepositoryId { get; init; }

    [JsonPropertyName("prNumber")]
    public object PrNumber { get; init; } // Can be int or string

    [JsonPropertyName("prSha")]
    public string PrSha { get; init; }

    [JsonPropertyName("prTitle")]
    public string? PrTitle { get; init; }

    [JsonPropertyName("diff")]
    public string? Diff { get; init; }

    [JsonPropertyName("files")]
    public IReadOnlyList<ReviewFile> Files { get; init; }

    [JsonPropertyName("config")]
    public ReviewConfig? Config { get; init; }
}

/// <summary>
/// Response containing a list of reviews.
/// </summary>
public record ReviewListResponse
{
    [JsonPropertyName("data")]
    public IReadOnlyList<Review> Data { get; init; }

    [JsonPropertyName("pagination")]
    public Pagination Pagination { get; init; }
}

/// <summary>
/// Parameters for listing reviews.
/// </summary>
public class ListReviewsParams : PaginationParams
{
    public string? RepositoryId { get; set; }
    public int? PrNumber { get; set; }
    public string? Fields { get; set; }

    internal new Dictionary<string, string?> ToQueryParams()
    {
        var params_dict = base.ToQueryParams();
        if (!string.IsNullOrWhiteSpace(RepositoryId))
            params_dict["repositoryId"] = RepositoryId;
        if (PrNumber.HasValue)
            params_dict["prNumber"] = PrNumber.Value.ToString();
        if (!string.IsNullOrWhiteSpace(Fields))
            params_dict["select"] = Fields;
        return params_dict;
    }
}
