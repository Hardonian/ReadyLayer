using System.Text.Json.Serialization;

namespace ReadyLayer.SDK.Models;

#pragma warning disable CS8618

// ==================== Policy Models ====================

/// <summary>
/// Policy enforcement action.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PolicyAction
{
    Block,
    Warn,
    Allow
}

/// <summary>
/// Severity level for policy rules.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum SeverityLevel
{
    Critical,
    High,
    Medium,
    Low,
    Info
}

/// <summary>
/// Policy rule definition.
/// </summary>
public record PolicyRule
{
    [JsonPropertyName("id")]
    public string Id { get; init; }

    [JsonPropertyName("ruleId")]
    public string RuleId { get; init; }

    [JsonPropertyName("enabled")]
    public bool Enabled { get; init; }

    [JsonPropertyName("severityMapping")]
    public Dictionary<string, PolicyAction> SeverityMapping { get; init; }

    [JsonPropertyName("params")]
    public object? Params { get; init; }
}

/// <summary>
/// Policy pack containing multiple rules.
/// </summary>
public record PolicyPack
{
    [JsonPropertyName("id")]
    public string Id { get; init; }

    [JsonPropertyName("organizationId")]
    public string OrganizationId { get; init; }

    [JsonPropertyName("repositoryId")]
    public string? RepositoryId { get; init; }

    [JsonPropertyName("version")]
    public string Version { get; init; }

    [JsonPropertyName("checksum")]
    public string Checksum { get; init; }

    [JsonPropertyName("rules")]
    public IReadOnlyList<PolicyRule> Rules { get; init; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; init; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; init; }
}

/// <summary>
/// Request to create a policy pack.
/// </summary>
public record CreatePolicyPackRequest
{
    [JsonPropertyName("organizationId")]
    public string OrganizationId { get; init; }

    [JsonPropertyName("repositoryId")]
    public string? RepositoryId { get; init; }

    [JsonPropertyName("version")]
    public string Version { get; init; }

    [JsonPropertyName("source")]
    public string Source { get; init; }

    [JsonPropertyName("rules")]
    public IReadOnlyList<PolicyRuleInput>? Rules { get; init; }
}

/// <summary>
/// Input for creating a policy rule.
/// </summary>
public record PolicyRuleInput
{
    [JsonPropertyName("ruleId")]
    public string RuleId { get; init; }

    [JsonPropertyName("severityMapping")]
    public Dictionary<string, PolicyAction> SeverityMapping { get; init; }

    [JsonPropertyName("enabled")]
    public bool Enabled { get; init; } = true;

    [JsonPropertyName("params")]
    public object? Params { get; init; }
}

/// <summary>
/// Request to update a policy pack.
/// </summary>
public record UpdatePolicyPackRequest
{
    [JsonPropertyName("version")]
    public string? Version { get; init; }

    [JsonPropertyName("source")]
    public string? Source { get; init; }

    [JsonPropertyName("rules")]
    public IReadOnlyList<PolicyRule>? Rules { get; init; }
}

/// <summary>
/// Response containing a list of policy packs.
/// </summary>
public record PolicyPackListResponse
{
    [JsonPropertyName("policies")]
    public IReadOnlyList<PolicyPack> Policies { get; init; }

    [JsonPropertyName("pagination")]
    public Pagination Pagination { get; init; }
}

/// <summary>
/// Request to create a policy rule.
/// </summary>
public record CreatePolicyRuleRequest
{
    [JsonPropertyName("ruleId")]
    public string RuleId { get; init; }

    [JsonPropertyName("severityMapping")]
    public Dictionary<string, PolicyAction> SeverityMapping { get; init; }

    [JsonPropertyName("enabled")]
    public bool Enabled { get; init; } = true;

    [JsonPropertyName("params")]
    public object? Params { get; init; }
}

/// <summary>
/// Request to update a policy rule.
/// </summary>
public record UpdatePolicyRuleRequest
{
    [JsonPropertyName("severityMapping")]
    public Dictionary<string, PolicyAction>? SeverityMapping { get; init; }

    [JsonPropertyName("enabled")]
    public bool? Enabled { get; init; }

    [JsonPropertyName("params")]
    public object? Params { get; init; }
}

/// <summary>
/// Response containing a list of policy rules.
/// </summary>
public record PolicyRuleListResponse
{
    [JsonPropertyName("rules")]
    public IReadOnlyList<PolicyRule> Rules { get; init; }
}

/// <summary>
/// Request to validate policy syntax.
/// </summary>
public record ValidatePolicyRequest
{
    [JsonPropertyName("source")]
    public string Source { get; init; }
}

/// <summary>
/// Validation error for a policy.
/// </summary>
public record PolicyValidationError
{
    [JsonPropertyName("ruleId")]
    public string? RuleId { get; init; }

    [JsonPropertyName("error")]
    public string Error { get; init; }
}

/// <summary>
/// Result of policy validation.
/// </summary>
public record PolicyValidationResult
{
    [JsonPropertyName("valid")]
    public bool Valid { get; init; }

    [JsonPropertyName("message")]
    public string Message { get; init; }

    [JsonPropertyName("errors")]
    public IReadOnlyList<PolicyValidationError>? Errors { get; init; }

    [JsonPropertyName("warnings")]
    public IReadOnlyList<string>? Warnings { get; init; }
}

/// <summary>
/// Policy template for quick setup.
/// </summary>
public record PolicyTemplate
{
    [JsonPropertyName("id")]
    public string Id { get; init; }

    [JsonPropertyName("name")]
    public string Name { get; init; }

    [JsonPropertyName("description")]
    public string? Description { get; init; }

    [JsonPropertyName("version")]
    public string Version { get; init; }

    [JsonPropertyName("rules")]
    public IReadOnlyList<PolicyRule> Rules { get; init; }
}

/// <summary>
/// Response containing a list of policy templates.
/// </summary>
public record PolicyTemplateListResponse
{
    [JsonPropertyName("templates")]
    public IReadOnlyList<PolicyTemplate> Templates { get; init; }
}

/// <summary>
/// Parameters for listing policy packs.
/// </summary>
public class ListPolicyPacksParams : PaginationParams
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
