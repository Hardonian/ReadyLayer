package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Policy validation error entry.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PolicyValidationError {
    
    private String ruleId;
    private String error;
}
