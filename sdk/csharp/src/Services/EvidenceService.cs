using ReadyLayer.SDK.Models;

namespace ReadyLayer.SDK.Services;

/// <summary>
/// Service for evidence bundle operations.
/// </summary>
public class EvidenceService
{
    private readonly ReadyLayerClient _client;

    internal EvidenceService(ReadyLayerClient client)
    {
        _client = client;
    }

    /// <summary>
    /// Lists all evidence bundles.
    /// </summary>
    /// <param name="params">Optional filtering and pagination parameters.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of evidence bundles with pagination information.</returns>
    public async Task<EvidenceListResponse> ListAsync(
        ListEvidenceParams? @params = null,
        CancellationToken cancellationToken = default)
    {
        @params ??= new ListEvidenceParams();
        return await _client.GetAsync<EvidenceListResponse>(
            "evidence",
            @params.ToQueryParams(),
            cancellationToken);
    }

    /// <summary>
    /// Gets a specific evidence bundle by ID.
    /// </summary>
    /// <param name="bundleId">The evidence bundle ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The evidence bundle details.</returns>
    public async Task<EvidenceBundle> GetAsync(
        string bundleId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(bundleId))
            throw new ArgumentException("Bundle ID is required", nameof(bundleId));

        return await _client.GetAsync<EvidenceBundle>(
            $"evidence/{Uri.EscapeDataString(bundleId)}",
            cancellationToken: cancellationToken);
    }

    /// <summary>
    /// Exports an evidence bundle as JSON.
    /// </summary>
    /// <param name="bundleId">The evidence bundle ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The exported evidence data.</returns>
    public async Task<object> ExportAsync(
        string bundleId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(bundleId))
            throw new ArgumentException("Bundle ID is required", nameof(bundleId));

        return await _client.GetAsync<object>(
            $"evidence/{Uri.EscapeDataString(bundleId)}/export",
            cancellationToken: cancellationToken);
    }
}
