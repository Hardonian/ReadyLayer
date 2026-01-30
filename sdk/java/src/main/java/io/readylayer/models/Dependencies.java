package io.readylayer.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Dependencies status for readiness check.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Dependencies {
    
    @JsonProperty("database")
    private Boolean database;
    
    @JsonProperty("redis")
    private Boolean redis;
    
    @JsonProperty("stripe")
    private Boolean stripe;
}
