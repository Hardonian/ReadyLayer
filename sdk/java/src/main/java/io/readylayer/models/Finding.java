package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Code review finding.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Finding {
    
    private String id;
    private String ruleId;
    private String title;
    private String description;
    private FindingSeverity severity;
    private FindingStatus status;
    private String file;
    private Integer line;
    private Double confidence;
    private DetectedBy detectedBy;
    private String remediation;
    private Instant createdAt;
    private Instant updatedAt;
    private String modelId;
    private String modelEpoch;
    private Double varianceScore;
    private java.util.Map<String, Object> metadata;
}
