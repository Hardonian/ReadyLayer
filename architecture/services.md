# ReadyLayer — Service Responsibilities

## Service Ownership Matrix

Each service has clear ownership boundaries. This document defines what each service owns and what it delegates to others.

---

## API Service

### Owns
- Request authentication and authorization
- Request routing and load balancing
- Rate limiting and throttling
- Request/response validation
- Error handling and HTTP status codes
- API versioning
- CORS configuration

### Delegates To
- **Review Guard Service:** PR review requests
- **Test Engine Service:** Test generation requests
- **Doc Sync Service:** Documentation generation requests
- **Integration Services:** Git host API calls
- **LLM Service:** LLM interactions (via other services)

### Interfaces
- **REST API:** `/api/v1/*`
- **Webhooks:** `/webhooks/github`, `/webhooks/gitlab`, etc.
- **Health:** `/health`, `/ready`

### Data Access
- **Read:** User configs, org configs, repo configs (cached)
- **Write:** Audit logs, request logs

---

## Review Guard Service

### Owns
- Diff ingestion and parsing
- Context building (file history, related files)
- Rule evaluation engine
- Severity classification (critical, high, medium, low)
- Block vs. warn decision logic
- PR comment generation (inline and summary)
- Review result aggregation

### Delegates To
- **LLM Service:** AI-aware code analysis
- **Static Analysis Service:** Pattern detection, security scanning
- **Code Parser Service:** AST generation, diff analysis
- **GitHub/GitLab Adapters:** PR comment posting, status checks

### Interfaces
- **Internal API:** `/review/analyze`, `/review/rules`, `/review/results`
- **Events:** Consumes `pr.opened`, `pr.updated` events

### Data Access
- **Read:** Repo configs, rule definitions, historical reviews (cached)
- **Write:** Review results, rule evaluations, audit logs

### Rules Engine
- **Rule Types:**
  - Security (SQL injection, XSS, secrets, etc.)
  - Quality (complexity, maintainability, etc.)
  - Style (formatting, naming, etc.)
  - AI-specific (hallucination detection, context gaps, etc.)
- **Rule Sources:**
  - Built-in rules (default set)
  - Custom rules (user-defined)
  - Rule templates (community, compliance)

---

## Test Engine Service

### Owns
- AI-touched file detection
- Test framework detection (Jest, Mocha, pytest, etc.)
- Test generation orchestration
- Test placement rules (where tests go in repo)
- Coverage calculation
- Coverage enforcement (thresholds, CI failures)
- Test validation (syntax, structure)

### Delegates To
- **LLM Service:** Test generation (given code and framework)
- **Code Parser Service:** Code structure analysis, test file detection
- **GitHub/GitLab Adapters:** CI status checks, test artifact uploads
- **Git Service:** Diff analysis, file history

### Interfaces
- **Internal API:** `/test/generate`, `/test/coverage`, `/test/enforce`
- **Events:** Consumes `pr.opened`, `pr.updated`, `ci.completed` events

### Data Access
- **Read:** Repo configs, test framework configs, coverage history
- **Write:** Generated tests, coverage reports, enforcement results

### Test Framework Support
- **JavaScript/TypeScript:** Jest, Mocha, Vitest
- **Python:** pytest, unittest
- **Java:** JUnit, TestNG
- **Go:** testing package, testify
- **Ruby:** RSpec, Minitest

---

## Doc Sync Service

### Owns
- Code parsing for API endpoints
- OpenAPI/spec generation
- Documentation template management
- Merge-triggered updates
- Artifact storage and publishing
- Drift detection (code vs. docs)
- Documentation versioning

### Delegates To
- **Code Parser Service:** API endpoint extraction, parameter detection
- **LLM Service:** Documentation generation, descriptions
- **Artifact Storage:** Publishing (GitHub releases, S3, etc.)
- **GitHub/GitLab Adapters:** Commit docs, create PRs for doc updates

### Interfaces
- **Internal API:** `/docs/generate`, `/docs/publish`, `/docs/drift`
- **Events:** Consumes `merge.completed` events

### Data Access
- **Read:** Repo configs, doc templates, previous specs
- **Write:** Generated docs, OpenAPI specs, drift reports

### Supported Formats
- **OpenAPI:** 3.0, 3.1
- **GraphQL:** Schema generation (future)
- **Markdown:** API documentation
- **Postman:** Collection export (future)

---

## Integration Services

### GitHub Adapter

#### Owns
- GitHub API integration (REST and GraphQL)
- Webhook validation and parsing
- OAuth app installation handling
- PR comment posting
- Status check updates
- File content retrieval
- Rate limit management

#### Delegates To
- **API Service:** Authentication, request validation
- **Event Bus:** Event publishing (normalized events)

#### Interfaces
- **Webhooks:** Receives GitHub webhooks
- **API Calls:** GitHub REST API, GraphQL API

#### Scopes Required
- `repo` (full repo access)
- `pull_requests` (read/write PRs)
- `contents` (read file contents)
- `checks` (write status checks)

---

### GitLab Adapter

#### Owns
- GitLab API integration
- Webhook validation and parsing
- OAuth app installation handling
- Merge request comment posting
- Pipeline status updates
- File content retrieval
- Rate limit management

#### Delegates To
- **API Service:** Authentication, request validation
- **Event Bus:** Event publishing (normalized events)

#### Interfaces
- **Webhooks:** Receives GitLab webhooks
- **API Calls:** GitLab REST API

#### Scopes Required
- `api` (full API access)
- `read_repository` (read repo)
- `write_repository` (write comments, status)

---

