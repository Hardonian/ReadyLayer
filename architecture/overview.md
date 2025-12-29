# ReadyLayer — System Architecture Overview

## High-Level Architecture

ReadyLayer is built as a composable service architecture, not a monolith. Each service has clear ownership and responsibilities, enabling independent scaling, deployment, and maintenance.

**Core Principles:**
- **Compatibility:** Platform-agnostic core with adapter pattern for platform-specific integrations
- **Portability:** Stateless services, configuration-driven, Docker/Kubernetes ready
- **Composability:** Modular services, event-driven, plugin architecture

See `/architecture/compatibility-portability-composability.md` for detailed architecture patterns and adapter implementations.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  GitHub / GitLab / Bitbucket  │  VS Code / JetBrains  │  CI/CD  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Integration Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   GitHub     │  │   GitLab     │  │   Bitbucket  │         │
│  │   Adapter    │  │   Adapter    │  │   Adapter    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              API Service (Fastify/Express)                │  │
│  │  - Authentication & Authorization                         │  │
│  │  - Request routing                                       │  │
│  │  - Rate limiting                                         │  │
│  │  - Request validation                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Review     │    │     Test     │    │     Doc      │
│   Guard      │    │    Engine    │    │     Sync     │
│   Service    │    │   Service    │    │   Service    │
└──────────────┘    └──────────────┘    └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Analysis & Processing Layer                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   LLM        │  │   Static     │  │   Code       │         │
│  │   Service    │  │   Analysis   │  │   Parser     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Output Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   PR         │  │   Test       │  │   Doc        │         │
│  │   Comments   │  │   Artifacts  │  │   Artifacts  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Postgres   │  │    Redis     │  │   Vector     │         │
│  │   (Primary)  │  │   (Queue)    │  │   Store      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Core Services

### 1. API Service
**Purpose:** Single entry point for all external requests

**Responsibilities:**
- Authentication and authorization (OAuth, JWT)
- Request routing to appropriate services
- Rate limiting and throttling
- Request/response validation
- Error handling and logging

**Technology:** TypeScript, Fastify (or Express), Node.js

**Interfaces:**
- REST API (primary)
- Webhook endpoints (GitHub, GitLab, etc.)
- GraphQL (future consideration)

---

### 2. Review Guard Service
**Purpose:** AI-aware code review and risk analysis

**Responsibilities:**
- Diff ingestion and context building
- Rule evaluation (quality, security, style)
- Severity classification
- Block vs. warn decision logic
- PR comment generation

**Technology:** TypeScript, Node.js

**Dependencies:**
- LLM Service (for AI-aware analysis)
- Static Analysis Service (for pattern detection)
- Code Parser (for AST analysis)

---

### 3. Test Engine Service
**Purpose:** Automatic test generation and coverage enforcement

**Responsibilities:**
- AI-touched file detection
- Test framework detection and mapping
- Test generation using LLM
- Test placement rule enforcement
- Coverage calculation and enforcement
- CI integration (status checks, fail conditions)

**Technology:** TypeScript, Node.js

**Dependencies:**
- LLM Service (for test generation)
- Code Parser (for code structure analysis)
- Git Service (for diff analysis)

---

### 4. Doc Sync Service
**Purpose:** Automatic documentation and API spec generation

**Responsibilities:**
- Code parsing for API endpoints
- OpenAPI/spec generation
- Merge-triggered updates
- Artifact storage and publishing
- Drift detection and alerts

**Technology:** TypeScript, Node.js

**Dependencies:**
- Code Parser (for API extraction)
- LLM Service (for doc generation)
- Artifact Storage (for publishing)

---

### 5. Integration Services
**Purpose:** Adapters for external systems

**Responsibilities:**
- GitHub/GitLab/Bitbucket API integration
- Webhook handling and validation
- Event normalization (to internal event model)
- API rate limit management
- Retry logic and error handling

**Technology:** TypeScript, Node.js, respective SDKs

**Services:**
- GitHub Adapter
- GitLab Adapter
- Bitbucket Adapter
- Azure DevOps Adapter (future)

---

### 6. LLM Service
**Purpose:** Centralized LLM interaction and prompt management

**Responsibilities:**
- LLM API integration (OpenAI, Anthropic, etc.)
- Prompt template management
- Response caching
- Cost tracking and optimization
- Fallback handling (model failures)

**Technology:** TypeScript, Node.js

**Interfaces:**
- OpenAI API
- Anthropic API
- Self-hosted models (future)

---

### 7. Static Analysis Service
**Purpose:** Code pattern detection and rule evaluation

**Responsibilities:**
- AST parsing and analysis
- Security pattern detection
- Code quality rule evaluation
- Dependency vulnerability scanning
- Performance pattern detection

**Technology:** TypeScript, Node.js

**Dependencies:**
- Code Parser (AST generation)
- Security rule database

---

### 8. Code Parser Service
**Purpose:** Language-agnostic code parsing and AST generation

**Responsibilities:**
- Multi-language support (TypeScript, Python, Java, Go, etc.)
- AST generation and normalization
- Diff analysis
- Code structure extraction

**Technology:** TypeScript, Node.js, language-specific parsers

**Supported Languages:**
- TypeScript/JavaScript (Babel, TypeScript compiler)
- Python (ast module)
- Java (JavaParser)
- Go (go/ast)
- Ruby (parser gem, via API)

