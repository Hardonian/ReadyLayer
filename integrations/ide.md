# ReadyLayer — IDE Integrations (VS Code, JetBrains)

## Overview

ReadyLayer provides IDE extensions for VS Code and JetBrains IDEs (IntelliJ, WebStorm, etc.). IDE integrations enable developers to see ReadyLayer feedback directly in their editor, without switching to PRs or dashboards.

---

## VS Code Extension

### Core Use Cases

#### 1. Inline Code Review Feedback
**Use Case:** See ReadyLayer review comments directly in VS Code

**Flow:**
1. Developer opens file in VS Code
2. Extension detects AI-generated code (via git blame, commit message)
3. Extension calls ReadyLayer API to get review results
4. Extension displays inline diagnostics (errors, warnings)
5. Developer sees issues before committing

**Value:** Catch issues early, before PR

---

#### 2. Test Generation Preview
**Use Case:** Preview generated tests before committing

**Flow:**
1. Developer writes code (AI-generated or manual)
2. Extension detects missing tests
3. Extension calls ReadyLayer API to generate tests
4. Extension shows preview in side panel
5. Developer reviews and accepts/rejects tests

**Value:** Generate tests on-demand, review before commit

---

#### 3. Documentation Preview
**Use Case:** Preview API docs as you write code

**Flow:**
1. Developer writes API endpoint
2. Extension detects API changes
3. Extension calls ReadyLayer API to generate docs
4. Extension shows preview in side panel
5. Developer reviews before committing

**Value:** See docs as you code, catch doc issues early

---

### Installation

#### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search "ReadyLayer"
4. Click Install
5. Reload VS Code

#### From Command Line
```bash
code --install-extension readylayer.readylayer-vscode
```

### Configuration

#### Authentication
1. Open VS Code Settings (Ctrl+,)
2. Search "ReadyLayer"
3. Enter API key (from ReadyLayer dashboard)
4. Or click "Sign in with GitHub" (OAuth flow)

#### Repo Configuration
Extension auto-detects repo from workspace. If multiple repos, select repo in status bar.

### Features

#### Inline Diagnostics
- **Errors:** Red squiggles (critical security issues)
- **Warnings:** Yellow squiggles (quality issues)
- **Info:** Blue squiggles (style suggestions)
- **Hover:** See full review comment on hover

#### Command Palette Commands
- `ReadyLayer: Review Current File`
- `ReadyLayer: Generate Tests`
- `ReadyLayer: Preview Documentation`
- `ReadyLayer: Open Dashboard`
- `ReadyLayer: Configure`

#### Status Bar
- **ReadyLayer icon:** Shows connection status
- **Click:** Open ReadyLayer dashboard
- **Right-click:** Quick actions menu

#### Output Panel
- **ReadyLayer channel:** Shows API calls, errors, logs
- **Debug mode:** Verbose logging for troubleshooting

### API Integration

#### Get Review Results
```typescript
GET /api/v1/reviews/{repo_id}/files/{file_path}
Headers: {
  "Authorization": "Bearer {api_key}"
}
Query: {
  "ref": "main", // branch or commit SHA
  "line": 42 // optional, specific line
}
Response: {
  "file": "src/auth.ts",
  "issues": [
    {
      "severity": "error",
      "line": 42,
      "column": 10,
      "message": "Security issue: potential SQL injection",
      "rule": "security.sql-injection",
      "suggestion": "Use parameterized queries"
    }
  ]
}
```

#### Generate Tests
```typescript
POST /api/v1/test/generate
Body: {
  "repo_id": "repo_123",
  "file_path": "src/auth.ts",
  "framework": "jest" // auto-detected or specified
}
Response: {
  "tests": [
    {
      "file_path": "src/__tests__/auth.test.ts",
      "content": "..."
    }
  ]
}
```

