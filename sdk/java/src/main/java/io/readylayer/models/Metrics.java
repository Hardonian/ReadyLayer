package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Metrics container.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Metrics {
    
    private List<MetricDataPoint> reviews;
    private List<MetricDataPoint> findings;
    private List<MetricDataPoint> gatesPassed;
    private List<MetricDataPoint> gatesFailed;
}