---

## Data Flow Patterns

### Pattern 1: PR Review Flow
```
GitHub Webhook → API Service → Review Guard Service
  → LLM Service + Static Analysis Service
  → Review Guard Service (aggregate results)
  → PR Comments (via GitHub Adapter)
```

### Pattern 2: Test Generation Flow
```
PR Updated Event → API Service → Test Engine Service
  → Detect AI-touched files
  → LLM Service (generate tests)
  → Test Engine Service (validate, place tests)
  → CI Status Check (via GitHub Adapter)
```

### Pattern 3: Doc Sync Flow
```
Merge Event → API Service → Doc Sync Service
  → Code Parser Service (extract APIs)
  → LLM Service (generate docs)
  → Doc Sync Service (update artifacts)
  → Artifact Storage (publish)
```

## Communication Patterns

### Synchronous (Request-Response)
- API requests from clients
- Service-to-service calls within request context
- **Use when:** Immediate response required, low latency

### Asynchronous (Event-Driven)
- Webhook processing
- Background jobs (test generation, doc updates)
- **Use when:** Long-running operations, eventual consistency OK

### Message Queue (Redis/RabbitMQ)
- PR review jobs
- Test generation jobs
- Doc update jobs
- **Use when:** Decoupling, retry logic, scalability

## Scalability Considerations

### Horizontal Scaling
- **Stateless services:** API, Review Guard, Test Engine, Doc Sync
- **Load balancing:** Round-robin, least connections
- **Auto-scaling:** Based on queue depth, request rate

### Vertical Scaling
- **LLM Service:** GPU resources for self-hosted models
- **Code Parser:** CPU-intensive operations
- **Database:** Connection pooling, read replicas

### Caching Strategy
- **LLM responses:** Cache similar code patterns
- **Git data:** Cache repo metadata, file contents
- **User configs:** Cache org/repo configurations
- **TTL:** 1 hour for code, 24 hours for configs

## Deployment Architecture

### Containerization
- **Docker:** Each service in separate container
- **Kubernetes:** Orchestration (production)
- **Docker Compose:** Local development

### Service Discovery
- **Internal:** Service names via DNS (Kubernetes)
- **External:** API Gateway (single entry point)

### Configuration Management
- **Environment variables:** Per-service configs
- **Secrets:** Vault or Kubernetes secrets
- **Feature flags:** LaunchDarkly or custom

## Monitoring & Observability

### Metrics
- **Request rate:** Per service, per endpoint
- **Latency:** P50, P95, P99
- **Error rate:** 4xx, 5xx responses
- **Queue depth:** Background job queues
- **LLM costs:** Token usage, API costs

### Logging
- **Structured logs:** JSON format
- **Log levels:** ERROR, WARN, INFO, DEBUG
- **Correlation IDs:** Track requests across services
- **Retention:** 30 days (configurable)

### Tracing
- **Distributed tracing:** OpenTelemetry
- **Service map:** Visualize request flow
- **Performance analysis:** Identify bottlenecks

## Security Architecture

### Authentication
- **OAuth 2.0:** GitHub, GitLab, Bitbucket apps
- **JWT:** Internal service-to-service auth
- **API keys:** For programmatic access (enterprise)

### Authorization
- **RBAC:** Role-based access control (org/repo level)
- **Scopes:** Least-privilege OAuth scopes
- **Resource-level:** Per-repo permissions

### Data Security
- **Encryption at rest:** Database encryption
- **Encryption in transit:** TLS 1.3
- **Secrets management:** Vault or Kubernetes secrets
- **No code retention:** By default, code not stored (ephemeral)

### Audit Logging
- **All actions logged:** Who, what, when, where
- **SOC2 compliant:** Audit trail for compliance
- **Retention:** 90 days (configurable)

## Technology Stack Summary

### Runtime
- **Language:** TypeScript
- **Runtime:** Node.js 20+
- **Framework:** Fastify (or Express)

### Data
- **Primary DB:** PostgreSQL 15+
- **Cache/Queue:** Redis 7+
- **Vector Store:** Pinecone or Weaviate (for code context)

### Infrastructure
- **Container:** Docker
- **Orchestration:** Kubernetes (production), Docker Compose (dev)
- **CI/CD:** GitHub Actions, GitLab CI

### External Services
- **LLM:** OpenAI API, Anthropic API
- **Git Hosts:** GitHub, GitLab, Bitbucket APIs
- **Monitoring:** Prometheus, Grafana
- **Logging:** ELK stack or Datadog

## Non-Functional Requirements

### Performance
- **API latency:** <200ms (P95) for synchronous operations
- **Background jobs:** <5min for PR review, <10min for test generation
- **Throughput:** 1000 PR reviews/hour per service instance

### Reliability
- **Uptime:** 99.9% SLA
- **Error handling:** Graceful degradation, retries with exponential backoff
- **Circuit breakers:** Prevent cascade failures

### Scalability
- **Horizontal scaling:** Support 10,000+ repos
- **Concurrent requests:** 10,000+ concurrent API requests
- **Queue processing:** 100+ background jobs/second

### Security
- **SOC2 Type II:** Compliance ready
- **Data retention:** Configurable, default 30 days
- **Secret rotation:** Automated, 90-day rotation
