package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Organization information.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Organization {
    
    private String id;
    private String name;
    private String slug;
}
