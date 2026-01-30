package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response containing a list of waivers.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WaiverListResponse {
    
    private List<Waiver> waivers;
    private Pagination pagination;
}
