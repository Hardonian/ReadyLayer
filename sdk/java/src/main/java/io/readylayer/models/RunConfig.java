package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Run configuration options.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RunConfig {
    
    private Boolean skipReviewGuard;
    private Boolean skipTestEngine;
    private Boolean skipDocSync;
}
