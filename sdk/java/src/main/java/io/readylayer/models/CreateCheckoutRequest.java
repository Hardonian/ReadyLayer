package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request to create a checkout session.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCheckoutRequest {
    
    private String tier;
    private String successUrl;
    private String cancelUrl;
}
