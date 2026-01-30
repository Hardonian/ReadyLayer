using System.Text.Json.Serialization;

namespace ReadyLayer.SDK.Models;

#pragma warning disable CS8618

// ==================== Run Models ====================

/// <summary>
/// Run status.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum RunStatus
{
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled
}

/// <summary>
/// Run conclusion.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum RunConclusion
{
    [JsonPropertyName("success")]
    Success,
    
    [JsonPropertyName("failure")]
    Failure,
    
    [JsonPropertyName("partial_success")]
    PartialSuccess,
    
    [JsonPropertyName("cancelled")]
    Cancelled
}

/// <summary>
/// Stage status for a run.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum StageStatus
{
    Pending,
    Running,
    Succeeded,
    Failed,
    Skipped
}

/// <summary>
/// Review guard result from a run.
/// </summary>
public record ReviewGuardResult
{
    [JsonPropertyName("reviewId")]
    public string? ReviewId { get; init; }

    [JsonPropertyName("issuesFound")]
    public int? IssuesFound { get; init; }

    [JsonPropertyName("isBlocked")]
    public bool? IsBlocked { get; init; }

    [JsonPropertyName("summary")]
    public ReviewSummary? Summary { get; init; }
}

/// <summary>
/// Test coverage metrics.
/// </summary>
public record CoverageMetrics
{
    [JsonPropertyName("lines")]
    public double? Lines { get; init; }

    [JsonPropertyName("branches")]
    public double? Branches { get; init; }

    [JsonPropertyName("functions")]
    public double? Functions { get; init; }
}

/// <summary>
/// Test engine result from a run.
/// </summary>
public record TestEngineResult
{
    [JsonPropertyName("testsGenerated")]
    public int? TestsGenerated { get; init; }

    [JsonPropertyName("coverage")]
    public CoverageMetrics? Coverage { get; init; }

    [JsonPropertyName("meetsThreshold")]
    public bool? MeetsThreshold { get; init; }
}

/// <summary>
/// Documentation sync result from a run.
/// </summary>
public record DocSyncResult
{
    [JsonPropertyName("docId")]
    public string? DocId { get; init; }

    [JsonPropertyName("driftDetected")]
    public bool? DriftDetected { get; init; }

    [JsonPropertyName("missingEndpoints")]
    public int? MissingEndpoints { get; init; }

    [JsonPropertyName("changedEndpoints")]
    public int? ChangedEndpoints { get; init; }
}

/// <summary>
/// AI-touched file detection.
/// </summary>
public record AiTouchedFile
{
    [JsonPropertyName("path")]
    public string Path { get; init; }

    [JsonPropertyName("confidence")]
    public double Confidence { get; init; }

    [JsonPropertyName("methods")]
    public IReadOnlyList<string>? Methods { get; init; }
}

/// <summary>
/// Failed gate information.
/// </summary>
public record FailedGate
{
    [JsonPropertyName("gate")]
    public string Gate { get; init; }

    [JsonPropertyName("reason")]
    public string Reason { get; init; }
}

/// <summary>
/// Test run information.
/// </summary>
public record Run
{
    [JsonPropertyName("id")]
    public string Id { get; init; }

    [JsonPropertyName("correlationId")]
    public string CorrelationId { get; init; }

    [JsonPropertyName("status")]
    public RunStatus Status { get; init; }

    [JsonPropertyName("conclusion")]
    public RunConclusion? Conclusion { get; init; }

    [JsonPropertyName("reviewGuardStatus")]
    public StageStatus ReviewGuardStatus { get; init; }

    [JsonPropertyName("testEngineStatus")]
    public StageStatus TestEngineStatus { get; init; }

    [JsonPropertyName("docSyncStatus")]
    public StageStatus DocSyncStatus { get; init; }

    [JsonPropertyName("reviewGuardResult")]
    public ReviewGuardResult? ReviewGuardResult { get; init; }

    [JsonPropertyName("testEngineResult")]
    public TestEngineResult? TestEngineResult { get; init; }

    [JsonPropertyName("docSyncResult")]
    public DocSyncResult? DocSyncResult { get; init; }

