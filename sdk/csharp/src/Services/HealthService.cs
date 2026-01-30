using ReadyLayer.SDK.Models;

namespace ReadyLayer.SDK.Services;

/// <summary>
/// Service for health check operations.
/// </summary>
public class HealthService
{
    private readonly ReadyLayerClient _client;

    internal HealthService(ReadyLayerClient client)
    {
        _client = client;
    }

    /// <summary>
    /// Checks the service health status.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The health status response.</returns>
    public async Task<HealthResponse> CheckAsync(
        CancellationToken cancellationToken = default)
    {
        return await _client.GetAsync<HealthResponse>(
            "health",
            cancellationToken: cancellationToken);
    }

    /// <summary>
    /// Checks the service readiness status including dependencies.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The readiness status response.</returns>
    public async Task<ReadyResponse> CheckReadyAsync(
        CancellationToken cancellationToken = default)
    {
        return await _client.GetAsync<ReadyResponse>(
            "ready",
            cancellationToken: cancellationToken);
    }
}
