package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response containing a list of evidence bundles.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvidenceListResponse {
    
    private List<EvidenceBundle> bundles;
    private Pagination pagination;
}
