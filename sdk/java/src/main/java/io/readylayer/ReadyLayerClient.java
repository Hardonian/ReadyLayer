package io.readylayer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.readylayer.exceptions.*;
import io.readylayer.models.ErrorResponse;
import io.readylayer.services.*;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;

/**
 * Main client for the ReadyLayer API.
 * 
 * <p>Example usage:
 * <pre>
 * ReadyLayerClient client = ReadyLayerClient.builder()
 *     .apiKey("your-api-key")
 *     .build();
 * 
 * // List repositories
 * RepositoryListResponse repos = client.repositories().list();
 * 
 * // Create a review
 * Review review = client.reviews().create(CreateReviewRequest.builder()
 *     .repositoryId("repo-id")
 *     .prNumber(123)
 *     .prSha("abc123")
 *     .build());
 * </pre>
 */
@Slf4j
public class ReadyLayerClient {
    
    private final ReadyLayerConfig config;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    
    @Getter
    private final RepositoryService repositories;
    @Getter
    private final PolicyService policies;
    @Getter
    private final ReviewService reviews;
    @Getter
    private final WaiverService waivers;
    @Getter
    private final EvidenceService evidence;
    @Getter
    private final RunService runs;
    @Getter
    private final BillingService billing;
    @Getter
    private final HealthService health;
    @Getter
    private final ApiKeyService apiKeys;
    
    private ReadyLayerClient(ReadyLayerConfig config) {
        this.config = config;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(config.getTimeout())
                .build();
        this.objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule());
        
        this.repositories = new RepositoryService(this);
        this.policies = new PolicyService(this);
        this.reviews = new ReviewService(this);
        this.waivers = new WaiverService(this);
        this.evidence = new EvidenceService(this);
        this.runs = new RunService(this);
        this.billing = new BillingService(this);
        this.health = new HealthService(this);
        this.apiKeys = new ApiKeyService(this);
    }
    
    /**
     * Create a new client builder.
     */
    public static Builder builder() {
        return new Builder();
    }
    
    /**
     * Create a client with just an API key.
     */
    public static ReadyLayerClient withApiKey(String apiKey) {
        return builder().apiKey(apiKey).build();
    }
    
    /**
     * Builder for ReadyLayerClient.
     */
    public static class Builder {
        private String baseUrl = ReadyLayerConfig.DEFAULT_BASE_URL;
        private String apiKey;
        private int maxRetries = ReadyLayerConfig.DEFAULT_MAX_RETRIES;
        private long retryDelayMs = ReadyLayerConfig.DEFAULT_RETRY_DELAY_MS;
        private long maxRetryDelayMs = ReadyLayerConfig.DEFAULT_MAX_RETRY_DELAY_MS;
        private Duration timeout = ReadyLayerConfig.DEFAULT_TIMEOUT;
        
        public Builder baseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
            return this;
        }
        
        public Builder apiKey(String apiKey) {
            this.apiKey = apiKey;
            return this;
        }
        
        public Builder maxRetries(int maxRetries) {
            this.maxRetries = maxRetries;
            return this;
        }
        
        public Builder retryDelayMs(long retryDelayMs) {
            this.retryDelayMs = retryDelayMs;
            return this;
        }
        
        public Builder maxRetryDelayMs(long maxRetryDelayMs) {
            this.maxRetryDelayMs = maxRetryDelayMs;
            return this;
        }
        
        public Builder timeout(Duration timeout) {
            this.timeout = timeout;
            return this;
        }
        
        public ReadyLayerClient build() {
            if (apiKey == null || apiKey.trim().isEmpty()) {
                throw new IllegalArgumentException("API key is required");
            }
            
            ReadyLayerConfig config = ReadyLayerConfig.builder()
                    .baseUrl(baseUrl)
                    .apiKey(apiKey)
                    .maxRetries(maxRetries)
                    .retryDelayMs(retryDelayMs)
                    .maxRetryDelayMs(maxRetryDelayMs)
                    .timeout(timeout)
                    .build();
            
            return new ReadyLayerClient(config);
        }
    }
    
    /**
     * Execute a synchronous HTTP request with retry logic.
     */
    <T> T execute(HttpRequest request, Class<T> responseType) {
        return executeWithRetry(request, responseType, 0);
    }
    
    /**
     * Execute an asynchronous HTTP request.
     */
    <T> CompletableFuture<T> executeAsync(HttpRequest request, Class<T> responseType) {
        return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                .thenApply(response -> handleResponse(response, responseType));
    }
    
    private <T> T executeWithRetry(HttpRequest request, Class<T> responseType, int attempt) {
        try {
            HttpResponse<String> response = httpClient.send(
                    request, 
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );
            
            if (shouldRetry(response.statusCode()) && attempt < config.getMaxRetries()) {
                long delay = calculateDelay(attempt);
                log.debug("Retrying request after {}ms (attempt {}/{}})", delay, attempt + 1, config.getMaxRetries());
                Thread.sleep(delay);
                return executeWithRetry(request, responseType, attempt + 1);
            }
            
            return handleResponse(response, responseType);
            
        } catch (IOException e) {
            if (attempt < config.getMaxRetries()) {
                long delay = calculateDelay(attempt);
                log.debug("Retrying after IO error: {} (attempt {}/{}})", e.getMessage(), attempt + 1, config.getMaxRetries());
                try {
                    Thread.sleep(delay);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new ApiException("Request interrupted", e);
                }
                return executeWithRetry(request, responseType, attempt + 1);
            }
            throw new ApiException("Request failed after " + (attempt + 1) + " attempts", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ApiException("Request interrupted", e);
        }
    }
    
    private boolean shouldRetry(int statusCode) {
        return statusCode == 429 || statusCode >= 500;
    }
    
    private long calculateDelay(int attempt) {
        long delay = config.getRetryDelayMs() * (long) Math.pow(2, attempt);
        return Math.min(delay, config.getMaxRetryDelayMs());
    }
    
    private <T> T handleResponse(HttpResponse<String> response, Class<T> responseType) {
        int statusCode = response.statusCode();
        String body = response.body();
        
        if (statusCode >= 200 && statusCode < 300) {
            if (responseType == Void.class || body == null || body.isEmpty()) {
                return null;
            }
            try {
                return objectMapper.readValue(body, responseType);
            } catch (IOException e) {
                throw new ApiException("Failed to parse response", e);
            }
        }
        
        ErrorResponse error = null;
        try {
            error = objectMapper.readValue(body, ErrorResponse.class);
        } catch (IOException e) {
            log.debug("Failed to parse error response: {}", body);
        }
        
        String message = error != null && error.getError() != null 
                ? error.getError().getMessage() 
                : "HTTP " + statusCode;
        
        String errorCode = error != null && error.getError() != null
                ? error.getError().getCode()
                : null;
        
        switch (statusCode) {
            case 400:
                throw new ValidationException(message);
            case 401:
                throw new AuthenticationException(message);
            case 403:
                throw new ForbiddenException(message);
            case 404:
                throw new NotFoundException(message);
            case 402:
                throw new PaymentRequiredException(message);
            default:
                throw new ApiException(message, statusCode, errorCode);
        }
    }
    
    /**
     * Build an HTTP request with authentication headers.
     */
    HttpRequest.Builder requestBuilder(String path) {
        String url = config.getBaseUrl() + path;
        return HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Authorization", "Bearer " + config.getApiKey())
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .timeout(config.getTimeout());
    }
    
    /**
     * Serialize an object to JSON.
     */
    String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (IOException e) {
            throw new ApiException("Failed to serialize request", e);
        }
    }
    
    ReadyLayerConfig getConfig() {
        return config;
    }
}
