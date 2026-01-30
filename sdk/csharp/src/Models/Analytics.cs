using System.Text.Json.Serialization;

namespace ReadyLayer.SDK.Models;

#pragma warning disable CS8618

// ==================== Analytics Models ====================

/// <summary>
/// A single data point for a metric.
/// </summary>
public record MetricDataPoint
{
    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; init; }

    [JsonPropertyName("value")]
    public double Value { get; init; }
}

/// <summary>
/// Metrics collection.
/// </summary>
public record MetricsCollection
{
    [JsonPropertyName("reviews")]
    public IReadOnlyList<MetricDataPoint>? Reviews { get; init; }

    [JsonPropertyName("findings")]
    public IReadOnlyList<MetricDataPoint>? Findings { get; init; }

    [JsonPropertyName("gatesPassed")]
    public IReadOnlyList<MetricDataPoint>? GatesPassed { get; init; }

    [JsonPropertyName("gatesFailed")]
    public IReadOnlyList<MetricDataPoint>? GatesFailed { get; init; }
}

/// <summary>
/// Response containing metrics data.
/// </summary>
public record MetricsResponse
{
    [JsonPropertyName("metrics")]
    public MetricsCollection Metrics { get; init; }
}

/// <summary>
/// Parameters for getting metrics.
/// </summary>
public class GetMetricsParams
{
    public string? OrganizationId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    internal Dictionary<string, string?> ToQueryParams()
    {
        var params_dict = new Dictionary<string, string?>();
        if (!string.IsNullOrWhiteSpace(OrganizationId))
            params_dict["organizationId"] = OrganizationId;
        if (StartDate.HasValue)
            params_dict["startDate"] = StartDate.Value.ToString("O");
        if (EndDate.HasValue)
            params_dict["endDate"] = EndDate.Value.ToString("O");
        return params_dict;
    }
}
