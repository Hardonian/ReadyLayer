package io.readylayer.services;

import io.readylayer.ReadyLayerClient;
import io.readylayer.models.*;
import lombok.RequiredArgsConstructor;

import java.net.http.HttpRequest;

/**
 * Service for test run operations.
 */
@RequiredArgsConstructor
public class RunService {
    
    private final ReadyLayerClient client;
    
    /**
     * List all test runs.
     */
    public RunListResponse list(ListOptions options) {
        StringBuilder path = new StringBuilder("/runs?");
        addQueryParams(path, options);
        
        HttpRequest request = client.requestBuilder(path.toString())
                .GET()
                .build();
        
        return client.execute(request, RunListResponse.class);
    }
    
    /**
     * List runs with default pagination.
     */
    public RunListResponse list() {
        return list(ListOptions.builder()
                .pagination(PaginationParams.builder().build())
                .build());
    }
    
    /**
     * Get a specific test run.
     */
    public Run get(String runId) {
        HttpRequest request = client.requestBuilder("/runs/" + runId)
                .GET()
                .build();
        
        return client.execute(request, Run.class);
    }
    
    /**
     * Create a new test run.
     */
    public Run create(CreateRunRequest request) {
        HttpRequest httpRequest = client.requestBuilder("/runs")
                .POST(HttpRequest.BodyPublishers.ofString(client.toJson(request)))
                .build();
        
        return client.execute(httpRequest, Run.class);
    }
    
    /**
     * Create a sandbox test run.
     */
    public Run createSandbox(CreateSandboxRunRequest request) {
        HttpRequest httpRequest = client.requestBuilder("/runs/sandbox")
                .POST(HttpRequest.BodyPublishers.ofString(client.toJson(request)))
                .build();
        
        return client.execute(httpRequest, Run.class);
    }
    
    private void addQueryParams(StringBuilder path, ListOptions options) {
        if (options == null) return;
        
        boolean first = true;
        
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
