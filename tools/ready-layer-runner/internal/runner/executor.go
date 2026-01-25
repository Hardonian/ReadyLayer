package runner

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

type ExecResult struct {
	Stdout   string
	Stderr   string
	ExitCode int
	Duration time.Duration
	TimedOut bool
	RunError error
}

func RunCommand(ctx context.Context, command string, repoPath string) ExecResult {
	start := time.Now()
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.CommandContext(ctx, "cmd.exe", "/C", command)
	} else {
		cmd = exec.CommandContext(ctx, "sh", "-c", command)
	}
	cmd.Dir = repoPath

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	result := ExecResult{
		Stdout:   stdout.String(),
		Stderr:   stderr.String(),
		Duration: time.Since(start),
		ExitCode: 0,
		RunError: err,
	}

	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			result.TimedOut = true
			result.ExitCode = -1
			return result
		}
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			result.ExitCode = exitErr.ExitCode()
		} else {
			result.ExitCode = -1
		}
	}

	result.Stdout = strings.TrimSuffix(result.Stdout, "\n")
	result.Stderr = strings.TrimSuffix(result.Stderr, "\n")

	return result
}

func FormatCommandError(err error) string {
	if err == nil {
		return ""
	}
	return fmt.Sprintf("command error: %v", err)
}
