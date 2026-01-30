package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Coverage metrics for test engine.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Coverage {
    
    private Double lines;
    private Double branches;
    private Double functions;
}
