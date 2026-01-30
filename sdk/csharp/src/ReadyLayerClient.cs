using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Polly;
using Polly.Retry;
using ReadyLayer.SDK.Exceptions;
using ReadyLayer.SDK.Models;

namespace ReadyLayer.SDK;

/// <summary>
/// Configuration options for the ReadyLayer API client.
/// </summary>
public class ReadyLayerClientOptions
{
    /// <summary>
    /// The base URL for the ReadyLayer API. Defaults to the production URL.
    /// </summary>
    public string BaseUrl { get; set; } = "https://readylayer.io/api/v1";

    /// <summary>
    /// The Bearer token for API authentication.
    /// </summary>
    public string? ApiToken { get; set; }

    /// <summary>
    /// Maximum number of retry attempts for failed requests. Defaults to 3.
    /// </summary>
    public int MaxRetries { get; set; } = 3;

    /// <summary>
    /// Timeout for HTTP requests. Defaults to 30 seconds.
    /// </summary>
    public TimeSpan Timeout { get; set; } = TimeSpan.FromSeconds(30);

    /// <summary>
    /// Custom HTTP client handler. If not provided, a default handler will be used.
    /// </summary>
    public HttpClientHandler? HttpClientHandler { get; set; }

    /// <summary>
    /// JSON serializer options. If not provided, default options will be used.
    /// </summary>
    public JsonSerializerOptions? JsonOptions { get; set; }
}

/// <summary>
/// Main client for interacting with the ReadyLayer API.
/// </summary>
public class ReadyLayerClient : IDisposable
{
    private readonly HttpClient _httpClient;
    private readonly ReadyLayerClientOptions _options;
    private readonly AsyncRetryPolicy<HttpResponseMessage> _retryPolicy;
    private readonly JsonSerializerOptions _jsonOptions;
    private bool _disposed;

    /// <summary>
    /// Service for repository operations.
    /// </summary>
    public RepositoryService Repositories { get; }

    /// <summary>
    /// Service for policy pack and rule operations.
    /// </summary>
    public PolicyService Policies { get; }

    /// <summary>
    /// Service for code review operations.
    /// </summary>
    public ReviewService Reviews { get; }

    /// <summary>
    /// Service for waiver operations.
    /// </summary>
    public WaiverService Waivers { get; }

    /// <summary>
    /// Service for evidence bundle operations.
    /// </summary>
    public EvidenceService Evidence { get; }

    /// <summary>
    /// Service for test run operations.
    /// </summary>
    public RunService Runs { get; }

    /// <summary>
    /// Service for billing operations.
    /// </summary>
    public BillingService Billing { get; }

    /// <summary>
    /// Service for analytics and metrics operations.
    /// </summary>
    public AnalyticsService Analytics { get; }

    /// <summary>
    /// Service for API key operations.
    /// </summary>
    public ApiKeyService ApiKeys { get; }

    /// <summary>
    /// Service for health check operations.
    /// </summary>
    public HealthService Health { get; }

    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerClient"/> class.
    /// </summary>
    /// <param name="apiToken">The API token for authentication.</param>
    /// <exception cref="ArgumentException">Thrown when apiToken is null or empty.</exception>
    public ReadyLayerClient(string apiToken) : this(new ReadyLayerClientOptions { ApiToken = apiToken }) { }

    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerClient"/> class with custom options.
    /// </summary>
    /// <param name="options">The client configuration options.</param>
    /// <exception cref="ArgumentNullException">Thrown when options is null.</exception>
    /// <exception cref="ArgumentException">Thrown when ApiToken is not set.</exception>
    public ReadyLayerClient(ReadyLayerClientOptions options)
    {
        _options = options ?? throw new ArgumentNullException(nameof(options));
        
        if (string.IsNullOrWhiteSpace(_options.ApiToken))
        {
            throw new ArgumentException("ApiToken is required", nameof(options));
        }

        // Configure JSON options
        _jsonOptions = options.JsonOptions ?? new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            WriteIndented = false
        };

