using ReadyLayer.SDK.Models;

namespace ReadyLayer.SDK.Services;

/// <summary>
/// Service for test run operations.
/// </summary>
public class RunService
{
    private readonly ReadyLayerClient _client;

    internal RunService(ReadyLayerClient client)
    {
        _client = client;
    }

    /// <summary>
    /// Lists all test runs.
    /// </summary>
    /// <param name="params">Optional filtering and pagination parameters.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of runs with pagination information.</returns>
    public async Task<RunListResponse> ListAsync(
        ListRunsParams? @params = null,
        CancellationToken cancellationToken = default)
    {
        @params ??= new ListRunsParams();
        return await _client.GetAsync<RunListResponse>(
            "runs",
            @params.ToQueryParams(),
            cancellationToken);
    }

    /// <summary>
    /// Gets a specific test run by ID.
    /// </summary>
    /// <param name="runId">The run ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The run details.</returns>
    public async Task<Run> GetAsync(
        string runId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(runId))
            throw new ArgumentException("Run ID is required", nameof(runId));

        return await _client.GetAsync<Run>(
            $"runs/{Uri.EscapeDataString(runId)}",
            cancellationToken: cancellationToken);
    }

    /// <summary>
    /// Creates a new test run.
    /// </summary>
    /// <param name="request">The run creation request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The created run.</returns>
    public async Task<Run> CreateAsync(
        CreateRunRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request == null)
            throw new ArgumentNullException(nameof(request));

        return await _client.PostAsync<CreateRunRequest, Run>(
            "runs",
            request,
            cancellationToken);
    }

    /// <summary>
    /// Creates a new sandbox test run.
    /// </summary>
    /// <param name="request">The sandbox run creation request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The created run.</returns>
    public async Task<Run> CreateSandboxAsync(
        CreateSandboxRunRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request == null)
            throw new ArgumentNullException(nameof(request));

        return await _client.PostAsync<CreateSandboxRunRequest, Run>(
            "runs/sandbox",
            request,
            cancellationToken);
    }
}
