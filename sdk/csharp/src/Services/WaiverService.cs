using ReadyLayer.SDK.Models;

namespace ReadyLayer.SDK.Services;

/// <summary>
/// Service for waiver operations.
/// </summary>
public class WaiverService
{
    private readonly ReadyLayerClient _client;

    internal WaiverService(ReadyLayerClient client)
    {
        _client = client;
    }

    /// <summary>
    /// Lists all waivers.
    /// </summary>
    /// <param name="params">Optional filtering and pagination parameters.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of waivers with pagination information.</returns>
    public async Task<WaiverListResponse> ListAsync(
        ListWaiversParams? @params = null,
        CancellationToken cancellationToken = default)
    {
        @params ??= new ListWaiversParams();
        return await _client.GetAsync<WaiverListResponse>(
            "waivers",
            @params.ToQueryParams(),
            cancellationToken);
    }

    /// <summary>
    /// Gets a specific waiver by ID.
    /// </summary>
    /// <param name="waiverId">The waiver ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The waiver details.</returns>
    public async Task<Waiver> GetAsync(
        string waiverId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(waiverId))
            throw new ArgumentException("Waiver ID is required", nameof(waiverId));

        return await _client.GetAsync<Waiver>(
            $"waivers/{Uri.EscapeDataString(waiverId)}",
            cancellationToken: cancellationToken);
    }

    /// <summary>
    /// Creates a new waiver.
    /// </summary>
    /// <param name="request">The waiver creation request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The created waiver.</returns>
    public async Task<Waiver> CreateAsync(
        CreateWaiverRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request == null)
            throw new ArgumentNullException(nameof(request));

        return await _client.PostAsync<CreateWaiverRequest, Waiver>(
            "waivers",
            request,
            cancellationToken);
    }

    /// <summary>
    /// Revokes (deletes) a waiver.
    /// </summary>
    /// <param name="waiverId">The waiver ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    public async Task RevokeAsync(
        string waiverId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(waiverId))
            throw new ArgumentException("Waiver ID is required", nameof(waiverId));

        await _client.DeleteAsync(
            $"waivers/{Uri.EscapeDataString(waiverId)}",
            cancellationToken);
    }
}
