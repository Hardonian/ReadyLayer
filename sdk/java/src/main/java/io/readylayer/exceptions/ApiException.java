package io.readylayer.exceptions;

/**
 * Exception thrown when the API returns an unexpected error or when the service is unavailable.
 */
public class ApiException extends ReadyLayerException {
    
    public ApiException(String message) {
        super(message);
    }
    
    public ApiException(String message, Throwable cause) {
        super(message, cause);
    }
    
    public ApiException(String message, Integer statusCode, String errorCode) {
        super(message, statusCode, errorCode);
    }
    
    public ApiException(String message, Integer statusCode, String errorCode, Throwable cause) {
        super(message, statusCode, errorCode, cause);
    }
}
