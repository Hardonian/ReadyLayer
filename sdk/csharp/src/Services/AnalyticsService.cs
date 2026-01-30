using ReadyLayer.SDK.Models;

namespace ReadyLayer.SDK.Services;

/// <summary>
/// Service for analytics and metrics operations.
/// </summary>
public class AnalyticsService
{
    private readonly ReadyLayerClient _client;

    internal AnalyticsService(ReadyLayerClient client)
    {
        _client = client;
    }

    /// <summary>
    /// Gets usage metrics for the organization.
    /// </summary>
    /// <param name="params">Optional filtering parameters.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The metrics data.</returns>
    public async Task<MetricsResponse> GetMetricsAsync(
        GetMetricsParams? @params = null,
        CancellationToken cancellationToken = default)
    {
        @params ??= new GetMetricsParams();
        return await _client.GetAsync<MetricsResponse>(
            "metrics",
            @params.ToQueryParams(),
            cancellationToken);
    }
}
