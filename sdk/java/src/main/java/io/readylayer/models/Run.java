package io.readylayer.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

/**
 * Test run information.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Run {
    
    private String id;
    private String correlationId;
    private RunStatus status;
    private RunConclusion conclusion;
    private String reviewGuardStatus;
    private String testEngineStatus;
    private String docSyncStatus;
    private ReviewGuardResult reviewGuardResult;
    private TestEngineResult testEngineResult;
    private DocSyncResult docSyncResult;
    private Boolean aiTouchedDetected;
    private List<AiTouchedFile> aiTouchedFiles;
    private Boolean gatesPassed;
    private List<FailedGate> gatesFailed;
    private Instant startedAt;
    private Instant completedAt;
    private Instant reviewGuardStartedAt;
    private Instant reviewGuardCompletedAt;
    private Instant testEngineStartedAt;
    private Instant testEngineCompletedAt;
    private Instant docSyncStartedAt;
    private Instant docSyncCompletedAt;
}
