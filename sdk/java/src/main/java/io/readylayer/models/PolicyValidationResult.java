package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Result of policy validation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PolicyValidationResult {
    
    private Boolean valid;
    private String message;
    private List<PolicyValidationError> errors;
    private List<String> warnings;
}
