using ReadyLayer.SDK.Models;

namespace ReadyLayer.SDK.Services;

/// <summary>
/// Service for billing operations.
/// </summary>
public class BillingService
{
    private readonly ReadyLayerClient _client;

    internal BillingService(ReadyLayerClient client)
    {
        _client = client;
    }

    /// <summary>
    /// Gets the current billing tier and usage.
    /// </summary>
    /// <param name="organizationId">Optional organization ID filter.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The billing tier and usage information.</returns>
    public async Task<BillingTierResponse> GetTierAsync(
        string? organizationId = null,
        CancellationToken cancellationToken = default)
    {
        var queryParams = new Dictionary<string, string?>();
        if (!string.IsNullOrWhiteSpace(organizationId))
            queryParams["organizationId"] = organizationId;

        return await _client.GetAsync<BillingTierResponse>(
            "billing/tier",
            queryParams,
            cancellationToken);
    }

    /// <summary>
    /// Creates a Stripe checkout session for subscription.
    /// </summary>
    /// <param name="request">The checkout session creation request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The checkout session details.</returns>
    public async Task<CheckoutSessionResponse> CreateCheckoutSessionAsync(
        CreateCheckoutRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request == null)
            throw new ArgumentNullException(nameof(request));

        return await _client.PostAsync<CreateCheckoutRequest, CheckoutSessionResponse>(
            "billing/checkout",
            request,
            cancellationToken);
    }
}
