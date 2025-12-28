# ReadyLayer — Review Guard Specification

## Overview

Review Guard is ReadyLayer's AI-aware code review system. It analyzes AI-generated code for security vulnerabilities, quality issues, and maintainability risks, then provides actionable feedback through PR comments and status checks.

---

## Core Functionality

### 1. Diff Ingestion and Context Building

#### Diff Ingestion
**Input:** PR diff (from GitHub/GitLab/Bitbucket API)

**Process:**
1. Fetch PR diff via git host API
2. Parse diff format (unified diff, JSON, etc.)
3. Extract file changes (added, modified, deleted)
4. Extract line-level changes (additions, deletions, context)

**Output:** Normalized diff structure
```typescript
interface Diff {
  files: FileChange[];
  base_sha: string;
  head_sha: string;
  total_additions: number;
  total_deletions: number;
}

interface FileChange {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  hunks: Hunk[];
}

interface Hunk {
  old_start: number;
  new_start: number;
  old_lines: number;
  new_lines: number;
  lines: Line[];
}

interface Line {
  type: "addition" | "deletion" | "context";
  content: string;
  line_number: number;
}
```

#### Context Building
**Purpose:** Build context for AI-aware analysis

**Process:**
1. **File history:** Fetch recent commits for changed files (last 10 commits)
2. **Related files:** Detect imports, dependencies, related modules
3. **Code patterns:** Extract code patterns (functions, classes, imports)
4. **AI detection:** Detect if code is AI-generated (commit message, author, patterns)
5. **Repository context:** Fetch repo config, rules, thresholds

**Output:** Context object
```typescript
interface ReviewContext {
  repo: RepoInfo;
  pr: PRInfo;
  diff: Diff;
  file_history: FileHistory[];
  related_files: string[];
  ai_detected: boolean;
  ai_tool?: "copilot" | "cursor" | "claude" | "other";
  config: RepoConfig;
}
```

---

### 2. Rule Types

#### Security Rules
**Purpose:** Detect security vulnerabilities

**Rule Categories:**
- **SQL Injection:** Detect unparameterized queries, string concatenation in SQL
- **XSS:** Detect unsanitized user input in HTML/JS
- **Secrets:** Detect hardcoded secrets (API keys, passwords, tokens)
- **Insecure Dependencies:** Detect vulnerable dependencies (CVE database)
- **Authentication:** Detect weak authentication, missing authorization
- **Encryption:** Detect weak encryption, missing HTTPS

**Example Rules:**
```typescript
{
  id: "security.sql-injection",
  name: "SQL Injection Risk",
  severity: "critical",
  pattern: /(\$|\+|\`).*SELECT|INSERT|UPDATE|DELETE/i,
  context: "sql_query",
  suggestion: "Use parameterized queries or ORM"
}
```

#### Quality Rules
**Purpose:** Detect code quality issues

**Rule Categories:**
- **Complexity:** Cyclomatic complexity, cognitive complexity
- **Maintainability:** Code duplication, long functions, large files
- **Performance:** N+1 queries, inefficient algorithms, memory leaks
- **Error Handling:** Missing error handling, swallowed exceptions
- **Code Smells:** Magic numbers, long parameter lists, god objects

**Example Rules:**
```typescript
{
  id: "quality.high-complexity",
  name: "High Cyclomatic Complexity",
  severity: "high",
  threshold: 15,
  metric: "cyclomatic_complexity",
  suggestion: "Break down function into smaller functions"
}
```

#### Style Rules
**Purpose:** Enforce coding style and conventions

**Rule Categories:**
- **Formatting:** Indentation, spacing, line length
- **Naming:** Variable names, function names, class names
- **Structure:** Import order, file organization
- **Documentation:** Missing docstrings, incomplete comments

**Example Rules:**
```typescript
{
  id: "style.missing-docstring",
  name: "Missing Docstring",
  severity: "low",
  pattern: /^def\s+\w+\([^)]*\):\s*$/m,
  suggestion: "Add docstring describing function purpose"
}
```

#### AI-Specific Rules
**Purpose:** Detect AI-generated code issues

**Rule Categories:**
- **Hallucination Detection:** Detect incorrect API usage, non-existent methods
- **Context Gaps:** Detect missing imports, undefined variables
- **Pattern Repetition:** Detect repetitive AI-generated patterns
- **Incomplete Code:** Detect incomplete implementations, TODOs

