package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * AI touched file detection.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiTouchedFile {
    
    private String path;
    private Double confidence;
    private List<String> methods;
}
