package io.readylayer.exceptions;

/**
 * Exception thrown when a resource is not found (HTTP 404).
 */
public class NotFoundException extends ReadyLayerException {
    
    private final String resourceType;
    private final String resourceId;
    
    public NotFoundException(String message) {
        super(message, 404, "not_found");
        this.resourceType = null;
        this.resourceId = null;
    }
    
    public NotFoundException(String resourceType, String resourceId) {
        super(String.format("%s not found: %s", resourceType, resourceId), 404, "not_found");
        this.resourceType = resourceType;
        this.resourceId = resourceId;
    }
    
    public NotFoundException(String message, Throwable cause) {
        super(message, 404, "not_found", cause);
        this.resourceType = null;
        this.resourceId = null;
    }
    
    public String getResourceType() {
        return resourceType;
    }
    
    public String getResourceId() {
        return resourceId;
    }
}
