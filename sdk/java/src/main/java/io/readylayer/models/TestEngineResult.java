package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Test engine result from a run.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestEngineResult {
    
    private Integer testsGenerated;
    private Coverage coverage;
    private Boolean meetsThreshold;
}
