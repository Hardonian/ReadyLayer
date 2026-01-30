package io.readylayer.services;

import io.readylayer.ReadyLayerClient;
import io.readylayer.models.*;
import lombok.RequiredArgsConstructor;

import java.net.http.HttpRequest;
import java.util.concurrent.CompletableFuture;

/**
 * Service for repository operations.
 */
@RequiredArgsConstructor
public class RepositoryService {
    
    private final ReadyLayerClient client;
    
    /**
     * List all repositories accessible to the authenticated user.
     */
    public RepositoryListResponse list(ListOptions options) {
        StringBuilder path = new StringBuilder("/repos?");
        addQueryParams(path, options);
        
        HttpRequest request = client.requestBuilder(path.toString())
                .GET()
                .build();
        
        return client.execute(request, RepositoryListResponse.class);
    }
    
    /**
     * List all repositories with default pagination.
     */
    public RepositoryListResponse list() {
        return list(ListOptions.builder()
                .pagination(PaginationParams.builder().build())
                .build());
    }
    
    /**
     * List repositories asynchronously.
     */
    public CompletableFuture<RepositoryListResponse> listAsync(ListOptions options) {
        StringBuilder path = new StringBuilder("/repos?");
        addQueryParams(path, options);
        
        HttpRequest request = client.requestBuilder(path.toString())
                .GET()
                .build();
        
        return client.executeAsync(request, RepositoryListResponse.class);
    }
    
    /**
     * Get a specific repository by ID.
     */
    public Repository get(String repoId) {
        HttpRequest request = client.requestBuilder("/repos/" + repoId)
                .GET()
                .build();
        
        return client.execute(request, Repository.class);
    }
    
    /**
     * Get a repository asynchronously.
     */
    public CompletableFuture<Repository> getAsync(String repoId) {
        HttpRequest request = client.requestBuilder("/repos/" + repoId)
                .GET()
                .build();
        
        return client.executeAsync(request, Repository.class);
    }
    
    /**
     * Create a new repository.
     */
    public Repository create(CreateRepositoryRequest request) {
        HttpRequest httpRequest = client.requestBuilder("/repos")
                .POST(HttpRequest.BodyPublishers.ofString(client.toJson(request)))
                .build();
        
        return client.execute(httpRequest, Repository.class);
    }
    
    /**
     * Create a repository asynchronously.
     */
    public CompletableFuture<Repository> createAsync(CreateRepositoryRequest request) {
        HttpRequest httpRequest = client.requestBuilder("/repos")
                .POST(HttpRequest.BodyPublishers.ofString(client.toJson(request)))
                .build();
        
        return client.executeAsync(httpRequest, Repository.class);
    }
    
    /**
     * Update repository settings.
     */
    public Repository update(String repoId, UpdateRepositoryRequest request) {
        HttpRequest httpRequest = client.requestBuilder("/repos/" + repoId)
                .PUT(HttpRequest.BodyPublishers.ofString(client.toJson(request)))
                .build();
        
        return client.execute(httpRequest, Repository.class);
    }
    
    /**
     * Update a repository asynchronously.
     */
    public CompletableFuture<Repository> updateAsync(String repoId, UpdateRepositoryRequest request) {
        HttpRequest httpRequest = client.requestBuilder("/repos/" + repoId)
                .PUT(HttpRequest.BodyPublishers.ofString(client.toJson(request)))
                .build();
        
        return client.executeAsync(httpRequest, Repository.class);
    }
    
    /**
     * Delete a repository.
     */
    public void delete(String repoId) {
        HttpRequest request = client.requestBuilder("/repos/" + repoId)
                .DELETE()
                .build();
        
        client.execute(request, Void.class);
    }
    
    /**
     * Delete a repository asynchronously.
     */
    public CompletableFuture<Void> deleteAsync(String repoId) {
        HttpRequest request = client.requestBuilder("/repos/" + repoId)
                .DELETE()
                .build();
        
        return client.executeAsync(request, Void.class);
    }
    
    /**
     * Test connectivity to the repository provider.
     */
    public TestConnectionResponse testConnection(String repoId) {
        HttpRequest request = client.requestBuilder("/repos/" + repoId + "/test-connection")
                .POST(HttpRequest.BodyPublishers.noBody())
                .build();
        
        return client.execute(request, TestConnectionResponse.class);
    }
    
    /**
     * Test connection asynchronously.
     */
    public CompletableFuture<TestConnectionResponse> testConnectionAsync(String repoId) {
        HttpRequest request = client.requestBuilder("/repos/" + repoId + "/test-connection")
                .POST(HttpRequest.BodyPublishers.noBody())
                .build();
        
        return client.executeAsync(request, TestConnectionResponse.class);
    }
    
    private void addQueryParams(StringBuilder path, ListOptions options) {
        if (options == null) {
            return;
        }
        
        boolean first = true;
        
        if (options.getOrganizationId() != null) {
            path.append(first ? "" : "&").append("organizationId=").append(options.getOrganizationId());
            first = false;
        }
        
        PaginationParams pagination = options.getEffectivePagination();
        path.append(first ? "" : "&")
                .append("limit=").append(pagination.getEffectiveLimit())
                .append("&offset=").append(pagination.getEffectiveOffset());
    }
}
