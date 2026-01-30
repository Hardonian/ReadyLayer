package io.readylayer.services;

import io.readylayer.ReadyLayerClient;
import io.readylayer.models.*;
import lombok.RequiredArgsConstructor;

import java.net.http.HttpRequest;

/**
 * Service for API key operations.
 */
@RequiredArgsConstructor
public class ApiKeyService {
    
    private final ReadyLayerClient client;
    
    /**
     * List all API keys for the user.
     */
    public ApiKeyListResponse list() {
        HttpRequest request = client.requestBuilder("/api-keys")
                .GET()
                .build();
        
        return client.execute(request, ApiKeyListResponse.class);
    }
    
    /**
     * Create a new API key.
     */
    public ApiKey create(CreateApiKeyRequest request) {
        HttpRequest httpRequest = client.requestBuilder("/api-keys")
                .POST(HttpRequest.BodyPublishers.ofString(client.toJson(request)))
                .build();
        
        return client.execute(httpRequest, ApiKey.class);
    }
    
    /**
     * Revoke (delete) an API key.
     */
    public void revoke(String keyId) {
        HttpRequest request = client.requestBuilder("/api-keys/" + keyId)
                .DELETE()
                .build();
        
        client.execute(request, Void.class);
    }
}
