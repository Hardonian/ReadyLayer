package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Review guard result from a run.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewGuardResult {
    
    private String reviewId;
    private Integer issuesFound;
    private Boolean isBlocked;
    private ReviewSummary summary;
}
