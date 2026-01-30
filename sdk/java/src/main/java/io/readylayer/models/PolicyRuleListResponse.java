package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response containing a list of policy rules.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PolicyRuleListResponse {
    
    private List<PolicyRule> rules;
}