#### Preview Documentation
```typescript
POST /api/v1/docs/preview
Body: {
  "repo_id": "repo_123",
  "file_path": "src/api/users.ts"
}
Response: {
  "openapi": {
    "paths": {
      "/api/users": {
        "get": { ... }
      }
    }
  }
}
```

### Rate Limiting
- **Per-user:** 100 API calls/hour (from IDE)
- **Strategy:** Cache results, batch requests

### Security
- **API keys:** Stored encrypted in VS Code settings
- **OAuth:** Token stored securely, auto-refresh
- **No code sent:** Only file paths and line numbers (code fetched server-side)

---

## JetBrains IDE Extension

### Core Use Cases

#### 1. Inline Code Review Feedback
**Use Case:** See ReadyLayer review comments directly in IDE

**Flow:**
1. Developer opens file in IntelliJ/WebStorm
2. Extension detects AI-generated code
3. Extension calls ReadyLayer API to get review results
4. Extension displays inline inspections (errors, warnings)
5. Developer sees issues before committing

**Value:** Catch issues early, before PR

---

#### 2. Test Generation Preview
**Use Case:** Preview generated tests before committing

**Flow:**
1. Developer writes code
2. Extension detects missing tests
3. Extension calls ReadyLayer API to generate tests
4. Extension shows preview in tool window
5. Developer reviews and accepts/rejects tests

**Value:** Generate tests on-demand, review before commit

---

#### 3. Documentation Preview
**Use Case:** Preview API docs as you write code

**Flow:**
1. Developer writes API endpoint
2. Extension detects API changes
3. Extension calls ReadyLayer API to generate docs
4. Extension shows preview in tool window
5. Developer reviews before committing

**Value:** See docs as you code, catch doc issues early

---

### Installation

#### From JetBrains Marketplace
1. Open IntelliJ/WebStorm
2. Go to Settings → Plugins
3. Search "ReadyLayer"
4. Click Install
5. Restart IDE

#### From Disk
1. Download plugin from ReadyLayer website
2. Go to Settings → Plugins
3. Click "Install Plugin from Disk"
4. Select downloaded file
5. Restart IDE

### Configuration

#### Authentication
1. Open Settings → Tools → ReadyLayer
2. Enter API key (from ReadyLayer dashboard)
3. Or click "Sign in with GitHub" (OAuth flow)

#### Repo Configuration
Extension auto-detects repo from project. If multiple repos, select repo in status bar.

### Features

#### Inline Inspections
- **Errors:** Red highlights (critical security issues)
- **Warnings:** Yellow highlights (quality issues)
- **Info:** Blue highlights (style suggestions)
- **Tooltip:** See full review comment on hover

#### Tool Windows
- **ReadyLayer:** Main tool window with review results, tests, docs
- **Review Results:** List of issues, filterable by severity
- **Test Preview:** Generated tests, accept/reject buttons
- **Doc Preview:** Generated docs, OpenAPI spec viewer

#### Actions (Right-Click Menu)
- **Review File:** Review current file
- **Generate Tests:** Generate tests for current file
- **Preview Docs:** Preview docs for current file
- **Open Dashboard:** Open ReadyLayer dashboard in browser

#### Status Bar
- **ReadyLayer icon:** Shows connection status
- **Click:** Open ReadyLayer tool window
- **Right-click:** Quick actions menu

### API Integration

#### Same as VS Code Extension
- Uses same REST API endpoints
- Same authentication (API keys or OAuth)
- Same rate limiting (100 calls/hour)

### Rate Limiting
- **Per-user:** 100 API calls/hour (from IDE)
- **Strategy:** Cache results, batch requests

### Security
- **API keys:** Stored encrypted in IDE settings
- **OAuth:** Token stored securely, auto-refresh
- **No code sent:** Only file paths and line numbers (code fetched server-side)

---

## Common Features (Both IDEs)

### AI Code Detection
- **Git blame:** Check if code is AI-generated (via commit message, author)
- **Pattern detection:** Detect AI code patterns (LLM-generated style)
- **Manual trigger:** User can manually mark code as AI-generated

