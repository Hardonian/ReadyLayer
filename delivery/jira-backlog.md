# ReadyLayer — Jira Backlog

## Epic Structure

Epics are organized by week and feature area. Each epic contains multiple stories with acceptance criteria.

---

## Epic 1: Infrastructure Setup

### Story 1.1: Set Up Monorepo Structure
**Type:** Task  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Sprint:** Week 1

**Description:**
Set up monorepo structure with TypeScript, Node.js, and proper package organization.

**Acceptance Criteria:**
- ✅ Monorepo structure created (packages: api, review-guard, test-engine, doc-sync, integrations)
- ✅ TypeScript configured with strict mode
- ✅ ESLint and Prettier configured
- ✅ Package.json scripts for build, test, lint
- ✅ README with setup instructions

**Tasks:**
- [ ] Create monorepo structure
- [ ] Configure TypeScript
- [ ] Set up ESLint and Prettier
- [ ] Create package.json scripts
- [ ] Write README

**Estimate:** 5 points

---

### Story 1.2: Configure Docker and Docker Compose
**Type:** Task  
**Priority:** Critical  
**Assignee:** DevOps Engineer  
**Sprint:** Week 1

**Description:**
Set up Docker and Docker Compose for local development environment.

**Acceptance Criteria:**
- ✅ Dockerfile for each service
- ✅ Docker Compose file with all services (api, postgres, redis)
- ✅ Environment variables configured
- ✅ Services start with `docker-compose up`
- ✅ Health checks configured

**Tasks:**
- [ ] Create Dockerfiles
- [ ] Create docker-compose.yml
- [ ] Configure environment variables
- [ ] Add health checks
- [ ] Test local setup

**Estimate:** 5 points

---

### Story 1.3: Set Up PostgreSQL Database Schema
**Type:** Task  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Sprint:** Week 1

**Description:**
Design and implement PostgreSQL database schema for users, orgs, repos, reviews, tests, docs.

**Acceptance Criteria:**
- ✅ Database schema designed (users, orgs, repos, reviews, tests, docs, configs)
- ✅ Migrations set up (using migration tool)
- ✅ Seed data script (for development)
- ✅ Indexes created for performance
- ✅ Foreign keys and constraints defined

**Tasks:**
- [ ] Design database schema
- [ ] Create migration files
- [ ] Set up migration tool
- [ ] Create seed data script
- [ ] Add indexes and constraints

**Estimate:** 8 points

---

### Story 1.4: Set Up Redis for Caching and Queues
**Type:** Task  
**Priority:** High  
**Assignee:** Backend Engineer  
**Sprint:** Week 1

**Description:**
Set up Redis for caching and message queues (background jobs).

**Acceptance Criteria:**
- ✅ Redis configured in Docker Compose
- ✅ Redis client configured in services
- ✅ Caching layer implemented (basic)
- ✅ Queue system implemented (basic)
- ✅ Connection pooling configured

**Tasks:**
- [ ] Configure Redis in Docker Compose
- [ ] Set up Redis client
- [ ] Implement caching layer
- [ ] Implement queue system
- [ ] Configure connection pooling

**Estimate:** 5 points

---

### Story 1.5: Configure CI/CD Pipeline
**Type:** Task  
**Priority:** Critical  
**Assignee:** DevOps Engineer  
**Sprint:** Week 1

**Description:**
Set up GitHub Actions CI/CD pipeline for testing, linting, and deployment.

**Acceptance Criteria:**
- ✅ GitHub Actions workflow created
- ✅ Tests run on PR
- ✅ Linting runs on PR
- ✅ Build runs on PR
- ✅ Deployment pipeline (staging) configured

**Tasks:**
- [ ] Create GitHub Actions workflow
- [ ] Configure test job
- [ ] Configure lint job
- [ ] Configure build job
- [ ] Configure deployment job

**Estimate:** 5 points

---

## Epic 2: Authentication & Authorization

