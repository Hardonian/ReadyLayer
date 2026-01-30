package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request to validate policy syntax.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidatePolicyRequest {
    
    private String source;
}
