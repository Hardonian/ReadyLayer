package io.readylayer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.readylayer.exceptions.*;
import io.readylayer.models.ErrorResponse;
import lombok.Builder;
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
 * Configuration for the ReadyLayer client.
 */
@Builder
@Getter
public class ReadyLayerConfig {
    
    public static final String DEFAULT_BASE_URL = "https://readylayer.io/api/v1";
    public static final int DEFAULT_MAX_RETRIES = 3;
    public static final long DEFAULT_RETRY_DELAY_MS = 1000;
    public static final long DEFAULT_MAX_RETRY_DELAY_MS = 30000;
    public static final Duration DEFAULT_TIMEOUT = Duration.ofSeconds(30);
    
    @Builder.Default
    private String baseUrl = DEFAULT_BASE_URL;
    
    private String apiKey;
    
    @Builder.Default
    private int maxRetries = DEFAULT_MAX_RETRIES;
    
    @Builder.Default
    private long retryDelayMs = DEFAULT_RETRY_DELAY_MS;
    
    @Builder.Default
    private long maxRetryDelayMs = DEFAULT_MAX_RETRY_DELAY_MS;
    
    @Builder.Default
    private Duration timeout = DEFAULT_TIMEOUT;
    
    /**
     * Create a default configuration with just an API key.
     */
    public static ReadyLayerConfig withApiKey(String apiKey) {
        return ReadyLayerConfig.builder()
                .apiKey(apiKey)
                .build();
    }
}