### Story 2.1: Implement GitHub OAuth Flow
**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Sprint:** Week 1

**Description:**
Implement GitHub OAuth 2.0 flow for user authentication.

**Acceptance Criteria:**
- ✅ OAuth flow implemented (authorize, callback, token exchange)
- ✅ User created/updated on login
- ✅ Session management (JWT)
- ✅ Error handling (invalid code, expired tokens)
- ✅ Security (CSRF protection, state validation)

**Tasks:**
- [ ] Implement OAuth authorize endpoint
- [ ] Implement OAuth callback endpoint
- [ ] Implement token exchange
- [ ] Implement session management
- [ ] Add security measures

**Estimate:** 8 points

---

### Story 2.2: Implement API Key Management
**Type:** Feature  
**Priority:** High  
**Assignee:** Backend Engineer  
**Sprint:** Week 1

**Description:**
Implement API key generation, validation, and management.

**Acceptance Criteria:**
- ✅ API keys can be generated (dashboard or API)
- ✅ API keys validated on API requests
- ✅ API keys can be revoked
- ✅ API keys have scopes (read, write, admin)
- ✅ API keys stored securely (hashed)

**Tasks:**
- [ ] Implement API key generation
- [ ] Implement API key validation middleware
- [ ] Implement API key revocation
- [ ] Implement scopes
- [ ] Secure storage (hashing)

**Estimate:** 5 points

---

### Story 2.3: Implement Basic RBAC
**Type:** Feature  
**Priority:** High  
**Assignee:** Backend Engineer  
**Sprint:** Week 1

**Description:**
Implement basic role-based access control (owner, admin, member, viewer).

**Acceptance Criteria:**
- ✅ Roles defined (owner, admin, member, viewer)
- ✅ Permissions mapped to roles
- ✅ Authorization middleware implemented
- ✅ Resource-level authorization (repo-level)
- ✅ Tests written

**Tasks:**
- [ ] Define roles and permissions
- [ ] Implement authorization middleware
- [ ] Implement resource-level authorization
- [ ] Write tests
- [ ] Document RBAC

**Estimate:** 8 points

---

## Epic 3: API Service Foundation

### Story 3.1: Set Up Fastify Server
**Type:** Task  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Sprint:** Week 1

**Description:**
Set up Fastify server with basic middleware and routing.

**Acceptance Criteria:**
- ✅ Fastify server configured
- ✅ Middleware configured (CORS, body parser, etc.)
- ✅ Routing structure set up
- ✅ Error handling middleware
- ✅ Request logging middleware

**Tasks:**
- [ ] Set up Fastify server
- [ ] Configure middleware
- [ ] Set up routing structure
- [ ] Add error handling
- [ ] Add request logging

**Estimate:** 5 points

---

### Story 3.2: Implement Health Check Endpoints
**Type:** Task  
**Priority:** High  
**Assignee:** Backend Engineer  
**Sprint:** Week 1

**Description:**
Implement health check endpoints for monitoring and load balancers.

**Acceptance Criteria:**
- ✅ `/health` endpoint returns 200 if healthy
- ✅ `/ready` endpoint returns 200 if ready (database connected)
- ✅ Health checks include dependency status (DB, Redis)
- ✅ Health checks return JSON with status details

**Tasks:**
- [ ] Implement `/health` endpoint
- [ ] Implement `/ready` endpoint
- [ ] Add dependency checks
- [ ] Return JSON status

**Estimate:** 3 points

---

## Epic 4: GitHub Integration

### Story 4.1: Implement GitHub Webhook Handler
**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Sprint:** Week 2

**Description:**
Implement webhook handler for GitHub events (PR opened, updated, merged, CI completed).

**Acceptance Criteria:**
- ✅ Webhook endpoint receives GitHub events
- ✅ HMAC signature validation
- ✅ Event parsing (PR opened, updated, merged, CI completed)
- ✅ Event normalization (GitHub → internal events)
- ✅ Error handling (invalid signatures, malformed events)

