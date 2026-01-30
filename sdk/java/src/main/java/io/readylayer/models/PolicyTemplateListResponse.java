package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response containing a list of policy templates.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PolicyTemplateListResponse {
    
    private List<PolicyTemplate> templates;
}
