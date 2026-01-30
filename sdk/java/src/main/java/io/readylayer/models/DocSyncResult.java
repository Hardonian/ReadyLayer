package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Doc sync result from a run.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocSyncResult {
    
    private String docId;
    private Boolean driftDetected;
    private Integer missingEndpoints;
    private Integer changedEndpoints;
}
