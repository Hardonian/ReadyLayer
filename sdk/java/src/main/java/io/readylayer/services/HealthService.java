package io.readylayer.services;

import io.readylayer.ReadyLayerClient;
import io.readylayer.models.*;
import lombok.RequiredArgsConstructor;

import java.net.http.HttpRequest;
import java.util.concurrent.CompletableFuture;

/**
 * Service for health check operations.
 */
@RequiredArgsConstructor
public class HealthService {
    
    private final ReadyLayerClient client;
    
    /**
     * Get health status (no authentication required).
     */
    public HealthResponse getHealth() {
        HttpRequest request = client.requestBuilder("/health")
                .header("Authorization", "")
                .GET()
                .build();
        
        return client.execute(request, HealthResponse.class);
    }
    
    /**
     * Get health status asynchronously.
     */
    public CompletableFuture<HealthResponse> getHealthAsync() {
        HttpRequest request = client.requestBuilder("/health")
                .header("Authorization", "")
                .GET()
                .build();
        
        return client.executeAsync(request, HealthResponse.class);
    }
    
    /**
     * Get readiness status (no authentication required).
     */
    public ReadyResponse getReady() {
        HttpRequest request = client.requestBuilder("/ready")
                .header("Authorization", "")
                .GET()
                .build();
        
        return client.execute(request, ReadyResponse.class);
    }
    
    /**
     * Get readiness status asynchronously.
     */
    public CompletableFuture<ReadyResponse> getReadyAsync() {
        HttpRequest request = client.requestBuilder("/ready")
                .header("Authorization", "")
                .GET()
                .build();
        
        return client.executeAsync(request, ReadyResponse.class);
    }
}
