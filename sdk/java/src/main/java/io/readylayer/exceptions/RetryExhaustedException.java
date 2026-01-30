package io.readylayer.exceptions;

/**
 * Exception thrown when the maximum number of retry attempts is exceeded.
 */
public class RetryExhaustedException extends ReadyLayerException {
    
    private final int attempts;
    private final Throwable lastError;
    
    public RetryExhaustedException(int attempts, Throwable lastError) {
        super(String.format("Retry exhausted after %d attempts: %s", attempts, lastError.getMessage()));
        this.attempts = attempts;
        this.lastError = lastError;
    }
    
    public int getAttempts() {
        return attempts;
    }
    
    public Throwable getLastError() {
        return lastError;
    }
}