    [JsonPropertyName("aiTouchedDetected")]
    public bool? AiTouchedDetected { get; init; }

    [JsonPropertyName("aiTouchedFiles")]
    public IReadOnlyList<AiTouchedFile>? AiTouchedFiles { get; init; }

    [JsonPropertyName("gatesPassed")]
    public bool? GatesPassed { get; init; }

    [JsonPropertyName("gatesFailed")]
    public IReadOnlyList<FailedGate>? GatesFailed { get; init; }

    [JsonPropertyName("startedAt")]
    public DateTime StartedAt { get; init; }

    [JsonPropertyName("completedAt")]
    public DateTime? CompletedAt { get; init; }

    [JsonPropertyName("reviewGuardStartedAt")]
    public DateTime? ReviewGuardStartedAt { get; init; }

    [JsonPropertyName("reviewGuardCompletedAt")]
    public DateTime? ReviewGuardCompletedAt { get; init; }

    [JsonPropertyName("testEngineStartedAt")]
    public DateTime? TestEngineStartedAt { get; init; }

    [JsonPropertyName("testEngineCompletedAt")]
    public DateTime? TestEngineCompletedAt { get; init; }

    [JsonPropertyName("docSyncStartedAt")]
    public DateTime? DocSyncStartedAt { get; init; }

    [JsonPropertyName("docSyncCompletedAt")]
    public DateTime? DocSyncCompletedAt { get; init; }
}

/// <summary>
/// Trigger metadata for a run.
/// </summary>
public record TriggerMetadata
{
    [JsonPropertyName("prNumber")]
    public int? PrNumber { get; init; }

    [JsonPropertyName("prSha")]
    public string? PrSha { get; init; }

    [JsonPropertyName("prTitle")]
    public string? PrTitle { get; init; }

    [JsonPropertyName("prBody")]
    public string? PrBody { get; init; }

    [JsonPropertyName("diff")]
    public string? Diff { get; init; }

    [JsonPropertyName("files")]
    public IReadOnlyList<ReviewFile>? Files { get; init; }

    [JsonPropertyName("userId")]
    public string? UserId { get; init; }
}

/// <summary>
/// Run configuration options.
/// </summary>
public record RunConfig
{
    [JsonPropertyName("skipReviewGuard")]
    public bool? SkipReviewGuard { get; init; }

    [JsonPropertyName("skipTestEngine")]
    public bool? SkipTestEngine { get; init; }

    [JsonPropertyName("skipDocSync")]
    public bool? SkipDocSync { get; init; }
}

/// <summary>
/// Request to create a test run.
/// </summary>
public record CreateRunRequest
{
    [JsonPropertyName("repositoryId")]
    public string? RepositoryId { get; init; }

    [JsonPropertyName("sandboxId")]
    public string? SandboxId { get; init; }

    [JsonPropertyName("trigger")]
    public string Trigger { get; init; } // webhook, manual, sandbox

    [JsonPropertyName("triggerMetadata")]
    public TriggerMetadata? TriggerMetadata { get; init; }

    [JsonPropertyName("config")]
    public RunConfig? Config { get; init; }
}

/// <summary>
/// Request to create a sandbox test run.
/// </summary>
public record CreateSandboxRunRequest
{
    [JsonPropertyName("sandboxId")]
    public string SandboxId { get; init; }

    [JsonPropertyName("files")]
    public IReadOnlyList<ReviewFile> Files { get; init; }

    [JsonPropertyName("config")]
    public RunConfig? Config { get; init; }
}

/// <summary>
/// Response containing a list of runs.
/// </summary>
public record RunListResponse
{
    [JsonPropertyName("data")]
    public IReadOnlyList<Run> Data { get; init; }

    [JsonPropertyName("pagination")]
    public Pagination Pagination { get; init; }
}

/// <summary>
/// Parameters for listing runs.
/// </summary>
public class ListRunsParams : PaginationParams
{
    public string? RepositoryId { get; set; }

    internal new Dictionary<string, string?> ToQueryParams()
    {
        var params_dict = base.ToQueryParams();
        if (!string.IsNullOrWhiteSpace(RepositoryId))
            params_dict["repositoryId"] = RepositoryId;
        return params_dict;
    }
}
