using System.Text.Json.Serialization;

namespace ReadyLayer.SDK.Models;

#pragma warning disable CS8618

// ==================== Billing Models ====================

/// <summary>
/// Billing tier levels.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum BillingTierLevel
{
    [JsonPropertyName("free")]
    Free,
    
    [JsonPropertyName("starter")]
    Starter,
    
    [JsonPropertyName("pro")]
    Pro,
    
    [JsonPropertyName("enterprise")]
    Enterprise
}

/// <summary>
/// Billing tier limits.
/// </summary>
public record BillingLimits
{
    [JsonPropertyName("repositories")]
    public int? Repositories { get; init; }

    [JsonPropertyName("reviewsPerMonth")]
    public int? ReviewsPerMonth { get; init; }

    [JsonPropertyName("teamMembers")]
    public int? TeamMembers { get; init; }
}

/// <summary>
/// Billing tier information.
/// </summary>
public record BillingTier
{
    [JsonPropertyName("tier")]
    public BillingTierLevel Tier { get; init; }

    [JsonPropertyName("name")]
    public string Name { get; init; }

    [JsonPropertyName("features")]
    public IReadOnlyList<string>? Features { get; init; }

    [JsonPropertyName("limits")]
    public BillingLimits? Limits { get; init; }
}

/// <summary>
/// Current billing usage.
/// </summary>
public record BillingUsage
{
    [JsonPropertyName("repositories")]
    public int? Repositories { get; init; }

    [JsonPropertyName("reviewsThisMonth")]
    public int? ReviewsThisMonth { get; init; }

    [JsonPropertyName("llmBudgetUsed")]
    public double? LlmBudgetUsed { get; init; }

    [JsonPropertyName("llmBudgetTotal")]
    public double? LlmBudgetTotal { get; init; }
}

/// <summary>
/// Response containing billing tier and usage information.
/// </summary>
public record BillingTierResponse
{
    [JsonPropertyName("tier")]
    public BillingTier Tier { get; init; }

    [JsonPropertyName("usage")]
    public BillingUsage Usage { get; init; }
}

/// <summary>
/// Request to create a Stripe checkout session.
/// </summary>
public record CreateCheckoutRequest
{
    [JsonPropertyName("tier")]
    public string Tier { get; init; } // starter, pro, enterprise

    [JsonPropertyName("successUrl")]
    public string SuccessUrl { get; init; }

    [JsonPropertyName("cancelUrl")]
    public string CancelUrl { get; init; }
}

/// <summary>
/// Response containing Stripe checkout session details.
/// </summary>
public record CheckoutSessionResponse
{
    [JsonPropertyName("sessionId")]
    public string SessionId { get; init; }

    [JsonPropertyName("url")]
    public string Url { get; init; }
}
