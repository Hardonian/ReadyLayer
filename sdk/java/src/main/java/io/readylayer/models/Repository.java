package io.readylayer.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Repository information.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Repository {
    
    private String id;
    private String name;
    private String fullName;
    private RepositoryProvider provider;
    private String url;
    private Boolean enabled;
    private Organization organization;
    private Instant createdAt;
    private Instant updatedAt;
}
