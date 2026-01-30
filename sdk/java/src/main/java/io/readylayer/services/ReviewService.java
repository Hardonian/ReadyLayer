package io.readylayer.services;

import io.readylayer.ReadyLayerClient;
import io.readylayer.models.*;
import lombok.RequiredArgsConstructor;

import java.net.http.HttpRequest;
import java.util.concurrent.CompletableFuture;

/**
 * Service for code review operations.
 */
@RequiredArgsConstructor
public class ReviewService {
    
    private final ReadyLayerClient client;
    
    /**
     * List all reviews.
     */
    public ReviewListResponse list(ListOptions options) {
        StringBuilder path = new StringBuilder("/reviews?");
        addQueryParams(path, options);
        
        HttpRequest request = client.requestBuilder(path.toString())
                .GET()
                .build();
        
        return client.execute(request, ReviewListResponse.class);
    }
    
    /**
     * List reviews with default pagination.
     */
    public ReviewListResponse list() {
        return list(ListOptions.builder()
                .pagination(PaginationParams.builder().build())
                .build());
    }
    
    /**
     * Get a specific review.
     */
    public Review get(String reviewId) {
        HttpRequest request = client.requestBuilder("/reviews/" + reviewId)
                .GET()
                .build();
        
        return client.execute(request, Review.class);
    }
    
    /**
     * Create a new code review.
     */
    public Review create(CreateReviewRequest request) {
        HttpRequest httpRequest = client.requestBuilder("/reviews")
                .POST(HttpRequest.BodyPublishers.ofString(client.toJson(request)))
                .build();
        
        return client.execute(httpRequest, Review.class);
    }
    
    private void addQueryParams(StringBuilder path, ListOptions options) {
        if (options == null) return;
        
        boolean first = true;
        
        if (options.getRepositoryId() != null) {
            path.append(first ? "" : "&").append("repositoryId=").append(options.getRepositoryId());
            first = false;
        }
        if (options.getPrNumber() != null) {
            path.append(first ? "" : "&").append("prNumber=").append(options.getPrNumber());
            first = false;
        }
        if (options.getSelect() != null) {
            path.append(first ? "" : "&").append("select=").append(options.getSelect());
            first = false;
        }
        
        PaginationParams pagination = options.getEffectivePagination();
        path.append(first ? "" : "&")
                .append("limit=").append(pagination.getEffectiveLimit())
                .append("&offset=").append(pagination.getEffectiveOffset());
    }
}
