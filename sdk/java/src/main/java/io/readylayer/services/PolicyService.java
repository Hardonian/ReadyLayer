package io.readylayer.services;

import io.readylayer.ReadyLayerClient;
import io.readylayer.models.*;
import lombok.RequiredArgsConstructor;

import java.net.http.HttpRequest;
import java.util.concurrent.CompletableFuture;

/**
 * Service for policy operations.
 */
@RequiredArgsConstructor
public class PolicyService {
    
    private final ReadyLayerClient client;
    
    /**
     * List all policy packs.
     */
    public PolicyPackListResponse list(ListOptions options) {
        StringBuilder path = new StringBuilder("/policies?");
        addQueryParams(path, options);
        
        HttpRequest request = client.requestBuilder(path.toString())
                .GET()
                .build();
        
        return client.execute(request, PolicyPackListResponse.class);
    }
    
    /**
     * List policy packs with default pagination.
     */
    public PolicyPackListResponse list() {
        return list(ListOptions.builder()
                .pagination(PaginationParams.builder().build())
                .build());
    }
    
    /**
     * Get a specific policy pack.
     */
    public PolicyPack get(String packId) {
        HttpRequest request = client.requestBuilder("/policies/" + packId)
                .GET()
                .build();
        
        return client.execute(request, PolicyPack.class);
    }
    
    /**
     * Create a new policy pack.
     */
    public PolicyPack create(CreatePolicyPackRequest request) {
        HttpRequest httpRequest = client.requestBuilder("/policies")
                .POST(HttpRequest.BodyPublishers.ofString(client.toJson(request)))
                .build();
        
        return client.execute(httpRequest, PolicyPack.class);
    }
    
    /**
     * Update a policy pack.
     */
    public PolicyPack update(String packId, UpdatePolicyPackRequest request) {
        HttpRequest httpRequest = client.requestBuilder("/policies/" + packId)
                .PUT(HttpRequest.BodyPublishers.ofString(client.toJson(request)))
                .build();
        
        return client.execute(httpRequest, PolicyPack.class);
    }
    
    /**
     * Delete a policy pack.
     */
    public void delete(String packId) {
        HttpRequest request = client.requestBuilder("/policies/" + packId)
                .DELETE()
                .build();
        
        client.execute(request, Void.class);
    }
    
    /**
     * List all rules in a policy pack.
     */
    public PolicyRuleListResponse listRules(String packId) {
        HttpRequest request = client.requestBuilder("/policies/" + packId + "/rules")
                .GET()
                .build();
        
        return client.execute(request, PolicyRuleListResponse.class);
    }
    
    /**
     * Add a rule to a policy pack.
     */
    public PolicyRule createRule(String packId, CreatePolicyRuleRequest request) {
        HttpRequest httpRequest = client.requestBuilder("/policies/" + packId + "/rules")
                .POST(HttpRequest.BodyPublishers.ofString(client.toJson(request)))
                .build();
        
        return client.execute(httpRequest, PolicyRule.class);
    }
    
    /**
     * Update a rule in a policy pack.
     */
    public PolicyRule updateRule(String packId, String ruleId, UpdatePolicyRuleRequest request) {
        HttpRequest httpRequest = client.requestBuilder("/policies/" + packId + "/rules/" + ruleId)
                .PUT(HttpRequest.BodyPublishers.ofString(client.toJson(request)))
                .build();
        
        return client.execute(httpRequest, PolicyRule.class);
    }
    
    /**
     * Delete a rule from a policy pack.
     */
    public void deleteRule(String packId, String ruleId) {
        HttpRequest request = client.requestBuilder("/policies/" + packId + "/rules/" + ruleId)
                .DELETE()
                .build();
        
        client.execute(request, Void.class);
    }
    
    /**
     * Validate policy syntax.
     */
    public PolicyValidationResult validate(ValidatePolicyRequest request) {
        HttpRequest httpRequest = client.requestBuilder("/policies/validate")
                .POST(HttpRequest.BodyPublishers.ofString(client.toJson(request)))
                .build();
        
        return client.execute(httpRequest, PolicyValidationResult.class);
    }
    
    /**
     * List available policy templates.
     */
    public PolicyTemplateListResponse listTemplates() {
        HttpRequest request = client.requestBuilder("/policies/templates")
                .GET()
                .build();
        
        return client.execute(request, PolicyTemplateListResponse.class);
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
