package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response containing a list of runs.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RunListResponse {
    
    private List<Run> data;
    private Pagination pagination;
}