**Example Rules:**
```typescript
{
  id: "ai.hallucination",
  name: "Potential AI Hallucination",
  severity: "high",
  detection: "llm_analysis", // Requires LLM analysis
  suggestion: "Verify API usage, check documentation"
}
```

---

### 3. Severity Levels

#### Critical
**Definition:** Security vulnerabilities, data loss risks, system crashes

**Examples:**
- SQL injection vulnerabilities
- Hardcoded secrets
- Missing authentication
- Buffer overflows

**Action:** Block PR merge (if configured)

#### High
**Definition:** Quality issues that could cause bugs or maintenance problems

**Examples:**
- High complexity (hard to maintain)
- Missing error handling
- Performance issues
- Code duplication

**Action:** Warn in PR, optionally block (if configured)

#### Medium
**Definition:** Style issues, minor quality problems

**Examples:**
- Missing documentation
- Code smells
- Style violations
- Minor performance issues

**Action:** Warn in PR, don't block

#### Low
**Definition:** Suggestions, best practices

**Examples:**
- Style suggestions
- Documentation improvements
- Code organization

**Action:** Info comment, don't block

---

### 4. Block vs. Warn Logic

#### Block Conditions
**PR is blocked from merge if:**
1. Critical issues found AND `fail_on_critical: true`
2. High issues found AND `fail_on_high: true`
3. Coverage below threshold AND `enforce_coverage: true`

**Block Mechanism:**
- Update status check to "failure"
- Post PR comment explaining block
- Prevent merge (via git host API)

