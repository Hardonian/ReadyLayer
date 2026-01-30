package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Summary of findings by severity.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewSummary {
    
    private Integer total;
    private Integer critical;
    private Integer high;
    private Integer medium;
    private Integer low;
}
