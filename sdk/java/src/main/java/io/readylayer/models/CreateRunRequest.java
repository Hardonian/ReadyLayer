package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request to create a test run.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateRunRequest {
    
    private String repositoryId;
    private String sandboxId;
    private String trigger;
    private TriggerMetadata triggerMetadata;
    private RunConfig config;
}
