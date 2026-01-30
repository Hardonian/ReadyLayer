using ReadyLayer.SDK.Models;

namespace ReadyLayer.SDK.Services;

/// <summary>
/// Service for repository operations.
/// </summary>
public class RepositoryService
{
    private readonly ReadyLayerClient _client;

    internal RepositoryService(ReadyLayerClient client)
    {
        _client = client;
    }

    /// <summary>
    /// Lists all repositories accessible to the authenticated user.
    /// </summary>
    /// <param name="params">Optional filtering and pagination parameters.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of repositories with pagination information.</returns>
    public async Task<RepositoryListResponse> ListAsync(
        ListRepositoriesParams? @params = null,
        CancellationToken cancellationToken = default)
    {
        @params ??= new ListRepositoriesParams();
        return await _client.GetAsync<RepositoryListResponse>(
            "repos", 
            @params.ToQueryParams(), 
            cancellationToken);
    }

    /// <summary>
    /// Gets a specific repository by ID.
    /// </summary>
    /// <param name="repoId">The repository ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The repository details.</returns>
    public async Task<Repository> GetAsync(
        string repoId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(repoId))
            throw new ArgumentException("Repository ID is required", nameof(repoId));

        return await _client.GetAsync<Repository>(
            $"repos/{Uri.EscapeDataString(repoId)}",
            cancellationToken: cancellationToken);
    }

    /// <summary>
    /// Creates a new repository.
    /// </summary>
    /// <param name="request">The repository creation request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The created repository.</returns>
    public async Task<Repository> CreateAsync(
        CreateRepositoryRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request == null)
            throw new ArgumentNullException(nameof(request));

        return await _client.PostAsync<CreateRepositoryRequest, Repository>(
            "repos",
            request,
            cancellationToken);
    }

    /// <summary>
    /// Updates a repository.
    /// </summary>
    /// <param name="repoId">The repository ID.</param>
    /// <param name="request">The repository update request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The updated repository.</returns>
    public async Task<Repository> UpdateAsync(
        string repoId,
        UpdateRepositoryRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(repoId))
            throw new ArgumentException("Repository ID is required", nameof(repoId));
        if (request == null)
            throw new ArgumentNullException(nameof(request));

        return await _client.PutAsync<UpdateRepositoryRequest, Repository>(
            $"repos/{Uri.EscapeDataString(repoId)}",
            request,
            cancellationToken);
    }

    /// <summary>
    /// Deletes a repository and all associated data.
    /// </summary>
    /// <param name="repoId">The repository ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    public async Task DeleteAsync(
        string repoId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(repoId))
            throw new ArgumentException("Repository ID is required", nameof(repoId));

        await _client.DeleteAsync(
            $"repos/{Uri.EscapeDataString(repoId)}",
            cancellationToken);
    }

    /// <summary>
    /// Tests connectivity to the repository provider.
    /// </summary>
    /// <param name="repoId">The repository ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The connection test result.</returns>
    public async Task<TestConnectionResponse> TestConnectionAsync(
        string repoId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(repoId))
            throw new ArgumentException("Repository ID is required", nameof(repoId));

        return await _client.PostAsync<object, TestConnectionResponse>(
            $"repos/{Uri.EscapeDataString(repoId)}/test-connection",
            new { },
            cancellationToken);
    }
}
