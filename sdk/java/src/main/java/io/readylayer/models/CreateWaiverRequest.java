package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Request to create a waiver.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateWaiverRequest {
    
    private String organizationId;
    private String repositoryId;
    private String ruleId;
    private String reason;
    private Instant expiresAt;
}
