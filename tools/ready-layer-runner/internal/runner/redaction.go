package runner

import "strings"

type Redaction struct {
	Patterns []string
	Paths    []string
}

func ApplyRedaction(input string, redaction Redaction) string {
	output := input
	for _, pattern := range redaction.Patterns {
		if pattern == "" {
			continue
		}
		output = strings.ReplaceAll(output, pattern, "[REDACTED]")
	}
	for _, path := range redaction.Paths {
		if path == "" {
			continue
		}
		output = strings.ReplaceAll(output, path, "[REDACTED_PATH]")
	}
	return output
}
