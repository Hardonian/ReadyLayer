package runner

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/readylayer/ready-layer-runner/internal/config"
)

const (
	SchemaVersion = "1.0.0"
)

type Runner struct {
	ToolVersion string
}

type RunResult struct {
	Output     RunnerOutput
	OutputPath string
}

func (r Runner) Run(input *config.RunnerInput, outputPath string) (*RunResult, error) {
	start := time.Now()

	outputDir := input.OutputDir
	if err := ensureOutputDirs(outputDir); err != nil {
		return nil, err
	}

	checks := make([]config.CheckSpec, len(input.Checks))
	copy(checks, input.Checks)
	sort.Slice(checks, func(i, j int) bool {
		if checks[i].Name == checks[j].Name {
			return checks[i].Category < checks[j].Category
		}
		return checks[i].Name < checks[j].Name
	})

	changedFiles := []string{}
	gitErr := error(nil)
	if files, err := ChangedFiles(input.RepoPath, input.DiffBase, input.DiffHead); err == nil {
		changedFiles = files
	} else {
		gitErr = err
	}
	repoError := gitErr != nil

	results := runChecks(input, checks, outputDir)

	summary := summarize(results)
	if repoError {
		summary.Pass = false
	}
	summary.DurationSec = time.Since(start).Seconds()

	output := RunnerOutput{
		SchemaVersion: SchemaVersion,
		ToolVersion:   r.ToolVersion,
		Summary:       summary,
		ChangedFiles:  changedFiles,
		CheckResults:  results,
		EvidenceManifest: EvidenceManifest{
			InputHashes:  SortedMap{},
			OutputHashes: SortedMap{},
		},
		ErrorClassification: classifyError(summary, results, repoError),
	}

	if outputPath == "" {
		outputPath = filepath.Join(outputDir, "runner_output.json")
	}

	if err := writeOutput(outputPath, &output, input); err != nil {
		return nil, err
	}

	return &RunResult{Output: output, OutputPath: outputPath}, nil
}

func ensureOutputDirs(outputDir string) error {
	paths := []string{
		outputDir,
		filepath.Join(outputDir, "evidence"),
		filepath.Join(outputDir, "evidence", "logs"),
		filepath.Join(outputDir, "evidence", "artifacts"),
	}
	for _, path := range paths {
		if err := os.MkdirAll(path, 0o755); err != nil {
			return fmt.Errorf("create output dir %s: %w", path, err)
		}
	}
	return nil
}

func runChecks(input *config.RunnerInput, checks []config.CheckSpec, outputDir string) []CheckResult {
	results := make([]CheckResult, len(checks))
	redaction := Redaction{Patterns: input.Redaction.Patterns, Paths: input.Redaction.Paths}

	workerCount := runtime.NumCPU()
	if workerCount < 1 {
		workerCount = 1
	}
	if workerCount > len(checks) {
		workerCount = len(checks)
	}

	jobs := make(chan int)
	var wg sync.WaitGroup

	for i := 0; i < workerCount; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for index := range jobs {
				check := checks[index]
				results[index] = runSingleCheck(input.RepoPath, outputDir, index, check, redaction)
			}
		}()
	}

	for i := range checks {
		jobs <- i
	}
	close(jobs)
	wg.Wait()

	return results
}

