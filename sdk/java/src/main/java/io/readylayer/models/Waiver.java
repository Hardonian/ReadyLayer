package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Policy waiver.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Waiver {
    
    private String id;
    private String organizationId;
    private String repositoryId;
    private String ruleId;
    private String reason;
    private Instant expiresAt;
    private String createdBy;
    private Instant createdAt;
}