### Real-Time Feedback
- **On save:** Review file on save (configurable)
- **On change:** Review file on change (debounced, configurable)
- **Manual:** User triggers review via command/action

### Integration with Git
- **Branch detection:** Auto-detect current branch
- **Diff view:** Show review results for diff (unstaged changes)
- **Commit hook:** Optional pre-commit hook to check issues

### Error Handling
- **Network errors:** Show error message, retry button
- **API errors:** Show error message, link to dashboard
- **Rate limit:** Show warning, queue requests

### Performance
- **Caching:** Cache review results (TTL 5 minutes)
- **Debouncing:** Debounce file change events (500ms)
- **Batching:** Batch API calls when possible

---

## Developer Experience

### Onboarding
1. **Install extension:** From marketplace or disk
2. **Authenticate:** Enter API key or OAuth
3. **Open repo:** Extension auto-detects repo
4. **Start coding:** Extension works automatically

### Daily Usage
1. **Write code:** Extension detects AI-generated code
2. **See feedback:** Inline diagnostics/inspections appear
3. **Fix issues:** Click to see suggestions, fix code
4. **Generate tests:** Right-click → Generate Tests
5. **Preview docs:** Right-click → Preview Docs
6. **Commit:** Extension validates before commit (optional)

### Troubleshooting
- **Check connection:** Status bar shows connection status
- **View logs:** Output panel (VS Code) or log file (JetBrains)
- **Refresh:** Reload window (VS Code) or restart IDE (JetBrains)
- **Support:** Link to ReadyLayer support in extension settings

---

## API Requirements

### Endpoints Used
- `GET /api/v1/reviews/{repo_id}/files/{file_path}` - Get review results
- `POST /api/v1/test/generate` - Generate tests
- `POST /api/v1/docs/preview` - Preview documentation
- `GET /api/v1/repos/{repo_id}` - Get repo info

### Authentication
- **API keys:** Bearer token in Authorization header
- **OAuth:** JWT token in Authorization header (auto-refresh)

### Rate Limiting
- **Per-user:** 100 API calls/hour (from IDE)
- **Strategy:** Cache results, batch requests, show warning when approaching limit

---

## Security Considerations

### API Key Storage
- **VS Code:** Encrypted in settings (Windows Credential Manager, macOS Keychain, Linux secret service)
- **JetBrains:** Encrypted in IDE settings (similar to VS Code)

### OAuth Flow
1. User clicks "Sign in with GitHub" in extension
2. Extension opens browser to ReadyLayer OAuth page
3. User authorizes ReadyLayer
4. ReadyLayer redirects to extension callback URL
5. Extension receives token, stores securely

### Code Privacy
- **No code sent:** Extension only sends file paths and line numbers
- **Server-side fetch:** ReadyLayer fetches code from git host API
- **Caching:** Code cached server-side (TTL 1 hour), not stored

---

## Monitoring and Observability

### Metrics
- **Extension installs:** Tracked via marketplace analytics
- **API calls:** Tracked per user, per endpoint
- **Error rate:** Failed API calls, network errors
- **Usage:** Active users, files reviewed, tests generated

### Logging
- **Extension logs:** Logged to output panel (VS Code) or log file (JetBrains)
- **API calls:** Logged with correlation ID
- **Errors:** Detailed error logs with stack traces

### Analytics
- **User behavior:** Which features used most
- **Performance:** API call latency, extension responsiveness
- **Errors:** Common errors, failure patterns

---

## Best Practices

1. **Performance:** Cache results, debounce events, batch requests
2. **UX:** Show loading states, error messages, retry buttons
3. **Security:** Encrypt API keys, use OAuth when possible
4. **Privacy:** Don't send code, only file paths
5. **Reliability:** Handle network errors, rate limits gracefully
6. **Documentation:** Clear docs, tooltips, help text
