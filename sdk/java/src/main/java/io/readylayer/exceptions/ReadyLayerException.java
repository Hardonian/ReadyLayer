package io.readylayer.exceptions;

/**
 * Base exception for all ReadyLayer API errors.
 */
public class ReadyLayerException extends RuntimeException {
    
    private final Integer statusCode;
    private final String errorCode;
    
    public ReadyLayerException(String message) {
        super(message);
        this.statusCode = null;
        this.errorCode = null;
    }
    
    public ReadyLayerException(String message, Throwable cause) {
        super(message, cause);
        this.statusCode = null;
        this.errorCode = null;
    }
    
    public ReadyLayerException(String message, Integer statusCode, String errorCode) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
    }
    
    public ReadyLayerException(String message, Integer statusCode, String errorCode, Throwable cause) {
        super(message, cause);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
    }
    
    /**
     * Get the HTTP status code associated with this error, if any.
     * @return the status code, or null if not applicable
     */
    public Integer getStatusCode() {
        return statusCode;
    }
    
    /**
     * Get the API error code associated with this error, if any.
     * @return the error code, or null if not provided
     */
    public String getErrorCode() {
        return errorCode;
    }
}
