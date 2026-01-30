package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Evidence bundle containing review findings.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvidenceBundle {
    
    private String id;
    private String reviewId;
    private List<Finding> findings;
    private Map<String, Object> metadata;
    private Instant createdAt;
}
