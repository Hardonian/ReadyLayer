package io.readylayer.exceptions;

/**
 * Exception thrown when authentication fails (HTTP 401).
 */
public class AuthenticationException extends ReadyLayerException {
    
    public AuthenticationException(String message) {
        super(message, 401, "unauthorized");
    }
    
    public AuthenticationException(String message, Throwable cause) {
        super(message, 401, "unauthorized", cause);
    }
}
