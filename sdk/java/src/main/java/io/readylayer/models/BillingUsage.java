package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Usage information for billing.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillingUsage {
    
    private Integer repositories;
    private Integer reviewsThisMonth;
    private Double llmBudgetUsed;
    private Double llmBudgetTotal;
}
