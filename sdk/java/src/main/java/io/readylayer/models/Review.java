package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

/**
 * Code review result.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Review {
    
    private String id;
    private String repositoryId;
    private Integer prNumber;
    private String prSha;
    private String prTitle;
    private ReviewStatus status;
    private Boolean isBlocked;
    private String blockedReason;
    private Map<String, Object> result;
    private Integer issuesFound;
    private ReviewSummary summary;
    private Instant startedAt;
    private Instant completedAt;
    private Instant createdAt;
    private Instant updatedAt;
    private ReviewRepository repository;
}