**Tasks:**
- [ ] Create webhook endpoint
- [ ] Implement HMAC validation
- [ ] Parse GitHub events
- [ ] Normalize to internal events
- [ ] Add error handling

**Estimate:** 8 points

---

### Story 4.2: Implement GitHub API Client
**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Sprint:** Week 2

**Description:**
Implement GitHub API client for PRs, comments, status checks, file contents.

**Acceptance Criteria:**
- ✅ GitHub API client implemented
- ✅ PR operations (get PR, get diff, list PRs)
- ✅ Comment operations (post comment, update comment, delete comment)
- ✅ Status check operations (update status)
- ✅ File operations (get file contents)
- ✅ Rate limit handling

**Tasks:**
- [ ] Implement GitHub API client
- [ ] Implement PR operations
- [ ] Implement comment operations
- [ ] Implement status check operations
- [ ] Implement file operations
- [ ] Add rate limit handling

**Estimate:** 8 points

---

### Story 4.3: Implement GitHub App Installation Flow
**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Sprint:** Week 2

**Description:**
Implement GitHub App installation flow (OAuth, installation storage, webhook configuration).

**Acceptance Criteria:**
- ✅ GitHub App OAuth flow implemented
- ✅ Installation stored in database
- ✅ Webhook automatically configured (GitHub handles this)
- ✅ Installation verification
- ✅ Multi-repo installation support

**Tasks:**
- [ ] Implement OAuth flow
- [ ] Store installation in database
- [ ] Verify installation
- [ ] Support multi-repo installation
- [ ] Test installation flow

**Estimate:** 5 points

---

## Epic 5: Code Parser Service

### Story 5.1: Implement AST Parsing for TypeScript/JavaScript
**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Sprint:** Week 2

**Description:**
Implement AST parsing for TypeScript/JavaScript using Babel.

**Acceptance Criteria:**
- ✅ TypeScript/JavaScript files parsed to AST
- ✅ Functions, classes, imports extracted
- ✅ Code structure extracted (nesting, dependencies)
- ✅ Error handling (syntax errors, unsupported features)
- ✅ Performance (parse 1000+ line files in <1 second)

**Tasks:**
- [ ] Set up Babel parser
- [ ] Implement AST parsing
- [ ] Extract code structure
- [ ] Add error handling
- [ ] Optimize performance

**Estimate:** 8 points

---

### Story 5.2: Implement Diff Parsing
**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Sprint:** Week 2

**Description:**
Implement diff parsing (unified diff format) to extract file changes.

**Acceptance Criteria:**
- ✅ Unified diff format parsed
- ✅ File changes extracted (added, modified, deleted)
- ✅ Line-level changes extracted (additions, deletions, context)
- ✅ Hunk parsing (context lines)
- ✅ Error handling (malformed diffs)

**Tasks:**
- [ ] Implement diff parser
- [ ] Extract file changes
- [ ] Extract line-level changes
- [ ] Parse hunks
- [ ] Add error handling

**Estimate:** 5 points

---

## Epic 6: Review Guard (MVP)

### Story 6.1: Implement Diff Ingestion
**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Sprint:** Week 2

**Description:**
Implement diff ingestion and context building for review analysis.

**Acceptance Criteria:**
- ✅ PR diff fetched from GitHub
- ✅ Diff parsed and normalized
- ✅ File history fetched (last 10 commits)
- ✅ Related files detected (imports, dependencies)
- ✅ Context object built

**Tasks:**
- [ ] Fetch PR diff
- [ ] Parse and normalize diff
- [ ] Fetch file history
- [ ] Detect related files
- [ ] Build context object

**Estimate:** 5 points

---

### Story 6.2: Implement Basic Rule Engine
**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Sprint:** Week 2

**Description:**
Implement basic rule engine with 5-10 security and quality rules.

