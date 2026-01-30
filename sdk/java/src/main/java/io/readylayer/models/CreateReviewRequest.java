package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request to create a code review.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateReviewRequest {
    
    private String repositoryId;
    private Object prNumber;
    private String prSha;
    private String prTitle;
    private String diff;
    private List<ReviewFile> files;
    private ReviewConfig config;
}
