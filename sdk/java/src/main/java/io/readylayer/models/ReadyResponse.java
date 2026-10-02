package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Readiness check response from the API.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReadyResponse {
    
    private Boolean ready;
    private Dependencies dependencies;
}
