package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Pagination parameters for list operations.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaginationParams {
    
    public static final int DEFAULT_LIMIT = 20;
    public static final int MAX_LIMIT = 100;
    
    @Builder.Default
    private Integer limit = DEFAULT_LIMIT;
    
    @Builder.Default
    private Integer offset = 0;
    
    /**
     * Get the limit value, clamped to valid range.
     */
    public int getEffectiveLimit() {
        if (limit == null || limit < 1) {
            return DEFAULT_LIMIT;
        }
        return Math.min(limit, MAX_LIMIT);
    }
    
    /**
     * Get the offset value, ensuring it's non-negative.
     */
    public int getEffectiveOffset() {
        if (offset == null || offset < 0) {
            return 0;
        }
        return offset;
    }
}
