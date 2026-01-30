package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request to update a policy pack.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePolicyPackRequest {
    
    private String version;
    private String source;
    private List<PolicyRule> rules;
}
