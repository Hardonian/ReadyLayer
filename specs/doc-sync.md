# ReadyLayer — Doc Sync Specification

## Overview

Doc Sync automatically generates and updates documentation and API specs from code changes. It parses code for API endpoints, generates OpenAPI specs, updates documentation, and prevents documentation drift.

---

## Core Functionality

### 1. Code Parsing Strategy

#### API Endpoint Extraction
**Purpose:** Extract API endpoints from code

**Process:**
1. **Parse code to AST:** Use Code Parser Service
2. **Detect route definitions:** Find route decorators, route functions
3. **Extract metadata:** Method (GET, POST, etc.), path, parameters
4. **Extract request/response:** Request body, response type, status codes
5. **Extract validation:** Schema validation, parameter validation

#### Supported Frameworks

**Express.js (TypeScript/JavaScript):**
```typescript
// Detect: app.get(), app.post(), router.get(), etc.
app.get('/api/users/:id', (req, res) => {
  // Extract: GET /api/users/:id
  // Parameters: id (path parameter)
  // Response: inferred from res.json()
});
```

**Fastify (TypeScript/JavaScript):**
```typescript
// Detect: fastify.get(), fastify.post(), etc.
fastify.get('/api/users/:id', {
  schema: {
    params: { id: { type: 'number' } },
    response: { 200: { type: 'object' } }
  }
}, async (req, res) => {
  // Extract: GET /api/users/:id
  // Parameters: id (number, path parameter)
  // Response: 200, object
});
```

**Flask (Python):**
```python
# Detect: @app.route(), @blueprint.route()
@app.route('/api/users/<int:id>', methods=['GET'])
def get_user(id):
    # Extract: GET /api/users/{id}
    # Parameters: id (integer, path parameter)
    # Response: inferred from return
    return jsonify({'id': id})
```

**Django (Python):**
```python
# Detect: @api_view(), class-based views
@api_view(['GET'])
def get_user(request, id):
    # Extract: GET /api/users/{id}
    # Parameters: id (path parameter)
    # Response: inferred from Response()
    return Response({'id': id})
```

**Spring Boot (Java):**
```java
// Detect: @GetMapping, @PostMapping, etc.
@GetMapping("/api/users/{id}")
public ResponseEntity<User> getUser(@PathVariable Long id) {
    // Extract: GET /api/users/{id}
    // Parameters: id (Long, path parameter)
    // Response: ResponseEntity<User>
    return ResponseEntity.ok(user);
}
```

#### Extraction Output
```typescript
interface APIEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string; // e.g., "/api/users/:id"
  openapi_path: string; // e.g., "/api/users/{id}"
  parameters: Parameter[];
  request_body?: RequestBody;
  responses: Response[];
  tags: string[];
  summary?: string;
  description?: string;
}

interface Parameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required: boolean;
  schema: Schema;
  description?: string;
}

interface RequestBody {
  content: {
    [contentType: string]: {
      schema: Schema;
    };
  };
  required: boolean;
}

interface Response {
  status_code: number;
  description?: string;
  content?: {
    [contentType: string]: {
      schema: Schema;
    };
  };
}
```

---

### 2. OpenAPI/Spec Generation

#### Generation Process
**Step 1: Extract Endpoints**
1. Parse code for API endpoints (via Code Parser Service)
2. Extract metadata (method, path, parameters, etc.)
3. Group endpoints by tags/paths

**Step 2: Generate Schemas**
1. Extract TypeScript interfaces, Python classes, Java classes
2. Convert to JSON Schema
3. Resolve references, inheritance
4. Add descriptions (from docstrings, comments)

**Step 3: Build OpenAPI Spec**
1. Create OpenAPI 3.0/3.1 structure
2. Add info (title, version, description)
3. Add servers (base URLs)
4. Add paths (endpoints)
5. Add components (schemas, security)

**Step 4: Enhance with LLM**
1. Generate descriptions for endpoints (via LLM)
2. Generate examples (request/response)
3. Add tags, categories
4. Improve clarity

#### OpenAPI Structure
```yaml
openapi: 3.1.0
info:
  title: My API
  version: 1.0.0
  description: Auto-generated API documentation

servers:
  - url: https://api.example.com
    description: Production server

paths:
  /api/users/{id}:
    get:
      summary: Get user by ID
      description: Retrieve a user by their ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: User found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          description: User not found

components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        email:
          type: string
```

#### LLM Enhancement Prompt
```
Generate OpenAPI documentation for the following endpoint:

Method: {method}
Path: {path}
Parameters: {parameters}
Request Body: {request_body}
Response: {response}

Requirements:
- Write clear, concise descriptions
- Add examples for request/response
- Suggest appropriate tags
- Follow OpenAPI best practices
```

