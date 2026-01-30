package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response containing a list of repositories.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepositoryListResponse {
    
    private List<Repository> repositories;
    private Pagination pagination;
}
