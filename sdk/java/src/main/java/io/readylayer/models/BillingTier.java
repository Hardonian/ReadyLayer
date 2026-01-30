package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Billing tier information.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillingTier {
    
    private BillingTierType tier;
    private String name;
    private List<String> features;
    private Map<String, Integer> limits;
}
