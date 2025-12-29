# ReadyLayer — Gamified Code Review Platform

**Engineers verify AI code reviews on pull requests. Earn badges, streaks, and recognition for quality code reviews.**

ReadyLayer is a gamified code review platform that combines AI-powered code analysis with human verification. Engineers review AI-generated code on pull requests, verify findings, and earn rewards through badges, streaks, and leaderboards.

## Overview

ReadyLayer gamifies the code review process for AI-generated code:

1. **AI Code Review** — Automated analysis detects security issues, quality problems, and suggests improvements
2. **Human Verification** — Engineers review and verify AI findings, ensuring accuracy and building team knowledge
3. **Gamification** — Earn badges, maintain streaks, and climb leaderboards for exceptional code review work
4. **Social Features** — Give kudos, follow teammates, and collaborate on code reviews

## ⚠️ Current Status

**⚠️ IMPORTANT: This repository contains a gamification/social platform implementation, NOT the ReadyLayer product described in the specifications.**

**What exists:**
- ✅ Next.js frontend application
- ✅ Prisma database schema (gamification platform)
- ✅ 30+ API routes for gamification features
- ✅ Database migrations (Supabase SQL)
- ✅ Product specifications (`/specs`) - for ReadyLayer (not implemented)
- ✅ Architecture documentation (`/architecture`)
- ✅ Integration specifications (`/integrations`)

**What does not exist:**
- ❌ ReadyLayer core features (Review Guard, Test Engine, Doc Sync)
- ❌ Authentication system (no auth middleware)
- ❌ Authorization system (no permission checks)
- ❌ Billing system
- ❌ Rate limiting
- ❌ Production-ready error handling
- ❌ Observability/monitoring

**⚠️ CRITICAL: This system is NOT production-ready. See `/LAUNCH-READINESS-AUDIT.md` for detailed security and readiness issues.**

**Reality Audit:** See `/REALITY-AUDIT.md` for gap analysis between specifications and enforceable reality.

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
- **compatibility-portability-composability.md** — Adapter patterns, normalized APIs, webhooks, WebSockets

### 🔌 Integrations (`/integrations`)
- **github.md** — GitHub integration (webhooks, API, installation)
- **git-hosts.md** — GitLab, Bitbucket, Azure DevOps integrations
- **ide.md** — VS Code and JetBrains IDE extensions
- **slack-jira.md** — Slack and Jira integrations
- **ci.md** — CI/CD integrations (GitHub Actions, GitLab CI)

### 📋 Specs (`/specs`)
- **review-guard.md** — Review Guard implementation specification (original)
- **review-guard-HARDENED.md** — Review Guard hardened specification (enforcement-first)
- **test-engine.md** — Test Engine implementation specification (original)
- **test-engine-HARDENED.md** — Test Engine hardened specification (enforcement-first)
- **doc-sync.md** — Doc Sync implementation specification (original)
- **doc-sync-HARDENED.md** — Doc Sync hardened specification (enforcement-first)

### 👨‍💻 Developer Experience (`/dx`)
- **api-spec.md** — REST API specification and endpoints
- **config-examples.md** — Configuration examples (`.readylayer.yml`)
- **ci-examples.md** — CI/CD integration examples (copy-paste ready)
- **frontend-ux-improvements.md** — Comprehensive UX/UI improvement specification
- **ide-ux-implementation.md** — Detailed IDE extension implementation guide
- **ux-improvements-summary.md** — Quick reference guide for UX improvements
- **ux-expansion-strategy.md** — Strategic expansion across platforms and lifecycle stages
- **ux-reflection-and-expansion.md** — Reflection and strategic expansion framework
- **ux-expansion-tier1-typesafe.md** — Tier 1 type-safe implementations (GitLab, Slack, CLI, Browser Extension)
- **ux-expansion-tier2-typesafe.md** — Tier 2 type-safe implementations (CI/CD, Jira, Bitbucket, Azure DevOps)
- **ux-expansion-tier3-typesafe.md** — Tier 3 type-safe implementations (Deployment Platforms, Monitoring Tools)
- **ux-expansion-complete-typesafe.md** — Complete overview of all type-safe expansions
- **adapter-pattern-guide.md** — Developer guide for adapter pattern usage

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

## Enforcement-First Principles

ReadyLayer follows enforcement-first principles:

1. **Rules > AI:** Deterministic rules always override AI judgment
2. **Enforcement > Insight:** Blocking is default, warnings are exception
3. **Safety > Convenience:** Fail-secure defaults, explicit overrides required
4. **Explicit > Silent:** All failures are explicit, no silent degradation

See hardened specifications (`/specs/*-HARDENED.md`) for enforcement-first implementations.

## Reality Audit

See `/REALITY-AUDIT.md` for:
- Gap identification between specifications and enforceable reality
- Enforcement gaps, reliability gaps, trust gaps
- Required changes to achieve enforcement-first behavior

---

## 🚨 Launch Readiness

**Status:** ❌ **NOT PRODUCTION-READY**

See `/LAUNCH-READINESS-AUDIT.md` for comprehensive audit results.

**Critical Issues:**
- No authentication/authorization
- Unprotected API routes
- Security vulnerabilities
- Product mismatch (code vs README)

**⚠️ DO NOT DEPLOY** until critical security issues are resolved.
