package io.readylayer.services;

import io.readylayer.ReadyLayerClient;
import io.readylayer.models.*;
import lombok.RequiredArgsConstructor;

import java.net.http.HttpRequest;

/**
 * Service for waiver operations.
 */
@RequiredArgsConstructor
public class WaiverService {
    
    private final ReadyLayerClient client;
    
    /**
     * List all waivers.
     */
    public WaiverListResponse list(ListOptions options) {
        StringBuilder path = new StringBuilder("/waivers?");
        addQueryParams(path, options);
        
        HttpRequest request = client.requestBuilder(path.toString())
                .GET()
                .build();
        
        return client.execute(request, WaiverListResponse.class);
    }
    
    /**
     * List waivers with default pagination.
     */
    public WaiverListResponse list() {
        return list(ListOptions.builder()
                .pagination(PaginationParams.builder().build())
                .build());
    }
    
    /**
     * Get a specific waiver.
     */
    public Waiver get(String waiverId) {
        HttpRequest request = client.requestBuilder("/waivers/" + waiverId)
                .GET()
                .build();
        
        return client.execute(request, Waiver.class);
    }
    
    /**
     * Create a new waiver.
     */
    public Waiver create(CreateWaiverRequest request) {
        HttpRequest httpRequest = client.requestBuilder("/waivers")
                .POST(HttpRequest.BodyPublishers.ofString(client.toJson(request)))
                .build();
        
        return client.execute(httpRequest, Waiver.class);
    }
    
    /**
     * Revoke (delete) a waiver.
     */
    public void delete(String waiverId) {
        HttpRequest request = client.requestBuilder("/waivers/" + waiverId)
                .DELETE()
                .build();
        
        client.execute(request, Void.class);
    }
    
    private void addQueryParams(StringBuilder path, ListOptions options) {
        if (options == null) return;
        
        boolean first = true;
        
        if (options.getOrganizationId() != null) {
            path.append(first ? "" : "&").append("organizationId=").append(options.getOrganizationId());
            first = false;
        }
        if (options.getRepositoryId() != null) {
            path.append(first ? "" : "&").append("repositoryId=").append(options.getRepositoryId());
            first = false;
        }
        
        PaginationParams pagination = options.getEffectivePagination();
        path.append(first ? "" : "&")
                .append("limit=").append(pagination.getEffectiveLimit())
                .append("&offset=").append(pagination.getEffectiveOffset());
    }
}
