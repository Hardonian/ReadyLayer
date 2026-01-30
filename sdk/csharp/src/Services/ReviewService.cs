using ReadyLayer.SDK.Models;

namespace ReadyLayer.SDK.Services;

/// <summary>
/// Service for code review operations.
/// </summary>
public class ReviewService
{
    private readonly ReadyLayerClient _client;

    internal ReviewService(ReadyLayerClient client)
    {
        _client = client;
    }

    /// <summary>
    /// Lists all reviews.
    /// </summary>
    /// <param name="params">Optional filtering and pagination parameters.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of reviews with pagination information.</returns>
    public async Task<ReviewListResponse> ListAsync(
        ListReviewsParams? @params = null,
        CancellationToken cancellationToken = default)
    {
        @params ??= new ListReviewsParams();
        return await _client.GetAsync<ReviewListResponse>(
            "reviews",
            @params.ToQueryParams(),
            cancellationToken);
    }

    /// <summary>
    /// Gets a specific review by ID.
    /// </summary>
    /// <param name="reviewId">The review ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The review details.</returns>
    public async Task<Review> GetAsync(
        string reviewId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(reviewId))
            throw new ArgumentException("Review ID is required", nameof(reviewId));

        return await _client.GetAsync<Review>(
            $"reviews/{Uri.EscapeDataString(reviewId)}",
            cancellationToken: cancellationToken);
    }

    /// <summary>
    /// Creates a new code review.
    /// </summary>
    /// <param name="request">The review creation request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The created review.</returns>
    public async Task<Review> CreateAsync(
        CreateReviewRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request == null)
            throw new ArgumentNullException(nameof(request));

        return await _client.PostAsync<CreateReviewRequest, Review>(
            "reviews",
            request,
            cancellationToken);
    }
}
