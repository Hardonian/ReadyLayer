package runner

import (
	"bytes"
	"fmt"
	"os/exec"
	"sort"
	"strings"
)

func ChangedFiles(repoPath, diffBase, diffHead string) ([]string, error) {
	args := []string{"-C", repoPath, "diff", "--name-only"}
	if diffBase != "" && diffHead != "" {
		args = append(args, diffBase, diffHead)
	} else if diffBase != "" {
		args = append(args, diffBase, "HEAD")
	} else if diffHead != "" {
		args = append(args, "HEAD", diffHead)
	} else {
		args = append(args, "HEAD")
	}

	cmd := exec.Command("git", args...)
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("git diff failed: %w (%s)", err, strings.TrimSpace(stderr.String()))
	}

	lines := strings.Split(strings.TrimSpace(stdout.String()), "\n")
	files := make([]string, 0, len(lines))
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}
		files = append(files, trimmed)
	}

	sort.Strings(files)
	return files, nil
}
