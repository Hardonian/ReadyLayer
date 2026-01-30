package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Policy template definition.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PolicyTemplate {
    
    private String id;
    private String name;
    private String description;
    private String version;
    private List<PolicyRule> rules;
}