**Acceptance Criteria:**
- ✅ Rule engine implemented
- ✅ 5-10 rules implemented (SQL injection, secrets, high complexity, etc.)
- ✅ Rules evaluated on code
- ✅ Rule results aggregated
- ✅ Configurable rules (enable/disable, severity)

**Tasks:**
- [ ] Implement rule engine
- [ ] Implement security rules (SQL injection, secrets)
- [ ] Implement quality rules (complexity, duplication)
- [ ] Aggregate rule results
- [ ] Make rules configurable

**Estimate:** 8 points

---

### Story 6.3: Implement PR Comment Generation
**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Sprint:** Week 2

**Description:**
Implement PR comment generation (inline comments and summary).

**Acceptance Criteria:**
- ✅ Inline comments generated (file, line, message)
- ✅ Summary comment generated (issue breakdown)
- ✅ Comments formatted (markdown, code blocks)
- ✅ Comments posted to GitHub PR
- ✅ Stale comments removed on PR update

**Tasks:**
- [ ] Generate inline comments
- [ ] Generate summary comment
- [ ] Format comments
- [ ] Post comments to GitHub
- [ ] Remove stale comments

**Estimate:** 5 points

---

### Story 6.4: Implement Status Check Updates
**Type:** Feature  
**Priority:** High  
**Assignee:** Backend Engineer  
**Sprint:** Week 2

**Description:**
Implement status check updates (success/failure based on issues found).

**Acceptance Criteria:**
- ✅ Status check created/updated
- ✅ Status based on issues (success if no critical, failure if critical)
- ✅ Status description includes issue summary
- ✅ Status links to review details
- ✅ Status updated on PR changes

**Tasks:**
- [ ] Create/update status check
- [ ] Determine status based on issues
- [ ] Add status description
- [ ] Add status link
- [ ] Update on PR changes

**Estimate:** 3 points

---

## Epic 7: LLM Service

### Story 7.1: Implement OpenAI API Client
**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Sprint:** Week 3

**Description:**
Implement OpenAI API client for code analysis and test generation.

**Acceptance Criteria:**
- ✅ OpenAI API client implemented
- ✅ API calls work (completions, chat)
- ✅ Error handling (rate limits, API errors)
- ✅ Retry logic (exponential backoff)
- ✅ Cost tracking

**Tasks:**
- [ ] Implement OpenAI client
- [ ] Make API calls
- [ ] Add error handling
- [ ] Add retry logic
- [ ] Track costs

**Estimate:** 5 points

---

### Story 7.2: Implement Prompt Template Management
**Type:** Feature  
**Priority:** High  
**Assignee:** Backend Engineer  
**Sprint:** Week 3

**Description:**
Implement prompt template management for code review, test generation, doc generation.

**Acceptance Criteria:**
- ✅ Prompt templates stored (file or database)
- ✅ Templates parameterized (code, context, framework, etc.)
- ✅ Templates rendered with parameters
- ✅ Template versioning (for updates)
- ✅ Template testing

**Tasks:**
- [ ] Store prompt templates
- [ ] Parameterize templates
- [ ] Render templates
- [ ] Version templates
- [ ] Test templates

**Estimate:** 5 points

---

### Story 7.3: Implement Response Caching
**Type:** Feature  
**Priority:** Medium  
**Assignee:** Backend Engineer  
**Sprint:** Week 3

**Description:**
Implement caching for LLM responses to reduce costs and improve performance.

**Acceptance Criteria:**
- ✅ LLM responses cached (Redis)
- ✅ Cache key based on code hash
- ✅ Cache TTL configurable (default 24 hours)
- ✅ Cache invalidation (on code changes)
- ✅ Cache hit rate tracked

**Tasks:**
- [ ] Implement caching layer
- [ ] Generate cache keys
- [ ] Set TTL
- [ ] Invalidate cache
- [ ] Track cache hit rate

**Estimate:** 5 points

---

## Epic 8: AI Detection

