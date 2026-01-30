package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Request to create a policy rule.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePolicyRuleRequest {
    
    private String ruleId;
    private Map<String, SeverityMapping> severityMapping;
    private Boolean enabled;
    private Map<String, Object> params;
}
