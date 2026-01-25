package runner

import (
	"bytes"
	"encoding/json"
	"sort"
)

type Summary struct {
	Pass         bool    `json:"pass"`
	TotalChecks  int     `json:"total_checks"`
	PassedChecks int     `json:"passed_checks"`
	FailedChecks int     `json:"failed_checks"`
	DurationSec  float64 `json:"duration_seconds"`
}

type CheckResult struct {
	Name        string   `json:"name"`
	Category    string   `json:"category"`
	Status      string   `json:"status"`
	ExitCode    int      `json:"exit_code"`
	DurationSec float64  `json:"duration_seconds"`
	StdoutPath  string   `json:"stdout_path"`
	StderrPath  string   `json:"stderr_path"`
	Artifacts   []string `json:"artifacts"`
}

type EvidenceManifest struct {
	InputHashes  SortedMap `json:"input_hashes"`
	OutputHashes SortedMap `json:"output_hashes"`
}

type RunnerOutput struct {
	SchemaVersion       string           `json:"schema_version"`
	ToolVersion         string           `json:"tool_version"`
	Summary             Summary          `json:"summary"`
	ChangedFiles        []string         `json:"changed_files"`
	CheckResults        []CheckResult    `json:"check_results"`
	EvidenceManifest    EvidenceManifest `json:"evidence_manifest"`
	ErrorClassification string           `json:"error_classification"`
}

type SortedMap map[string]string

func (s SortedMap) MarshalJSON() ([]byte, error) {
	keys := make([]string, 0, len(s))
	for key := range s {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	buffer := &bytes.Buffer{}
	buffer.WriteString("{")
	for i, key := range keys {
		value, err := json.Marshal(s[key])
		if err != nil {
			return nil, err
		}
		keyJSON, err := json.Marshal(key)
		if err != nil {
			return nil, err
		}
		if i > 0 {
			buffer.WriteString(",")
		}
		buffer.Write(keyJSON)
		buffer.WriteString(":")
		buffer.Write(value)
	}
	buffer.WriteString("}")
	return buffer.Bytes(), nil
}
