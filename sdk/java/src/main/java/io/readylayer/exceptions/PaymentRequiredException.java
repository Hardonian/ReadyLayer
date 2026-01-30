package io.readylayer.exceptions;

/**
 * Exception thrown when payment is required (HTTP 402).
 */
public class PaymentRequiredException extends ReadyLayerException {
    
    public PaymentRequiredException(String message) {
        super(message, 402, "payment_required");
    }
    
    public PaymentRequiredException(String message, Throwable cause) {
        super(message, 402, "payment_required", cause);
    }
}
