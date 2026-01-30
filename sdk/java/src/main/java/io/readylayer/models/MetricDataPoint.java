package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Metrics data point.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetricDataPoint {
    
    private Instant timestamp;
    private Double value;
}
