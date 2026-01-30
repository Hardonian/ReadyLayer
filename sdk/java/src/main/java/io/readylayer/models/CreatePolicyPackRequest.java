package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request to create a policy pack.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePolicyPackRequest {
    
    private String organizationId;
    private String repositoryId;
    private String version;
    private String source;
    private List<PolicyRuleRequest> rules;
    
    /**
     * Nested rule request for creating policy packs.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PolicyRuleRequest {
        private String ruleId;
        private java.util.Map<String, SeverityMapping> severityMapping;
        private Boolean enabled;
        private java.util.Map<String, Object> params;
    }
}
