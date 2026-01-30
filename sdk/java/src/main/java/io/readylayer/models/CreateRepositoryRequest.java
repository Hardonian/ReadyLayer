package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request to create a new repository.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateRepositoryRequest {
    
    private String organizationId;
    private String name;
    private String fullName;
    private RepositoryProvider provider;
    private String providerId;
    private String url;
    private String defaultBranch;
}
