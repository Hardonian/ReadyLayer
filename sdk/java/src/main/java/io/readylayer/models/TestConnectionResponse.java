package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response from testing a repository connection.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestConnectionResponse {
    
    private Boolean success;
    private String message;
    private Object details;
}
