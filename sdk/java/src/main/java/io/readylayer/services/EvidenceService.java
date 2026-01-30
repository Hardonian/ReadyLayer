package io.readylayer.services;

import io.readylayer.ReadyLayerClient;
import io.readylayer.models.*;
import lombok.RequiredArgsConstructor;

import java.net.http.HttpRequest;

/**
 * Service for evidence operations.
 */
@RequiredArgsConstructor
public class EvidenceService {
    
    private final ReadyLayerClient client;
    
    /**
     * List all evidence bundles.
     */
    public EvidenceListResponse list(ListOptions options) {
        StringBuilder path = new StringBuilder("/evidence?");
        addQueryParams(path, options);
        
        HttpRequest request = client.requestBuilder(path.toString())
                .GET()
                .build();
        
        return client.execute(request, EvidenceListResponse.class);
    }
    
    /**
     * List evidence with default pagination.
     */
    public EvidenceListResponse list() {
        return list(ListOptions.builder()
                .pagination(PaginationParams.builder().build())
                .build());
    }
    
    /**
     * Get a specific evidence bundle.
     */
    public EvidenceBundle get(String bundleId) {
        HttpRequest request = client.requestBuilder("/evidence/" + bundleId)
                .GET()
                .build();
        
        return client.execute(request, EvidenceBundle.class);
    }
    
    /**
     * Export evidence bundle as JSON.
     */
    public String export(String bundleId) {
        HttpRequest request = client.requestBuilder("/evidence/" + bundleId + "/export")
                .GET()
                .build();
        
        return client.execute(request, String.class);
    }
    
    private void addQueryParams(StringBuilder path, ListOptions options) {
        if (options == null) return;
        
        boolean first = true;
        
        if (options.getReviewId() != null) {
            path.append(first ? "" : "&").append("reviewId=").append(options.getReviewId());
            first = false;
        }
        
        PaginationParams pagination = options.getEffectivePagination();
        path.append(first ? "" : "&")
                .append("limit=").append(pagination.getEffectiveLimit())
                .append("&offset=").append(pagination.getEffectiveOffset());
    }
}