### Story 8.1: Implement Commit Message Analysis
**Type:** Feature  
**Priority:** High  
**Assignee:** Backend Engineer  
**Sprint:** Week 3

**Description:**
Implement AI detection via commit message analysis.

**Acceptance Criteria:**
- ✅ Commit messages analyzed for AI indicators
- ✅ Indicators detected ("AI-generated", "Copilot", "Cursor", "Claude")
- ✅ Confidence score calculated
- ✅ Configurable (which indicators to check)

**Tasks:**
- [ ] Analyze commit messages
- [ ] Detect AI indicators
- [ ] Calculate confidence score
- [ ] Make configurable

**Estimate:** 3 points

---

### Story 8.2: Implement Author Detection
**Type:** Feature  
**Priority:** High  
**Assignee:** Backend Engineer  
**Sprint:** Week 3

**Description:**
Implement AI detection via commit author analysis.

**Acceptance Criteria:**
- ✅ Commit authors analyzed for AI indicators
- ✅ Bot accounts detected ("github-actions[bot]", "copilot", etc.)
- ✅ Confidence score calculated
- ✅ Configurable (which authors to check)

**Tasks:**
- [ ] Analyze commit authors
- [ ] Detect bot accounts
- [ ] Calculate confidence score
- [ ] Make configurable

**Estimate:** 3 points

---

## Epic 9: Test Engine (MVP)

### Story 9.1: Implement Test Framework Detection
**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Sprint:** Week 3

**Description:**
Implement test framework detection (Jest for MVP).

**Acceptance Criteria:**
- ✅ Test framework detected (Jest)
- ✅ Detection via config files (jest.config.js)
- ✅ Detection via test files (*.test.ts, *.spec.ts)
- ✅ Detection via dependencies (package.json)
- ✅ Framework info stored (name, version, config)

**Tasks:**
- [ ] Detect Jest config files
- [ ] Detect test files
- [ ] Detect dependencies
- [ ] Store framework info
- [ ] Test detection

**Estimate:** 5 points

---

### Story 9.2: Implement Test Generation
**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Sprint:** Week 3

**Description:**
Implement test generation using LLM for AI-touched files.

**Acceptance Criteria:**
- ✅ Tests generated for AI-touched files
- ✅ Tests use detected framework (Jest)
- ✅ Tests cover main functions/methods
- ✅ Tests include edge cases and error cases
- ✅ Test syntax validated

**Tasks:**
- [ ] Generate tests via LLM
- [ ] Use Jest framework
- [ ] Cover main functions
- [ ] Include edge cases
- [ ] Validate syntax

**Estimate:** 8 points

---

### Story 9.3: Implement Test Placement
**Type:** Feature  
**Priority:** High  
**Assignee:** Backend Engineer  
**Sprint:** Week 3

**Description:**
Implement test placement (co-located for MVP).

**Acceptance Criteria:**
- ✅ Tests placed co-located (src/auth.ts → src/auth.test.ts)
- ✅ Test files created if missing
- ✅ Tests appended to existing test files
- ✅ Test placement configurable

**Tasks:**
- [ ] Determine test file path
- [ ] Create test files
- [ ] Append to existing files
- [ ] Make configurable

**Estimate:** 5 points

---

## Epic 10: Coverage Calculation

### Story 10.1: Implement Coverage Report Parsing
**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Sprint:** Week 3

**Description:**
Implement coverage report parsing (lcov format).

**Acceptance Criteria:**
- ✅ LCOV format parsed
- ✅ Coverage metrics extracted (lines, branches, functions)
- ✅ File-level coverage extracted
- ✅ Coverage data stored
- ✅ Error handling (malformed reports)

**Tasks:**
- [ ] Parse LCOV format
- [ ] Extract metrics
- [ ] Extract file-level coverage
- [ ] Store coverage data
- [ ] Add error handling

**Estimate:** 5 points

---

### Story 10.2: Implement Coverage Threshold Enforcement
**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Sprint:** Week 3

