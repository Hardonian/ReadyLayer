package io.readylayer.services;

import io.readylayer.ReadyLayerClient;
import io.readylayer.models.*;
import lombok.RequiredArgsConstructor;

import java.net.http.HttpRequest;

/**
 * Service for billing operations.
 */
@RequiredArgsConstructor
public class BillingService {
    
    private final ReadyLayerClient client;
    
    /**
     * Get current billing tier and usage.
     */
    public BillingTierResponse getTier(String organizationId) {
        StringBuilder path = new StringBuilder("/billing/tier");
        if (organizationId != null) {
            path.append("?organizationId=").append(organizationId);
        }
        
        HttpRequest request = client.requestBuilder(path.toString())
                .GET()
                .build();
        
        return client.execute(request, BillingTierResponse.class);
    }
    
    /**
     * Get current billing tier for default organization.
     */
    public BillingTierResponse getTier() {
        return getTier(null);
    }
    
    /**
     * Create a Stripe checkout session for subscription.
     */
    public CheckoutSessionResponse createCheckout(CreateCheckoutRequest request) {
        HttpRequest httpRequest = client.requestBuilder("/billing/checkout")
                .POST(HttpRequest.BodyPublishers.ofString(client.toJson(request)))
                .build();
        
        return client.execute(httpRequest, CheckoutSessionResponse.class);
    }
}
