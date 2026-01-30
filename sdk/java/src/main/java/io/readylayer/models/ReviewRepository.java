package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Repository reference in review.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewRepository {
    
    private String id;
    private String name;
    private String fullName;
    private String organizationId;
}