**Description:**
Implement coverage threshold enforcement (fail CI if below threshold).

**Acceptance Criteria:**
- ✅ Coverage compared to threshold
- ✅ CI status check updated (failure if below threshold)
- ✅ PR comment posted with coverage report
- ✅ Threshold configurable per repo
- ✅ Enforcement configurable (block vs. warn)

**Tasks:**
- [ ] Compare coverage to threshold
- [ ] Update CI status check
- [ ] Post PR comment
- [ ] Make threshold configurable
- [ ] Make enforcement configurable

**Estimate:** 5 points

---

## Epic 11: Doc Sync (MVP)

### Story 11.1: Implement API Endpoint Extraction
**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Sprint:** Week 4

**Description:**
Implement API endpoint extraction for Express.js.

**Acceptance Criteria:**
- ✅ Express.js routes detected (app.get(), app.post(), etc.)
- ✅ Endpoint metadata extracted (method, path, parameters)
- ✅ Request/response types extracted
- ✅ Endpoints stored in structured format
- ✅ Error handling (unsupported patterns)

**Tasks:**
- [ ] Detect Express routes
- [ ] Extract endpoint metadata
- [ ] Extract request/response types
- [ ] Store endpoints
- [ ] Add error handling

**Estimate:** 8 points

---

### Story 11.2: Implement OpenAPI Spec Generation
**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Sprint:** Week 4

**Description:**
Implement OpenAPI 3.1 spec generation from extracted endpoints.

**Acceptance Criteria:**
- ✅ OpenAPI 3.1 spec generated
- ✅ Endpoints converted to OpenAPI paths
- ✅ Schemas generated (from TypeScript interfaces)
- ✅ Spec validated (OpenAPI validator)
- ✅ Spec formatted (YAML or JSON)

**Tasks:**
- [ ] Generate OpenAPI spec
- [ ] Convert endpoints to paths
- [ ] Generate schemas
- [ ] Validate spec
- [ ] Format spec

**Estimate:** 8 points

---

### Story 11.3: Implement Merge-Triggered Updates
**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Sprint:** Week 4

**Description:**
Implement documentation updates on merge (commit or PR).

**Acceptance Criteria:**
- ✅ Merge events detected (webhook)
- ✅ Docs generated/updated on merge
- ✅ Docs committed to repo (or PR created)
- ✅ Update strategy configurable (commit, PR, artifact)
- ✅ Error handling (merge conflicts, commit failures)

**Tasks:**
- [ ] Detect merge events
- [ ] Generate/update docs
- [ ] Commit to repo or create PR
- [ ] Make strategy configurable
- [ ] Add error handling

**Estimate:** 5 points

---

## Epic 12: Configuration System

### Story 12.1: Implement `.readylayer.yml` Parsing
**Type:** Feature  
**Priority:** High  
**Assignee:** Backend Engineer  
**Sprint:** Week 4

**Description:**
Implement parsing and validation of `.readylayer.yml` configuration files.

**Acceptance Criteria:**
- ✅ YAML files parsed
- ✅ Configuration validated (schema validation)
- ✅ Default values applied
- ✅ Validation errors reported
- ✅ Configuration stored in database

**Tasks:**
- [ ] Parse YAML files
- [ ] Validate configuration
- [ ] Apply defaults
- [ ] Report errors
- [ ] Store in database

**Estimate:** 5 points

---

### Story 12.2: Implement Config API Endpoints
**Type:** Feature  
**Priority:** High  
**Assignee:** Backend Engineer  
**Sprint:** Week 4

**Description:**
Implement API endpoints for reading and updating configuration.

**Acceptance Criteria:**
- ✅ GET `/repos/{repo_id}/config` endpoint
- ✅ PATCH `/repos/{repo_id}/config` endpoint
- ✅ Config merged with defaults
- ✅ Config validated on update
- ✅ Config changes logged (audit)