---

### 3. Merge-Triggered Updates

#### Trigger Flow
**Step 1: Detect Merge**
1. Receive `merge.completed` event (from git host webhook)
2. Extract merged commit SHA
3. Identify changed files

**Step 2: Analyze Changes**
1. Parse changed files for API endpoints
2. Detect new endpoints, modified endpoints, deleted endpoints
3. Identify schema changes

**Step 3: Generate/Update Docs**
1. Generate OpenAPI spec for changed endpoints
2. Update existing spec (merge changes)
3. Generate markdown documentation
4. Update existing docs

**Step 4: Commit/Publish**
1. Commit docs to repo (or create PR)
2. Publish to artifact storage (if configured)
3. Notify team (Slack, email)

#### Update Strategy
**Strategy 1: Direct Commit**
- **Process:** Commit docs directly to main branch
- **Use when:** Trusted automation, simple workflow
- **Config:** `update_strategy: "commit"`

**Strategy 2: PR Creation**
- **Process:** Create PR with doc updates
- **Use when:** Review required, complex workflow
- **Config:** `update_strategy: "pr"`

**Strategy 3: Artifact Only**
- **Process:** Publish to artifact storage, don't commit to repo
- **Use when:** Docs hosted externally
- **Config:** `update_strategy: "artifact"`

---

### 4. Artifact Storage and Publishing

#### Storage Options

**Option 1: GitHub Releases**
- **Format:** Attach OpenAPI spec as release asset
- **Process:** Create release, attach spec file
- **Config:** `storage: { type: "github_releases", repo: "..." }`

**Option 2: S3/Cloud Storage**
- **Format:** Upload spec file to S3 bucket
- **Process:** Upload file, set public/private
- **Config:** `storage: { type: "s3", bucket: "...", path: "..." }`

**Option 3: Artifact Registry**
- **Format:** Upload to artifact registry (npm, PyPI, etc.)
- **Process:** Publish package with docs
- **Config:** `storage: { type: "registry", registry: "npm", package: "..." }`

**Option 4: Custom Webhook**
- **Format:** POST spec to webhook URL
- **Process:** Send spec via HTTP POST
- **Config:** `storage: { type: "webhook", url: "..." }`

#### Publishing Process
```typescript
async function publishArtifact(spec: OpenAPISpec, config: StorageConfig): Promise<void> {
  switch (config.type) {
    case "github_releases":
      await createGitHubRelease(config.repo, spec);
      break;
    case "s3":
      await uploadToS3(config.bucket, config.path, spec);
      break;
    case "registry":
      await publishToRegistry(config.registry, config.package, spec);
      break;
    case "webhook":
      await postToWebhook(config.url, spec);
      break;
  }
}
```

---

### 5. Drift Prevention Strategy

#### Drift Detection
**Purpose:** Detect when code and docs are out of sync

**Process:**
1. **Parse current code:** Extract endpoints from current code
2. **Parse current docs:** Extract endpoints from OpenAPI spec
3. **Compare:** Find differences
4. **Report:** List missing endpoints, extra endpoints, changed endpoints

#### Drift Types

**Type 1: Missing Endpoints**
- **Detection:** Endpoint in code, not in docs
- **Action:** Generate docs for missing endpoint
- **Severity:** High (docs incomplete)

**Type 2: Extra Endpoints**
- **Detection:** Endpoint in docs, not in code
- **Action:** Remove from docs (or mark deprecated)
- **Severity:** Medium (docs outdated)

**Type 3: Changed Endpoints**
- **Detection:** Endpoint in both, but parameters/response changed
- **Action:** Update docs to match code
- **Severity:** High (docs incorrect)

**Type 4: Schema Drift**
- **Detection:** Schema in code doesn't match schema in docs
- **Action:** Update schema in docs
- **Severity:** High (docs incorrect)

#### Drift Detection Output
```typescript
interface DriftReport {
  missing_endpoints: APIEndpoint[];
  extra_endpoints: APIEndpoint[];
  changed_endpoints: {
    endpoint: APIEndpoint;
    changes: {
      parameter_added?: Parameter;
      parameter_removed?: Parameter;
      response_changed?: Response;
    };
  }[];
  schema_drift: {
    schema_name: string;
    code_schema: Schema;
    doc_schema: Schema;
    differences: string[];
  }[];
}
```

#### Drift Prevention Actions
**Action 1: Auto-Update**
- **Process:** Automatically update docs to match code
- **Use when:** Trusted automation, simple changes
- **Config:** `drift_prevention: { action: "auto_update" }`

**Action 2: Alert Only**
- **Process:** Detect drift, alert team (Slack, email)
- **Use when:** Manual review required
- **Config:** `drift_prevention: { action: "alert" }`

