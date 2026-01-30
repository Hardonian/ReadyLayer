package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response containing billing tier and usage.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillingTierResponse {
    
    private BillingTier tier;
    private BillingUsage usage;
}
