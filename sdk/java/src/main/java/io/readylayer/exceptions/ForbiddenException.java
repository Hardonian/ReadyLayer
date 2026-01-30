package io.readylayer.exceptions;

/**
 * Exception thrown when the user lacks permission (HTTP 403).
 */
public class ForbiddenException extends ReadyLayerException {
    
    public ForbiddenException(String message) {
        super(message, 403, "forbidden");
    }
    
    public ForbiddenException(String message, Throwable cause) {
        super(message, 403, "forbidden", cause);
    }
}
