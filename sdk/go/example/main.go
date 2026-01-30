// Package main provides an example of using the ReadyLayer Go SDK.
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/readylayer/sdk-go"
)

func main() {
	apiKey := os.Getenv("READYLAYER_API_KEY")
	if apiKey == "" {
		log.Fatal("READYLAYER_API_KEY environment variable is required")
	}

	// Create client
	client := readylayer.NewClient(apiKey)

	// Use context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Check health
	health, err := client.Health.GetHealth(ctx)
	if err != nil {
		log.Fatalf("Health check failed: %v", err)
	}
	fmt.Printf("API Health: %s (version: %s)\n", health.Status, health.Version)

	// List repositories
	repos, err := client.Repositories.List(ctx, &readylayer.RepositoryListOptions{
		ListOptions: readylayer.ListOptions{
			Limit: 10,
		},
	})
	if err != nil {
		log.Fatalf("Failed to list repositories: %v", err)
	}

	fmt.Printf("Found %d repositories:\n", len(repos.Repositories))
	for _, repo := range repos.Repositories {
		fmt.Printf("  - %s (%s)\n", repo.Name, repo.Provider)
	}
}