func runSingleCheck(repoPath, outputDir string, index int, check config.CheckSpec, redaction Redaction) CheckResult {
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(check.TimeoutSeconds*float64(time.Second)))
	defer cancel()

	result := RunCommand(ctx, check.Command, repoPath)
	stdout := ApplyRedaction(result.Stdout, redaction)
	stderr := ApplyRedaction(result.Stderr, redaction)
	stdoutPath := filepath.Join("evidence", "logs", fmt.Sprintf("%02d-%s.stdout.log", index+1, sanitizeName(check.Name)))
	stderrPath := filepath.Join("evidence", "logs", fmt.Sprintf("%02d-%s.stderr.log", index+1, sanitizeName(check.Name)))

	stdoutErr := writeLog(filepath.Join(outputDir, stdoutPath), stdout)
	stderrErr := writeLog(filepath.Join(outputDir, stderrPath), stderr)

	status := "pass"
	if result.TimedOut {
		status = "timeout"
	} else if result.RunError != nil {
		if check.AllowFailure {
			status = "pass"
		} else {
			status = "fail"
		}
	} else if stdoutErr != nil || stderrErr != nil {
		status = "error"
	}

	return CheckResult{
		Name:        check.Name,
		Category:    check.Category,
		Status:      status,
		ExitCode:    result.ExitCode,
		DurationSec: result.Duration.Seconds(),
		StdoutPath:  stdoutPath,
		StderrPath:  stderrPath,
		Artifacts:   []string{},
	}
}

func writeLog(path string, content string) error {
	return os.WriteFile(path, []byte(content), 0o644)
}

func summarize(results []CheckResult) Summary {
	summary := Summary{TotalChecks: len(results)}
	for _, result := range results {
		if result.Status == "pass" {
			summary.PassedChecks++
		} else {
			summary.FailedChecks++
		}
	}
	summary.Pass = summary.FailedChecks == 0
	return summary
}

func classifyError(summary Summary, results []CheckResult, repoError bool) string {
	if repoError {
		return "repo_error"
	}
	for _, result := range results {
		if result.Status == "error" {
			return "tool_error"
		}
	}
	if !summary.Pass {
		return "user_error"
	}
	return "user_error"
}

func writeOutput(path string, output *RunnerOutput, input *config.RunnerInput) error {
	inputJSON, err := json.Marshal(input)
	if err != nil {
		return fmt.Errorf("marshal input: %w", err)
	}
	output.EvidenceManifest.InputHashes = SortedMap{
		"config_json": HashBytes(inputJSON),
		"diff_refs":   HashBytes([]byte(fmt.Sprintf("%s:%s", input.DiffBase, input.DiffHead))),
	}

	logDir := filepath.Join(input.OutputDir, "evidence", "logs")
	if err := hashDirectory(logDir, input.OutputDir, output.EvidenceManifest.OutputHashes); err != nil {
		return fmt.Errorf("hash logs: %w", err)
	}
	artifactDir := filepath.Join(input.OutputDir, "evidence", "artifacts")
	if err := hashDirectory(artifactDir, input.OutputDir, output.EvidenceManifest.OutputHashes); err != nil {
		return fmt.Errorf("hash artifacts: %w", err)
	}

	payloadWithoutOutputHash, err := json.MarshalIndent(output, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal output: %w", err)
	}
	output.EvidenceManifest.OutputHashes[relativePath(input.OutputDir, path)] = HashBytes(payloadWithoutOutputHash)

	finalPayload, err := json.MarshalIndent(output, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal output: %w", err)
	}
	if err := os.WriteFile(path, finalPayload, 0o644); err != nil {
		return fmt.Errorf("write output: %w", err)
	}

	return nil
}

func hashDirectory(dir string, root string, out map[string]string) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return err
	}

	paths := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		paths = append(paths, filepath.Join(dir, entry.Name()))
	}

	sort.Strings(paths)
	for _, path := range paths {
		hash, err := HashFile(path)
		if err != nil {
			return err
		}
		out[relativePath(root, path)] = hash
	}
	return nil
}

func sanitizeName(value string) string {
	value = strings.ToLower(value)
	value = strings.ReplaceAll(value, " ", "-")
	value = strings.ReplaceAll(value, "/", "-")
	value = strings.ReplaceAll(value, "\\", "-")
	value = strings.Trim(value, "-")
	if value == "" {
		return "check"
	}
	return value
}

func relativePath(root, path string) string {
	rel, err := filepath.Rel(root, path)
	if err != nil {
		return path
	}
	return filepath.ToSlash(rel)
}
