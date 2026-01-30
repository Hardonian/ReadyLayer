package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response containing a list of reviews.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewListResponse {
    
    private List<Review> data;
    private Pagination pagination;
}
