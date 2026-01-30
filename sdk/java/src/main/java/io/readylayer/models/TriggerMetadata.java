package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Trigger metadata for a run.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TriggerMetadata {
    
    private Integer prNumber;
    private String prSha;
    private String prTitle;
    private String prBody;
    private String diff;
    private List<ReviewFile> files;
    private String userId;
}
