package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response containing a list of API keys.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiKeyListResponse {
    
    private List<ApiKey> keys;
}
