package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

/**
 * API key information.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiKey {
    
    private String id;
    private String name;
    private String keyPreview;
    private List<ApiKeyScope> scopes;
    private Instant expiresAt;
    private Instant createdAt;
    private Instant lastUsedAt;
}