**Action 3: Block Merge**
- **Process:** Detect drift, block PR merge
- **Use when:** Strict compliance required
- **Config:** `drift_prevention: { action: "block" }`

---

## Implementation Details

### Documentation Generation Pipeline

#### Step 1: Code Analysis
1. Parse code for API endpoints (via Code Parser Service)
2. Extract schemas (TypeScript interfaces, Python classes, etc.)
3. Extract metadata (descriptions, examples)

#### Step 2: Spec Generation
1. Build OpenAPI spec structure
2. Add endpoints, schemas, metadata
3. Enhance with LLM (descriptions, examples)

#### Step 3: Documentation Generation
1. Generate markdown from OpenAPI spec
2. Add code examples, usage guides
3. Format for readability

#### Step 4: Update/Publish
1. Update existing docs (merge changes)
2. Commit to repo (or create PR)
3. Publish to artifact storage

#### Step 5: Drift Detection
1. Compare code and docs
2. Generate drift report
3. Take action (update, alert, block)

---

### Performance Considerations

#### Caching
- **Endpoint extraction:** Cache parsed endpoints (TTL 1 hour)
- **Spec generation:** Cache generated specs (TTL 24 hours)
- **Drift detection:** Cache drift reports (TTL 5 minutes)

#### Incremental Updates
- **Only changed files:** Process only files changed in merge
- **Merge strategy:** Merge changes into existing spec
- **Minimal diffs:** Generate minimal changes

#### Timeouts
- **Code parsing:** 5 minutes per repo
- **Spec generation:** 2 minutes per endpoint
- **LLM enhancement:** 30 seconds per endpoint

---

### Error Handling

#### Generation Failures
- **Parsing errors:** Log error, skip file, continue with others
- **LLM failures:** Use basic spec without LLM enhancement
- **Schema errors:** Log error, use fallback schema

#### Update Failures
- **Merge conflicts:** Create PR for manual resolution
- **Commit failures:** Retry with exponential backoff (max 3 retries)
- **Publish failures:** Log error, alert ops team

#### Graceful Degradation
- **Partial updates:** Update docs for successful endpoints, log errors for failures
- **Fallback:** Use basic spec if advanced features fail
- **User notification:** Post error comment if update fails completely

---

## Configuration

### Repo-Level Configuration
```yaml
# .readylayer.yml
docs:
  enabled: true
  framework: "express" # Auto-detect if not specified
  
  openapi:
    version: "3.1.0"
    output_path: "docs/openapi.yaml"
    enhance_with_llm: true
  
  markdown:
    enabled: true
    output_path: "docs/api.md"
    template: "default" # default, custom
  
  update_strategy: "pr" # commit, pr, artifact
  branch: "main"
  
  storage:
    type: "github_releases" # github_releases, s3, registry, webhook
    repo: "acme/api-docs"
    # Or for S3:
    # type: "s3"
    # bucket: "api-docs"
    # path: "openapi.yaml"
  
  drift_prevention:
    enabled: true
    action: "auto_update" # auto_update, alert, block
    check_on: "pr" # pr, merge, both
  
  excluded_paths:
    - "**/vendor/**"
    - "**/node_modules/**"
    - "**/*.test.ts"
```

---

## Acceptance Criteria

### Functional Requirements
1. ✅ Extract API endpoints from code (Express, Fastify, Flask, Django, Spring Boot)
2. ✅ Generate OpenAPI 3.0/3.1 specs
3. ✅ Generate markdown documentation
4. ✅ Update docs on merge (commit or PR)
5. ✅ Publish to artifact storage (GitHub Releases, S3, etc.)
6. ✅ Detect documentation drift
7. ✅ Prevent drift (auto-update, alert, block)

### Non-Functional Requirements
1. ✅ Generate docs within 5 minutes per repo (P95)
2. ✅ Support 5+ frameworks
3. ✅ Handle repos with 100+ endpoints
4. ✅ Cache results to reduce API calls
5. ✅ Graceful degradation on failures

### Quality Requirements
1. ✅ Generated specs are valid OpenAPI (>99%)
2. ✅ Generated docs are accurate (>95% match with code)
3. ✅ Drift detection accuracy (>99%)
4. ✅ False positive rate <5% (drift detection)

---

## Future Enhancements

### Phase 2
- **GraphQL support:** Generate GraphQL schemas
- **gRPC support:** Generate Protocol Buffer docs
- **Interactive docs:** Generate Swagger UI, ReDoc
- **Versioning:** Support API versioning in docs

### Phase 3
- **Client SDK generation:** Generate client SDKs from OpenAPI spec
- **Mock servers:** Generate mock servers from spec
- **Contract testing:** Validate API contracts
- **API testing:** Generate API tests from spec
