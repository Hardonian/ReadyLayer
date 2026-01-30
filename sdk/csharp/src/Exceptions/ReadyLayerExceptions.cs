namespace ReadyLayer.SDK.Exceptions;

/// <summary>
/// Base exception for all ReadyLayer SDK errors.
/// </summary>
public class ReadyLayerException : Exception
{
    /// <summary>
    /// Error code from the API, if available.
    /// </summary>
    public string? ErrorCode { get; }

    /// <summary>
    /// HTTP status code, if applicable.
    /// </summary>
    public int? StatusCode { get; }

    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerException"/> class.
    /// </summary>
    public ReadyLayerException() { }

    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerException"/> class.
    /// </summary>
    /// <param name="message">The error message.</param>
    public ReadyLayerException(string message) : base(message) { }

    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerException"/> class.
    /// </summary>
    /// <param name="message">The error message.</param>
    /// <param name="innerException">The inner exception.</param>
    public ReadyLayerException(string message, Exception innerException) : base(message, innerException) { }

    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerException"/> class.
    /// </summary>
    /// <param name="message">The error message.</param>
    /// <param name="errorCode">The error code.</param>
    /// <param name="statusCode">The HTTP status code.</param>
    public ReadyLayerException(string message, string? errorCode, int? statusCode = null) : base(message)
    {
        ErrorCode = errorCode;
        StatusCode = statusCode;
    }
}

/// <summary>
/// Exception thrown when the request is invalid (400 Bad Request).
/// </summary>
public class ReadyLayerValidationException : ReadyLayerException
{
    /// <summary>
    /// Validation errors, if available.
    /// </summary>
    public IReadOnlyList<Models.ValidationErrorDetail>? ValidationErrors { get; }

    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerValidationException"/> class.
    /// </summary>
    public ReadyLayerValidationException() : base("Validation failed") { }

    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerValidationException"/> class.
    /// </summary>
    /// <param name="message">The error message.</param>
    public ReadyLayerValidationException(string message) : base(message) { }

    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerValidationException"/> class.
    /// </summary>
    /// <param name="message">The error message.</param>
    /// <param name="errorCode">The error code.</param>
    /// <param name="validationErrors">The validation errors.</param>
    public ReadyLayerValidationException(
        string message, 
        string? errorCode, 
        IReadOnlyList<Models.ValidationErrorDetail>? validationErrors) 
        : base(message, errorCode, 400)
    {
        ValidationErrors = validationErrors;
    }
}

/// <summary>
/// Exception thrown when authentication fails (401 Unauthorized).
/// </summary>
public class ReadyLayerAuthenticationException : ReadyLayerException
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerAuthenticationException"/> class.
    /// </summary>
    public ReadyLayerAuthenticationException() : base("Authentication failed") { }

    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerAuthenticationException"/> class.
    /// </summary>
    /// <param name="message">The error message.</param>
    public ReadyLayerAuthenticationException(string message) : base(message) { }

    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerAuthenticationException"/> class.
    /// </summary>
    /// <param name="message">The error message.</param>
    /// <param name="errorCode">The error code.</param>
    public ReadyLayerAuthenticationException(string message, string? errorCode) 
        : base(message, errorCode, 401) { }
}

/// <summary>
/// Exception thrown when the user lacks permissions (403 Forbidden).
/// </summary>
public class ReadyLayerAuthorizationException : ReadyLayerException
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerAuthorizationException"/> class.
    /// </summary>
    public ReadyLayerAuthorizationException() : base("Access denied") { }

    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerAuthorizationException"/> class.
    /// </summary>
    /// <param name="message">The error message.</param>
    public ReadyLayerAuthorizationException(string message) : base(message) { }

    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerAuthorizationException"/> class.
    /// </summary>
    /// <param name="message">The error message.</param>
    /// <param name="errorCode">The error code.</param>
    public ReadyLayerAuthorizationException(string message, string? errorCode) 
        : base(message, errorCode, 403) { }
}

/// <summary>
/// Exception thrown when a resource is not found (404 Not Found).
/// </summary>
public class ReadyLayerNotFoundException : ReadyLayerException
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerNotFoundException"/> class.
    /// </summary>
    public ReadyLayerNotFoundException() : base("Resource not found") { }

    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerNotFoundException"/> class.
    /// </summary>
    /// <param name="message">The error message.</param>
    public ReadyLayerNotFoundException(string message) : base(message) { }

    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerNotFoundException"/> class.
    /// </summary>
    /// <param name="message">The error message.</param>
    /// <param name="errorCode">The error code.</param>
    public ReadyLayerNotFoundException(string message, string? errorCode) 
        : base(message, errorCode, 404) { }
}

/// <summary>
/// Exception thrown when a billing limit is exceeded (402 Payment Required).
/// </summary>
public class ReadyLayerBillingException : ReadyLayerException
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerBillingException"/> class.
    /// </summary>
    public ReadyLayerBillingException() : base("Billing limit exceeded") { }

    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerBillingException"/> class.
    /// </summary>
    /// <param name="message">The error message.</param>
    public ReadyLayerBillingException(string message) : base(message) { }

    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerBillingException"/> class.
    /// </summary>
    /// <param name="message">The error message.</param>
    /// <param name="errorCode">The error code.</param>
    public ReadyLayerBillingException(string message, string? errorCode) 
        : base(message, errorCode, 402) { }
}

/// <summary>
/// Exception thrown when there's a conflict (409 Conflict).
/// </summary>
public class ReadyLayerConflictException : ReadyLayerException
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerConflictException"/> class.
    /// </summary>
    public ReadyLayerConflictException() : base("Resource conflict") { }

    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerConflictException"/> class.
    /// </summary>
    /// <param name="message">The error message.</param>
    public ReadyLayerConflictException(string message) : base(message) { }

    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerConflictException"/> class.
    /// </summary>
    /// <param name="message">The error message.</param>
    /// <param name="errorCode">The error code.</param>
    public ReadyLayerConflictException(string message, string? errorCode) 
        : base(message, errorCode, 409) { }
}

/// <summary>
/// Exception thrown when rate limit is exceeded (429 Too Many Requests).
/// </summary>
public class ReadyLayerRateLimitException : ReadyLayerException
{
    /// <summary>
    /// Time to wait before retrying, if provided by the server.
    /// </summary>
    public TimeSpan? RetryAfter { get; }

    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerRateLimitException"/> class.
    /// </summary>
    public ReadyLayerRateLimitException() : base("Rate limit exceeded") { }

    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerRateLimitException"/> class.
    /// </summary>
    /// <param name="message">The error message.</param>
    public ReadyLayerRateLimitException(string message) : base(message) { }

    /// <summary>
    /// Initializes a new instance of the <see cref="ReadyLayerRateLimitException"/> class.
    /// </summary>
    /// <param name="message">The error message.</param>
    /// <param name="errorCode">The error code.</param>
    /// <param name="retryAfter">Time to wait before retrying.</param>
    public ReadyLayerRateLimitException(string message, string? errorCode, TimeSpan? retryAfter) 
        : base(message, errorCode, 429)
    {
        RetryAfter = retryAfter;
    }
}
