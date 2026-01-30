package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Pagination metadata for list responses.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Pagination {
    
    private Integer total;
    private Integer limit;
    private Integer offset;
    private Boolean hasMore;
}
