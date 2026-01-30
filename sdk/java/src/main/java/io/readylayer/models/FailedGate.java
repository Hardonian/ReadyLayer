package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Failed gate information.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FailedGate {
    
    private String gate;
    private String reason;
}
