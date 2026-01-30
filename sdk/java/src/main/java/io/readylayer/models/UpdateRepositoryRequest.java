package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request to update a repository.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateRepositoryRequest {
    
    private String name;
    private Boolean enabled;
    private String defaultBranch;
}
