package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Policy rule definition.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PolicyRule {
    
    private String id;
    private String ruleId;
    private Boolean enabled;
    private Map<String, SeverityMapping> severityMapping;
    private Map<String, Object> params;
}