#### Warn Conditions
**PR shows warnings (but doesn't block) if:**
1. Medium/Low issues found
2. High issues found BUT `fail_on_high: false`
3. Critical issues found BUT `fail_on_critical: false`

**Warn Mechanism:**
- Update status check to "success" (with warnings)
- Post PR comments with warnings
- Allow merge (user can override)

#### Configuration
```typescript
interface ReviewConfig {
  fail_on_critical: boolean; // Default: true
  fail_on_high: boolean; // Default: false
  fail_on_medium: boolean; // Default: false
  fail_on_low: boolean; // Default: false
  severity_overrides: {
    [rule_id: string]: "critical" | "high" | "medium" | "low" | "ignore";
  };
}
```

---

### 5. Output Formats

#### Inline Comments
**Format:** Line-level comments on specific code lines

**Structure:**
```typescript
interface InlineComment {
  path: string;
  line: number;
  side: "LEFT" | "RIGHT"; // For diff view
  body: string;
  severity: "critical" | "high" | "medium" | "low";
  rule_id: string;
  suggestion?: string;
}
```

**Example:**
```
src/auth.ts:42
Security issue: potential SQL injection
Rule: security.sql-injection
Suggestion: Use parameterized queries
```

#### Summary Comment
**Format:** PR-level summary comment

**Structure:**
```typescript
interface SummaryComment {
  body: string;
  issues_by_severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  files_affected: number;
  rules_triggered: string[];
}
```

**Example:**
```
## ReadyLayer Review Summary

**Issues Found:** 5
- 🔴 Critical: 1
- 🟠 High: 2
- 🟡 Medium: 2

**Files Affected:** 3
- src/auth.ts (1 critical, 1 high)
- src/utils.ts (1 high, 1 medium)
- src/api.ts (1 medium)

**Rules Triggered:**
- security.sql-injection
- quality.high-complexity
- style.missing-docstring

[View full report](https://readylayer.com/reviews/review_123)
```

#### Status Checks
**Format:** Git host status check

**Structure:**
```typescript
interface StatusCheck {
  state: "success" | "failure" | "pending" | "error";
  description: string;
  target_url: string;
  context: string; // e.g., "readylayer/review"
}
```

**Examples:**
- **Success:** "Review completed, no issues found"
- **Failure:** "Review completed, 1 critical issue found"
- **Pending:** "Review in progress..."
- **Error:** "Review failed: API error"

---

## Implementation Details

### Analysis Pipeline

#### Step 1: Static Analysis
**Purpose:** Fast, rule-based analysis

**Process:**
1. Parse code to AST (via Code Parser Service)
2. Apply static analysis rules (regex, AST patterns)
3. Detect security patterns, code smells
4. Calculate metrics (complexity, coverage)

**Output:** List of issues from static analysis

#### Step 2: LLM Analysis
**Purpose:** AI-aware analysis for context-dependent issues

**Process:**
1. Build prompt with code context
2. Call LLM Service (GPT-4, Claude)
3. Parse LLM response for issues
4. Validate LLM findings (reduce false positives)

**Output:** List of issues from LLM analysis

#### Step 3: Aggregation
**Purpose:** Combine results from multiple sources

**Process:**
1. Merge static analysis and LLM results
2. Deduplicate issues (same rule, same location)
3. Prioritize by severity
4. Apply user overrides

**Output:** Final list of issues

#### Step 4: Comment Generation
**Purpose:** Generate human-readable comments

**Process:**
1. Format each issue as comment
2. Generate summary comment
3. Group comments by file
4. Apply formatting (markdown, code blocks)

**Output:** Comments ready to post

---

### Performance Considerations

#### Caching
- **Diff caching:** Cache parsed diffs (TTL 5 minutes)
- **Analysis caching:** Cache analysis results for unchanged code (TTL 1 hour)
- **LLM caching:** Cache LLM responses for similar code patterns (TTL 24 hours)

#### Parallelization
- **File-level:** Analyze files in parallel
- **Rule-level:** Apply rules in parallel
- **LLM calls:** Batch LLM calls when possible

#### Timeouts
- **Analysis timeout:** 5 minutes per PR
- **LLM timeout:** 30 seconds per call
- **API timeout:** 10 seconds per API call

---

### Error Handling

#### Transient Failures
- **Network errors:** Retry with exponential backoff (max 3 retries)
- **API rate limits:** Queue request, retry later
- **LLM failures:** Fallback to static analysis only

#### Permanent Failures
- **Invalid diff:** Log error, skip review
- **Unsupported language:** Log warning, skip file
- **Configuration errors:** Log error, use defaults

#### Graceful Degradation
- **Partial analysis:** Return results for analyzed files, log errors for failed files
- **Fallback rules:** Use basic rules if advanced rules fail
- **User notification:** Post error comment if review fails completely

---

## Configuration

### Repo-Level Configuration
```yaml
# .readylayer.yml
review:
  enabled: true
  fail_on_critical: true
  fail_on_high: false
  fail_on_medium: false
  fail_on_low: false
  
  rules:
    - id: security.sql-injection
      enabled: true
      severity: critical
    - id: quality.high-complexity
      enabled: true
      severity: high
      threshold: 15
    - id: style.missing-docstring
      enabled: false
  
  severity_overrides:
    security.sql-injection: critical
    quality.high-complexity: high
  
  excluded_paths:
    - "**/vendor/**"
    - "**/node_modules/**"
    - "**/*.test.ts"
```

### Org-Level Configuration
```yaml
# Org-level defaults
review:
  default_rules: ["security", "quality"]
  fail_on_critical: true
  fail_on_high: false
```

---

## Acceptance Criteria

### Functional Requirements
1. ✅ Analyze PR diffs for security, quality, and style issues
2. ✅ Detect AI-generated code and apply AI-specific rules
3. ✅ Post inline comments on specific code lines
4. ✅ Post summary comment with issue breakdown
5. ✅ Update status check (pass/fail based on issues)
6. ✅ Block PR merge on critical issues (if configured)
7. ✅ Support custom rules and severity overrides
8. ✅ Exclude paths from analysis (vendor, node_modules, etc.)

### Non-Functional Requirements
1. ✅ Complete analysis within 5 minutes (P95)
2. ✅ Handle PRs with 100+ files
3. ✅ Support 10+ languages (TypeScript, Python, Java, Go, etc.)
4. ✅ Cache results to reduce API calls
5. ✅ Graceful degradation on failures
6. ✅ Audit logging for all reviews

### Quality Requirements
1. ✅ False positive rate <5% (validated by user feedback)
2. ✅ Critical issue detection rate >95%
3. ✅ Comment clarity (actionable suggestions)
4. ✅ Performance (no significant CI slowdown)

---

## Future Enhancements

### Phase 2
- **Custom rule editor:** UI for creating custom rules
- **Rule marketplace:** Community-shared rules
- **Historical trends:** Track issue trends over time
- **Auto-fix:** Suggest code fixes (via LLM)

### Phase 3
- **Multi-language rules:** Rules that work across languages
- **Compliance rules:** SOC2, HIPAA, PCI-DSS rule sets
- **Risk scoring:** Overall risk score for PR
- **Comparison:** Compare PRs to similar PRs