        // Configure retry policy
        _retryPolicy = Policy
            .Handle<HttpRequestException>()
            .Or<TaskCanceledException>()
            .OrResult<HttpResponseMessage>(r => 
                r.StatusCode == HttpStatusCode.RequestTimeout ||
                r.StatusCode == HttpStatusCode.TooManyRequests ||
                (int)r.StatusCode >= 500)
            .WaitAndRetryAsync(
                _options.MaxRetries,
                retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt - 1)),
                (result, timeSpan, retryCount, context) =>
                {
                    // Retry logic - could add logging here
                });

        // Create HTTP client
        var handler = _options.HttpClientHandler ?? new HttpClientHandler();
        _httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri(_options.BaseUrl.TrimEnd('/') + "/"),
            Timeout = _options.Timeout
        };
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_options.ApiToken}");
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "ReadyLayer.SDK/1.0.0");

        // Initialize services
        Repositories = new RepositoryService(this);
        Policies = new PolicyService(this);
        Reviews = new ReviewService(this);
        Waivers = new WaiverService(this);
        Evidence = new EvidenceService(this);
        Runs = new RunService(this);
        Billing = new BillingService(this);
        Analytics = new AnalyticsService(this);
        ApiKeys = new ApiKeyService(this);
        Health = new HealthService(this);
    }

    /// <summary>
    /// Sends a GET request to the specified endpoint.
    /// </summary>
    internal async Task<TResponse> GetAsync<TResponse>(
        string endpoint,
        Dictionary<string, string?>? queryParams = null,
        CancellationToken cancellationToken = default)
    {
        var url = BuildUrl(endpoint, queryParams);
        var response = await ExecuteWithRetryAsync(() => _httpClient.GetAsync(url, cancellationToken), cancellationToken);
        return await ProcessResponseAsync<TResponse>(response, cancellationToken);
    }

    /// <summary>
    /// Sends a POST request to the specified endpoint.
    /// </summary>
    internal async Task<TResponse> PostAsync<TRequest, TResponse>(
        string endpoint,
        TRequest request,
        CancellationToken cancellationToken = default)
    {
        var content = JsonContent.Create(request, options: _jsonOptions);
        var response = await ExecuteWithRetryAsync(() => _httpClient.PostAsync(endpoint, content, cancellationToken), cancellationToken);
        return await ProcessResponseAsync<TResponse>(response, cancellationToken);
    }

    /// <summary>
    /// Sends a POST request without expecting a response body.
    /// </summary>
    internal async Task PostAsync<TRequest>(
        string endpoint,
        TRequest request,
        CancellationToken cancellationToken = default)
    {
        var content = JsonContent.Create(request, options: _jsonOptions);
        var response = await ExecuteWithRetryAsync(() => _httpClient.PostAsync(endpoint, content, cancellationToken), cancellationToken);
        await ProcessResponseAsync(response, cancellationToken);
    }

    /// <summary>
    /// Sends a PUT request to the specified endpoint.
    /// </summary>
    internal async Task<TResponse> PutAsync<TRequest, TResponse>(
        string endpoint,
        TRequest request,
        CancellationToken cancellationToken = default)
    {
        var content = JsonContent.Create(request, options: _jsonOptions);
        var response = await ExecuteWithRetryAsync(() => _httpClient.PutAsync(endpoint, content, cancellationToken), cancellationToken);
        return await ProcessResponseAsync<TResponse>(response, cancellationToken);
    }

    /// <summary>
    /// Sends a DELETE request to the specified endpoint.
    /// </summary>
    internal async Task DeleteAsync(
        string endpoint,
        CancellationToken cancellationToken = default)
    {
        var response = await ExecuteWithRetryAsync(() => _httpClient.DeleteAsync(endpoint, cancellationToken), cancellationToken);
        await ProcessResponseAsync(response, cancellationToken);
    }

    /// <summary>
    /// Executes an HTTP request with retry logic.
    /// </summary>
    private async Task<HttpResponseMessage> ExecuteWithRetryAsync(
        Func<Task<HttpResponseMessage>> action,
        CancellationToken cancellationToken)
    {
        return await _retryPolicy.ExecuteAsync(action);
    }

    /// <summary>
    /// Processes the HTTP response and deserializes the content.
    /// </summary>
    private async Task<TResponse> ProcessResponseAsync<TResponse>(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        await EnsureSuccessOrThrowAsync(response, cancellationToken);

        if (response.StatusCode == HttpStatusCode.NoContent)
        {
            return default!;
        }

        var content = await response.Content.ReadAsStringAsync(cancellationToken);
        
        if (string.IsNullOrWhiteSpace(content))
        {
            return default!;
        }

        return JsonSerializer.Deserialize<TResponse>(content, _jsonOptions) 
            ?? throw new ReadyLayerException("Failed to deserialize response");
    }

    /// <summary>
    /// Processes the HTTP response without deserializing content.
    /// </summary>
    private async Task ProcessResponseAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        await EnsureSuccessOrThrowAsync(response, cancellationToken);
    }

    /// <summary>
    /// Ensures the response is successful or throws an appropriate exception.
    /// </summary>
    private async Task EnsureSuccessOrThrowAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode)
        {
            return;
        }

        var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
        ErrorResponse? error = null;

        if (!string.IsNullOrWhiteSpace(errorContent))
        {
            try
            {
                error = JsonSerializer.Deserialize<ErrorResponse>(errorContent, _jsonOptions);
            }
            catch
            {
                // Ignore deserialization errors
            }
        }

        var errorMessage = error?.Error?.Message ?? errorContent ?? "Unknown error";
        var errorCode = error?.Error?.Code;

        throw response.StatusCode switch
        {
            HttpStatusCode.BadRequest => new ReadyLayerValidationException(errorMessage, errorCode, error?.Error?.Errors),
            HttpStatusCode.Unauthorized => new ReadyLayerAuthenticationException(errorMessage, errorCode),
            HttpStatusCode.Forbidden => new ReadyLayerAuthorizationException(errorMessage, errorCode),
            HttpStatusCode.NotFound => new ReadyLayerNotFoundException(errorMessage, errorCode),
            HttpStatusCode.PaymentRequired => new ReadyLayerBillingException(errorMessage, errorCode),
            HttpStatusCode.Conflict => new ReadyLayerConflictException(errorMessage, errorCode),
            HttpStatusCode.TooManyRequests => new ReadyLayerRateLimitException(errorMessage, errorCode, 
                response.Headers.RetryAfter?.Delta),
            _ => new ReadyLayerException(errorMessage, errorCode, (int)response.StatusCode)
        };
    }

    /// <summary>
    /// Builds a URL with optional query parameters.
    /// </summary>
    private static string BuildUrl(string endpoint, Dictionary<string, string?>? queryParams)
    {
        if (queryParams == null || queryParams.Count == 0)
        {
            return endpoint;
        }

        var query = string.Join("&", queryParams
            .Where(kvp => !string.IsNullOrWhiteSpace(kvp.Value))
            .Select(kvp => $"{Uri.EscapeDataString(kvp.Key)}={Uri.EscapeDataString(kvp.Value!)}"));

        return string.IsNullOrEmpty(query) ? endpoint : $"{endpoint}?{query}";
    }

    /// <summary>
    /// Disposes the HTTP client and other resources.
    /// </summary>
    public void Dispose()
    {
        if (!_disposed)
        {
            _httpClient.Dispose();
            _disposed = true;
        }
    }
}
