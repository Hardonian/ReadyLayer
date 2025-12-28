# ReadyLayer — AI Code Readiness Platform

**AI writes the code. ReadyLayer makes it production-ready.**

ReadyLayer automatically reviews, tests, and documents AI-generated code before merge. Catch security vulnerabilities, enforce test coverage, and keep API docs in sync—all without slowing down development.

## Overview

ReadyLayer is a mandatory readiness layer for AI-generated code. It sits after AI code generation and before merge, ensuring production readiness through three core modules:

1. **Review Guard** — AI-aware code review for security, quality, and style
2. **Test Engine** — Automatic test generation and coverage enforcement
3. **Doc Sync** — OpenAPI generation and documentation sync

## Project Structure

This repository contains the canonical product specifications, architecture, and delivery plans for ReadyLayer.

### 📁 Product (`/product`)
- **messaging.md** — Product positioning, tagline, value pillars
- **personas.md** — User personas (Staff Engineer, Engineering Manager, DevOps)
- **pricing.md** — Pricing tiers (Starter, Growth, Scale)

### 🏗️ Architecture (`/architecture`)
- **overview.md** — High-level system architecture and services
- **services.md** — Service responsibilities and ownership
- **events-and-security.md** — Event model and security architecture

### 🔌 Integrations (`/integrations`)
- **github.md** — GitHub integration (webhooks, API, installation)
- **git-hosts.md** — GitLab, Bitbucket, Azure DevOps integrations
- **ide.md** — VS Code and JetBrains IDE extensions
- **slack-jira.md** — Slack and Jira integrations
- **ci.md** — CI/CD integrations (GitHub Actions, GitLab CI)

### 📋 Specs (`/specs`)
- **review-guard.md** — Review Guard implementation specification
- **test-engine.md** — Test Engine implementation specification
- **doc-sync.md** — Doc Sync implementation specification

### 👨‍💻 Developer Experience (`/dx`)
- **api-spec.md** — REST API specification and endpoints
- **config-examples.md** — Configuration examples (`.readylayer.yml`)
- **ci-examples.md** — CI/CD integration examples (copy-paste ready)

### 🚀 Go-to-Market (`/gtm`)
- **landing-copy.md** — Landing page copy and messaging
- **github-app.md** — GitHub App listing and description
- **marketplace-snippets.md** — VS Code, JetBrains, GitHub marketplace listings
- **onboarding-emails.md** — Onboarding email sequence (Day 0, 1, 3, 7, 13, 14+)

### 📅 Delivery (`/delivery`)
- **roadmap-4-weeks.md** — 4-week execution roadmap with epics
- **jira-backlog.md** — Jira-ready backlog with stories and acceptance criteria

## Quick Start

### For Product Managers
Start with `/product/messaging.md` to understand the product positioning and value proposition.

### For Engineers
Start with `/architecture/overview.md` to understand the system architecture, then dive into `/specs/` for implementation details.

### For Integrations
See `/integrations/` for integration-specific documentation (GitHub, GitLab, VS Code, etc.).

### For Developers Using ReadyLayer
See `/dx/config-examples.md` for configuration examples and `/dx/ci-examples.md` for CI/CD integration.

## Core Principles

1. **Meet teams where they already work** — PRs, CI, IDEs, Slack, Jira
2. **No standalone UI unless necessary** — Config, audit, and billing only
3. **Security first** — Least-privilege OAuth, no code retention by default
4. **Composable services** — Clear separation between ingestion, analysis, outputs
5. **Production over perfection** — Prefer shippable v1 over speculative elegance

## Technology Stack

- **Runtime:** TypeScript, Node.js 20+
- **Framework:** Fastify (or Express)
- **Database:** PostgreSQL 15+
- **Cache/Queue:** Redis 7+
- **Vector Store:** Pinecone or Weaviate (for code context)
- **LLM:** OpenAI API, Anthropic API
- **Infrastructure:** Docker, Kubernetes, GitHub Actions

## Documentation

- **API Documentation:** See `/dx/api-spec.md`
- **Configuration:** See `/dx/config-examples.md`
- **CI/CD Integration:** See `/dx/ci-examples.md`
- **Architecture:** See `/architecture/`

## Support

- **Documentation:** https://docs.readylayer.com
- **Support:** support@readylayer.com
- **Status:** https://status.readylayer.com

## License

Proprietary — ReadyLayer Platform Specifications

---

**Note:** This repository contains product specifications and architecture documentation. Implementation code will be in separate repositories.