### Bitbucket Adapter

#### Owns
- Bitbucket API integration
- Webhook validation and parsing
- OAuth app installation handling
- Pull request comment posting
- Build status updates
- File content retrieval
- Rate limit management

#### Delegates To
- **API Service:** Authentication, request validation
- **Event Bus:** Event publishing (normalized events)

#### Interfaces
- **Webhooks:** Receives Bitbucket webhooks
- **API Calls:** Bitbucket REST API

#### Scopes Required
- `repository` (read/write repo)
- `pullrequest` (read/write PRs)

---

## LLM Service

### Owns
- LLM API integration (OpenAI, Anthropic)
- Prompt template management
- Response caching (similar code patterns)
- Cost tracking and optimization
- Model selection (GPT-4, Claude, etc.)
- Fallback handling (model failures, rate limits)
- Token counting and budgeting

### Delegates To
- **Cache (Redis):** Response caching
- **Database:** Cost tracking, usage analytics

### Interfaces
- **Internal API:** `/llm/complete`, `/llm/analyze`, `/llm/generate`
- **Events:** None (synchronous only)

### Data Access
- **Read:** Prompt templates, cached responses
- **Write:** Usage logs, cost tracking

### Supported Models
- **OpenAI:** GPT-4, GPT-3.5-turbo
- **Anthropic:** Claude 3 Opus, Claude 3 Sonnet
- **Self-hosted:** Future consideration (Llama, Mistral)

---

## Static Analysis Service

### Owns
- AST parsing and analysis
- Security pattern detection (OWASP Top 10, etc.)
- Code quality rule evaluation
- Dependency vulnerability scanning
- Performance pattern detection
- Code smell detection

### Delegates To
- **Code Parser Service:** AST generation
- **Security Databases:** CVE databases, vulnerability feeds

### Interfaces
- **Internal API:** `/analysis/security`, `/analysis/quality`, `/analysis/performance`
- **Events:** None (synchronous only)

### Data Access
- **Read:** Rule definitions, vulnerability databases
- **Write:** Analysis results, vulnerability reports

### Analysis Types
- **Security:** SQL injection, XSS, secrets, insecure dependencies
- **Quality:** Cyclomatic complexity, code duplication, maintainability index
- **Performance:** N+1 queries, inefficient algorithms, memory leaks

---

## Code Parser Service

### Owns
- Multi-language parsing
- AST generation and normalization
- Diff analysis (before/after)
- Code structure extraction (functions, classes, imports)
- Language detection
- Syntax validation

### Delegates To
- **Language Parsers:** Babel (JS/TS), ast (Python), etc.

### Interfaces
- **Internal API:** `/parser/parse`, `/parser/diff`, `/parser/structure`
- **Events:** None (synchronous only)

### Data Access
- **Read:** Code files (ephemeral, not stored)
- **Write:** Parsed ASTs (cached, TTL 1 hour)

### Supported Languages
- **TypeScript/JavaScript:** Babel, TypeScript compiler
- **Python:** ast module, tree-sitter
- **Java:** JavaParser, Eclipse JDT
- **Go:** go/ast (via Go toolchain)
- **Ruby:** parser gem (via API)
- **PHP:** PHP-Parser
- **C#:** Roslyn (future)

---

## Event Bus (Redis/RabbitMQ)

### Owns
- Event publishing and subscription
- Event routing (topic-based)
- Retry logic (failed event processing)
- Dead letter queue (unprocessable events)
- Event ordering (per-repo, per-PR)

### Events Published
- `pr.opened`
- `pr.updated`
- `pr.closed`
- `ci.completed`
- `merge.completed`

### Event Consumers
- **Review Guard Service:** `pr.opened`, `pr.updated`
- **Test Engine Service:** `pr.opened`, `pr.updated`, `ci.completed`
- **Doc Sync Service:** `merge.completed`

---

## Database (PostgreSQL)

### Owns
- User data (accounts, orgs, repos)
- Configuration (org configs, repo configs, rules)
- Audit logs (all actions)
- Usage tracking (PR reviews, test generations, doc updates)
- Cost tracking (LLM usage, API calls)

### Schema Ownership
- **API Service:** Users, orgs, repos, configs
- **Review Guard Service:** Reviews, rules, evaluations
- **Test Engine Service:** Tests, coverage, enforcement
- **Doc Sync Service:** Docs, specs, artifacts

---

## Service Communication Patterns

### Synchronous (HTTP/gRPC)
- **Use when:** Immediate response required
- **Examples:** API requests, LLM calls, code parsing
- **Timeout:** 30 seconds (configurable)

### Asynchronous (Event Bus)
- **Use when:** Long-running operations, eventual consistency OK
- **Examples:** PR review jobs, test generation, doc updates
- **Retry:** Exponential backoff, max 3 retries

### Direct Database Access
- **Use when:** Simple CRUD, no business logic
- **Examples:** Config reads, audit log writes
- **Pattern:** Repository pattern, connection pooling

---

## Service Dependencies Graph

```
API Service
  ├─→ Review Guard Service
  │     ├─→ LLM Service
  │     ├─→ Static Analysis Service
  │     └─→ Code Parser Service
  ├─→ Test Engine Service
  │     ├─→ LLM Service
  │     └─→ Code Parser Service
  ├─→ Doc Sync Service
  │     ├─→ LLM Service
  │     └─→ Code Parser Service
  └─→ Integration Services (GitHub, GitLab, Bitbucket)
        └─→ Event Bus
```

**Key Principle:** Services communicate through well-defined interfaces. No direct database access across service boundaries (except for shared configs).
