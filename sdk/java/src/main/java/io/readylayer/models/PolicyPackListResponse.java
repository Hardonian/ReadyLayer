package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response containing a list of policy packs.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PolicyPackListResponse {
    
    private List<PolicyPack> policies;
    private Pagination pagination;
}
