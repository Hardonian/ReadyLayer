package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/readylayer/ready-layer-runner/internal/config"
	"github.com/readylayer/ready-layer-runner/internal/runner"
)

var version = "dev"

func main() {
	configPath := flag.String("config", "", "Path to runner config JSON")
	outputPath := flag.String("output", "", "Path to write runner_output.json")
	useStdin := flag.Bool("stdin", false, "Read config JSON from stdin")
	flag.Parse()

	input, err := config.LoadConfig(*configPath, *useStdin)
	if err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		os.Exit(2)
	}

	r := runner.Runner{ToolVersion: version}
	result, err := r.Run(input, *outputPath)
	if err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		os.Exit(1)
	}

	fmt.Printf("Runner output written to %s\n", result.OutputPath)
	if !result.Output.Summary.Pass {
		os.Exit(3)
	}
}
