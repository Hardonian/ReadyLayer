using ReadyLayer.SDK.Models;

namespace ReadyLayer.SDK.Services;

/// <summary>
/// Service for API key operations.
/// </summary>
public class ApiKeyService
{
    private readonly ReadyLayerClient _client;

    internal ApiKeyService(ReadyLayerClient client)
    {
        _client = client;
    }

    /// <summary>
    /// Lists all API keys for the user.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of API keys.</returns>
    public async Task<ApiKeyListResponse> ListAsync(
        CancellationToken cancellationToken = default)
    {
        return await _client.GetAsync<ApiKeyListResponse>(
            "api-keys",
            cancellationToken: cancellationToken);
    }

    /// <summary>
    /// Creates a new API key.
    /// </summary>
    /// <param name="request">The API key creation request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The created API key.</returns>
    public async Task<ApiKey> CreateAsync(
        CreateApiKeyRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request == null)
            throw new ArgumentNullException(nameof(request));

        return await _client.PostAsync<CreateApiKeyRequest, ApiKey>(
            "api-keys",
            request,
            cancellationToken);
    }

    /// <summary>
    /// Revokes (deletes) an API key.
    /// </summary>
    /// <param name="keyId">The API key ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    public async Task RevokeAsync(
        string keyId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(keyId))
            throw new ArgumentException("Key ID is required", nameof(keyId));

        await _client.DeleteAsync(
            $"api-keys/{Uri.EscapeDataString(keyId)}",
            cancellationToken);
    }
}
