package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Options for listing resources.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ListOptions {
    
    private String organizationId;
    private String repositoryId;
    private Integer prNumber;
    private String reviewId;
    private String select;
    private PaginationParams pagination;
    
    /**
     * Get effective pagination params.
     */
    public PaginationParams getEffectivePagination() {
        return pagination != null ? pagination : PaginationParams.builder().build();
    }
}
