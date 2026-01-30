package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

/**
 * Policy pack containing multiple rules.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PolicyPack {
    
    private String id;
    private String organizationId;
    private String repositoryId;
    private String version;
    private String checksum;
    private List<PolicyRule> rules;
    private Instant createdAt;
    private Instant updatedAt;
}
