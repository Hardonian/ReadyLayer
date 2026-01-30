package io.readylayer.exceptions;

/**
 * Exception thrown when request validation fails (HTTP 400).
 */
public class ValidationException extends ReadyLayerException {
    
    public ValidationException(String message) {
        super(message, 400, "bad_request");
    }
    
    public ValidationException(String message, Throwable cause) {
        super(message, 400, "bad_request", cause);
    }
}
