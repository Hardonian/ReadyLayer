package config

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"sort"
	"strings"
)

type RunnerInput struct {
	RepoPath  string      `json:"repo_path"`
	DiffBase  string      `json:"diff_base,omitempty"`
	DiffHead  string      `json:"diff_head,omitempty"`
	Checks    []CheckSpec `json:"checks"`
	OutputDir string      `json:"output_dir"`
	Redaction Redaction   `json:"redaction,omitempty"`
	Mode      string      `json:"mode"`
}

type CheckSpec struct {
	Name           string  `json:"name"`
	Category       string  `json:"category"`
	Command        string  `json:"command"`
	TimeoutSeconds float64 `json:"timeout_seconds"`
	AllowFailure   bool    `json:"allow_failure"`
}

type Redaction struct {
	Patterns []string `json:"patterns,omitempty"`
	Paths    []string `json:"paths,omitempty"`
}

var validCategories = map[string]struct{}{
	"review_guard": {},
	"test_engine":  {},
	"doc_sync":     {},
	"custom":       {},
}

var validModes = map[string]struct{}{
	"local": {},
	"ci":    {},
}

func LoadConfig(path string, useStdin bool) (*RunnerInput, error) {
	var reader io.Reader
	if useStdin {
		reader = os.Stdin
	} else if path != "" {
		file, err := os.Open(path)
		if err != nil {
			return nil, fmt.Errorf("open config: %w", err)
		}
		defer file.Close()
		reader = file
	} else {
		return nil, errors.New("config path or --stdin required")
	}

	decoder := json.NewDecoder(reader)
	decoder.DisallowUnknownFields()
	var input RunnerInput
	if err := decoder.Decode(&input); err != nil {
		return nil, fmt.Errorf("decode config: %w", err)
	}

	return NormalizeAndValidate(&input)
}

func NormalizeAndValidate(input *RunnerInput) (*RunnerInput, error) {
	if strings.TrimSpace(input.RepoPath) == "" {
		return nil, errors.New("repo_path is required")
	}
	if strings.TrimSpace(input.OutputDir) == "" {
		return nil, errors.New("output_dir is required")
	}
	if len(input.Checks) == 0 {
		return nil, errors.New("checks must include at least one check")
	}
	if _, ok := validModes[input.Mode]; !ok {
		return nil, fmt.Errorf("mode must be one of: local, ci")
	}

	for i := range input.Checks {
		check := &input.Checks[i]
		check.Name = strings.TrimSpace(check.Name)
		check.Category = strings.TrimSpace(check.Category)
		check.Command = strings.TrimSpace(check.Command)
		if check.Name == "" {
			return nil, fmt.Errorf("checks[%d].name is required", i)
		}
		if check.Command == "" {
			return nil, fmt.Errorf("checks[%d].command is required", i)
		}
		if _, ok := validCategories[check.Category]; !ok {
			return nil, fmt.Errorf("checks[%d].category must be one of review_guard, test_engine, doc_sync, custom", i)
		}
		if check.TimeoutSeconds <= 0 {
			check.TimeoutSeconds = 300
		}
	}

	sort.Slice(input.Redaction.Patterns, func(i, j int) bool {
		return input.Redaction.Patterns[i] < input.Redaction.Patterns[j]
	})
	sort.Slice(input.Redaction.Paths, func(i, j int) bool {
		return input.Redaction.Paths[i] < input.Redaction.Paths[j]
	})

	return input, nil
}
