package io.readylayer.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

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
