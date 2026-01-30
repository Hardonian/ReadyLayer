package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * File to review.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewFile {
    
    private String path;
    private String content;
    private String beforeContent;
}
