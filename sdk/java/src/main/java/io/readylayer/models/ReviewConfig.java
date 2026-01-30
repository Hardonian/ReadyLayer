package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Review configuration options.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewConfig {
    
    private Boolean failOnCritical;
    private Boolean failOnHigh;
    private Boolean failOnMedium;
    private Boolean failOnLow;
    private List<String> enabledRules;
    private List<String> disabledRules;
    private List<String> excludedPaths;
}
