package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request to create a sandbox run.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSandboxRunRequest {
    
    private String sandboxId;
    private List<ReviewFile> files;
    private RunConfig config;
}