**Tasks:**
- [ ] Implement GET endpoint
- [ ] Implement PATCH endpoint
- [ ] Merge with defaults
- [ ] Validate on update
- [ ] Log changes

**Estimate:** 5 points

---

## Epic 13: Dashboard (Basic)

### Story 13.1: Implement Repo List Page
**Type:** Feature  
**Priority:** High  
**Assignee:** Frontend Engineer  
**Sprint:** Week 4

**Description:**
Implement basic repo list page showing connected repositories.

**Acceptance Criteria:**
- ✅ Repos listed (name, owner, provider, status)
- ✅ Repos filterable (by provider, status)
- ✅ Repos searchable (by name)
- ✅ Repo details link (to detail page)
- ✅ Responsive design (mobile-friendly)

**Tasks:**
- [ ] Create repo list page
- [ ] Fetch repos from API
- [ ] Add filtering
- [ ] Add search
- [ ] Make responsive

**Estimate:** 5 points

---

### Story 13.2: Implement Repo Detail Page
**Type:** Feature  
**Priority:** High  
**Assignee:** Frontend Engineer  
**Sprint:** Week 4

**Description:**
Implement repo detail page showing reviews, tests, docs, and config.

**Acceptance Criteria:**
- ✅ Repo details shown (name, owner, provider, URL)
- ✅ Recent reviews listed
- ✅ Test coverage shown
- ✅ Documentation status shown
- ✅ Config editor (basic)

**Tasks:**
- [ ] Create repo detail page
- [ ] Show repo details
- [ ] List recent reviews
- [ ] Show test coverage
- [ ] Show doc status
- [ ] Add config editor

**Estimate:** 8 points

---

## Epic 14: Documentation & Launch Prep

### Story 14.1: Write API Documentation
**Type:** Task  
**Priority:** High  
**Assignee:** Technical Writer / Backend Engineer  
**Sprint:** Week 4

**Description:**
Write comprehensive API documentation (OpenAPI spec + guides).

**Acceptance Criteria:**
- ✅ OpenAPI spec complete
- ✅ API endpoints documented
- ✅ Authentication documented
- ✅ Examples provided
- ✅ Error responses documented

**Tasks:**
- [ ] Write OpenAPI spec
- [ ] Document endpoints
- [ ] Document authentication
- [ ] Add examples
- [ ] Document errors

**Estimate:** 8 points

---

### Story 14.2: Write User Documentation
**Type:** Task  
**Priority:** High  
**Assignee:** Technical Writer / Product Manager  
**Sprint:** Week 4

**Description:**
Write user documentation (setup guides, feature guides, troubleshooting).

**Acceptance Criteria:**
- ✅ Setup guide complete
- ✅ Feature guides complete (Review Guard, Test Engine, Doc Sync)
- ✅ Configuration guide complete
- ✅ Troubleshooting guide complete
- ✅ FAQ complete

**Tasks:**
- [ ] Write setup guide
- [ ] Write feature guides
- [ ] Write configuration guide
- [ ] Write troubleshooting guide
- [ ] Write FAQ

**Estimate:** 8 points

---

## Summary

### Total Stories: 50+
### Total Points: 300+ (estimated)

### Week 1: 15 stories, ~80 points
### Week 2: 12 stories, ~70 points
### Week 3: 12 stories, ~70 points
### Week 4: 11 stories, ~80 points

### Critical Path
1. Infrastructure Setup (Week 1)
2. Authentication (Week 1)
3. GitHub Integration (Week 2)
4. Review Guard MVP (Week 2)
5. Test Engine MVP (Week 3)
6. Doc Sync MVP (Week 4)
7. Documentation (Week 4)

---

## Notes

- **Estimates:** Points are rough estimates, adjust based on team velocity
- **Dependencies:** Some stories depend on others, plan accordingly
- **Testing:** Write tests for critical paths (not all stories include testing tasks)
- **Documentation:** Document as you build, not just at the end
- **Iteration:** Ship early, iterate based on feedback
