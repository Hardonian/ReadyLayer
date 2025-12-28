# ReadyLayer — Test Engine Specification

## Overview

Test Engine automatically generates tests for AI-touched code and enforces test coverage thresholds. It detects AI-generated files, generates tests using the repo's existing test framework, and ensures coverage standards are met before merge.

---

## Core Functionality

### 1. AI-Touched File Detection

#### Detection Methods
**Method 1: Commit Message Analysis**
- **Pattern:** Check commit messages for AI indicators
- **Indicators:** "AI-generated", "Copilot", "Cursor", "Claude", "GPT"
- **Confidence:** High (explicit indicator)

**Method 2: Author Analysis**
- **Pattern:** Check commit author (bot accounts, AI tools)
- **Indicators:** "github-actions[bot]", "copilot", "cursor"
- **Confidence:** Medium (may be false positive)

**Method 3: Code Pattern Analysis**
- **Pattern:** Detect AI-generated code patterns (LLM analysis)
- **Indicators:** Repetitive patterns, generic variable names, incomplete implementations
- **Confidence:** Low (requires LLM analysis)

**Method 4: File Metadata**
- **Pattern:** Check file creation/modification metadata
- **Indicators:** New files in AI-heavy PRs
- **Confidence:** Low (heuristic)

#### Detection Configuration
```typescript
interface AIDetectionConfig {
  methods: ("commit_message" | "author" | "pattern" | "metadata")[];
  confidence_threshold: number; // 0-1, default 0.7
  require_multiple_methods: boolean; // Default: false
}
```

#### Output
```typescript
interface AITouchedFile {
  path: string;
  confidence: number; // 0-1
  methods: string[]; // Which methods detected AI
  ai_tool?: "copilot" | "cursor" | "claude" | "other";
}
```

---

### 2. Test Framework Detection and Mapping

#### Framework Detection
**Process:**
1. **Scan repo:** Look for test files, config files, package.json
2. **Detect framework:** Match patterns to known frameworks
3. **Validate:** Check if framework is actually used (imports, config)

#### Supported Frameworks

**JavaScript/TypeScript:**
- **Jest:** `jest.config.js`, `*.test.ts`, `*.spec.ts`
- **Mocha:** `mocha.opts`, `test/**/*.js`
- **Vitest:** `vitest.config.ts`, `*.test.ts`
- **Ava:** `ava.config.js`, `test/**/*.js`

**Python:**
- **pytest:** `pytest.ini`, `conftest.py`, `test_*.py`
- **unittest:** `test_*.py`, `*_test.py`
- **nose2:** `nose2.cfg`, `test_*.py`

**Java:**
- **JUnit:** `*Test.java`, `@Test` annotations
- **TestNG:** `testng.xml`, `@Test` annotations

**Go:**
- **testing:** `*_test.go`, `Test*` functions
- **testify:** `*_test.go`, `assert` imports

**Ruby:**
- **RSpec:** `spec/**/*_spec.rb`
- **Minitest:** `test/**/*_test.rb`

#### Framework Mapping
```typescript
interface TestFramework {
  name: string;
  language: string;
  test_file_pattern: string; // e.g., "**/*.test.ts"
  test_function_pattern: string; // e.g., "test('...', ...)"
  config_files: string[];
  dependencies: string[];
}
```

#### Auto-Detection Logic
```typescript
function detectFramework(repo: Repo): TestFramework | null {
  // 1. Check config files
  if (exists("jest.config.js")) return frameworks.jest;
  if (exists("pytest.ini")) return frameworks.pytest;
  
  // 2. Check test files
  const testFiles = findFiles("**/*.test.ts", "**/*_test.py", ...);
  if (testFiles.length > 0) {
    // Analyze test file structure
    return inferFramework(testFiles[0]);
  }
  
  // 3. Check package.json / requirements.txt
  const deps = readDependencies();
  if (deps.includes("jest")) return frameworks.jest;
  if (deps.includes("pytest")) return frameworks.pytest;
  
  return null; // No framework detected
}
```

---

### 3. Test Generation

#### Generation Process
**Step 1: Code Analysis**
1. Parse code to AST (via Code Parser Service)
2. Extract functions, classes, methods
3. Identify inputs, outputs, dependencies
4. Detect edge cases, error conditions

**Step 2: Test Template Selection**
1. Select template based on framework
2. Customize template for code structure
3. Add imports, setup, teardown

**Step 3: LLM Generation**
1. Build prompt with code + framework + context
2. Call LLM Service (GPT-4, Claude)
3. Generate test code
4. Validate syntax (parse generated code)

**Step 4: Test Placement**
1. Determine test file location (based on placement rules)
2. Check if test file exists
3. Append or create test file
4. Format code (prettier, black, etc.)

#### Generation Prompt
```
Generate tests for the following code using {framework}:

Code:
{code}

Framework: {framework}
Test file location: {test_path}
Existing tests: {existing_tests}

Requirements:
- Cover all public functions/methods
- Test edge cases and error conditions
- Use {framework} best practices
- Match existing test style
```

#### Generated Test Structure
```typescript
// Example: Jest test for TypeScript
import { functionToTest } from '../src/module';

describe('functionToTest', () => {
  it('should handle normal case', () => {
    const result = functionToTest('input');
    expect(result).toBe('expected');
  });
  
  it('should handle edge case', () => {
    const result = functionToTest('');
    expect(result).toBeNull();
  });
  
  it('should handle error case', () => {
    expect(() => functionToTest(null)).toThrow();
  });
});
```

---

### 4. Test Placement Rules

#### Rule Types

**Rule 1: Co-located Tests**
- **Pattern:** Tests in same directory as source
- **Example:** `src/auth.ts` → `src/auth.test.ts`
- **Config:** `placement: "co-located"`

**Rule 2: Separate Test Directory**
- **Pattern:** Tests in dedicated test directory
- **Example:** `src/auth.ts` → `tests/auth.test.ts`
- **Config:** `placement: "separate", test_dir: "tests"`

**Rule 3: Mirror Structure**
- **Pattern:** Tests mirror source structure
- **Example:** `src/api/users.ts` → `src/api/users.test.ts` or `tests/api/users.test.ts`
- **Config:** `placement: "mirror"`

**Rule 4: Custom Pattern**
- **Pattern:** User-defined pattern
- **Example:** `src/**/*.ts` → `__tests__/**/*.test.ts`
- **Config:** `placement: "custom", pattern: "__tests__/{path}.test.ts"`

#### Placement Configuration
```yaml
# .readylayer.yml
test:
  placement: "co-located" # co-located, separate, mirror, custom
  test_dir: "tests" # If separate
  pattern: "__tests__/{path}.test.ts" # If custom
  create_missing_dirs: true
```

#### Placement Logic
```typescript
function determineTestPath(sourcePath: string, config: TestConfig): string {
  switch (config.placement) {
    case "co-located":
      return sourcePath.replace(/\.(ts|js|py)$/, ".test.$1");
    case "separate":
      return path.join(config.test_dir, sourcePath);
    case "mirror":
      return sourcePath.replace(/^src\//, "tests/").replace(/\.(ts|js|py)$/, ".test.$1");
    case "custom":
      return config.pattern.replace("{path}", sourcePath);
  }
}
```

---

### 5. Coverage Calculation and Enforcement

#### Coverage Calculation
**Process:**
1. **Run tests:** Execute test suite (via CI or local)
2. **Collect coverage:** Parse coverage report (lcov, cobertura, etc.)
3. **Calculate metrics:** Line coverage, branch coverage, function coverage
4. **Filter AI-touched files:** Only count coverage for AI-touched files
5. **Aggregate:** Calculate overall coverage

#### Coverage Metrics
```typescript
interface CoverageMetrics {
  lines: {
    total: number;
    covered: number;
    percentage: number;
  };
  branches: {
    total: number;
    covered: number;
    percentage: number;
  };
  functions: {
    total: number;
    covered: number;
    percentage: number;
  };
  files: {
    [path: string]: {
      lines: number;
      covered: number;
      percentage: number;
    };
  };
}
```

#### Coverage Enforcement
**Thresholds:**
```yaml
# .readylayer.yml
test:
  coverage:
    threshold: 80 # Percentage (0-100)
    metric: "lines" # lines, branches, functions
    enforce_on: "pr" # pr, merge, both
    fail_on_below: true
```

**Enforcement Logic:**
```typescript
function enforceCoverage(coverage: CoverageMetrics, config: TestConfig): EnforcementResult {
  const threshold = config.coverage.threshold;
  const metric = coverage[config.coverage.metric];
  
  if (metric.percentage < threshold) {
    return {
      passed: false,
      message: `Coverage ${metric.percentage}% below threshold ${threshold}%`,
      action: config.coverage.fail_on_below ? "block" : "warn"
    };
  }
  
  return {
    passed: true,
    message: `Coverage ${metric.percentage}% meets threshold ${threshold}%`
  };
}
```

---

### 6. CI Integration

#### CI Status Checks
**Update Status Check:**
```typescript
POST /repos/{owner}/{repo}/statuses/{sha}
Body: {
  state: "success" | "failure" | "pending",
  description: "Coverage 85% (threshold: 80%)",
  context: "readylayer/coverage"
}
```

#### CI Fail Conditions
**CI fails if:**
1. Coverage below threshold AND `fail_on_below: true`
2. Tests fail to generate (syntax errors, etc.)
3. Test execution fails (runtime errors)

**CI passes if:**
1. Coverage meets threshold
2. Tests generated successfully
3. Tests execute successfully (if run in CI)

#### CI Integration Examples

**GitHub Actions:**
```yaml
- name: ReadyLayer Test Coverage
  uses: readylayer/action-coverage@v1
  with:
    api-key: ${{ secrets.READYLAYER_API_KEY }}
    threshold: 80
    fail-on-below: true
```

**GitLab CI:**
```yaml
readylayer-coverage:
  script:
    - readylayer coverage --threshold 80 --fail-on-below
```

---

## Implementation Details

### Test Generation Pipeline

#### Step 1: Detect AI-Touched Files
1. Analyze PR diff
2. Apply detection methods
3. Filter files by confidence threshold
4. Output list of AI-touched files

#### Step 2: Check Existing Tests
1. For each AI-touched file, check if tests exist
2. Parse existing tests (if any)
3. Identify missing test coverage
4. Determine what needs to be tested

#### Step 3: Generate Tests
1. For each file needing tests:
   - Analyze code structure
   - Generate test code (via LLM)
   - Validate syntax
   - Format code
2. Place tests according to placement rules
3. Create/update test files

#### Step 4: Validate Tests
1. Parse generated tests (syntax check)
2. Check test structure (framework-specific)
3. Validate imports, dependencies
4. Run tests (if possible, in sandbox)

#### Step 5: Calculate Coverage
1. Run test suite (via CI or local)
2. Parse coverage report
3. Calculate metrics
4. Compare to threshold

#### Step 6: Enforce Coverage
1. Check if coverage meets threshold
2. Update CI status check
3. Post PR comment with coverage report
4. Block PR if below threshold (if configured)

---

### Performance Considerations

#### Caching
- **Framework detection:** Cache detected framework (TTL 24 hours)
- **Test generation:** Cache generated tests for unchanged code (TTL 1 hour)
- **Coverage calculation:** Cache coverage results (TTL 5 minutes)

#### Parallelization
- **File-level:** Generate tests for multiple files in parallel
- **Test execution:** Run tests in parallel (if supported by framework)

#### Timeouts
- **Test generation:** 2 minutes per file
- **Test execution:** 10 minutes per test suite
- **Coverage calculation:** 5 minutes per repo

---

### Error Handling

#### Generation Failures
- **LLM failure:** Retry with exponential backoff (max 3 retries)
- **Syntax errors:** Validate before committing, retry generation
- **Framework mismatch:** Log error, skip file

#### Execution Failures
- **Test failures:** Log errors, don't block PR (tests may need fixes)
- **Coverage parsing:** Log error, use fallback calculation
- **CI failures:** Log error, post warning comment

#### Graceful Degradation
- **Partial generation:** Generate tests for files that succeed, log errors for failures
- **Fallback:** Use basic test templates if LLM fails
- **User notification:** Post error comment if generation fails completely

---

## Configuration

### Repo-Level Configuration
```yaml
# .readylayer.yml
test:
  enabled: true
  framework: "jest" # Auto-detect if not specified
  placement: "co-located"
  test_dir: "tests"
  
  ai_detection:
    methods: ["commit_message", "author", "pattern"]
    confidence_threshold: 0.7
  
  coverage:
    threshold: 80
    metric: "lines"
    enforce_on: "pr"
    fail_on_below: true
  
  generation:
    include_edge_cases: true
    include_error_cases: true
    match_existing_style: true
  
  excluded_paths:
    - "**/vendor/**"
    - "**/node_modules/**"
    - "**/*.test.ts" # Don't generate tests for test files
```

---

## Acceptance Criteria

### Functional Requirements
1. ✅ Detect AI-touched files (commit message, author, pattern)
2. ✅ Detect test framework (Jest, Mocha, pytest, etc.)
3. ✅ Generate tests for AI-touched files
4. ✅ Place tests according to repo structure
5. ✅ Calculate test coverage
6. ✅ Enforce coverage thresholds
7. ✅ Update CI status checks
8. ✅ Post PR comments with test generation results

### Non-Functional Requirements
1. ✅ Generate tests within 2 minutes per file (P95)
2. ✅ Support 5+ test frameworks
3. ✅ Handle PRs with 50+ files
4. ✅ Cache results to reduce API calls
5. ✅ Graceful degradation on failures

### Quality Requirements
1. ✅ Generated tests are syntactically correct (>95%)
2. ✅ Generated tests follow framework best practices
3. ✅ Coverage calculation accuracy (>99%)
4. ✅ False positive rate <5% (AI detection)

---

## Future Enhancements

### Phase 2
- **Test execution:** Run tests in ReadyLayer sandbox
- **Test optimization:** Optimize test performance
- **Mutation testing:** Validate test quality via mutation testing
- **Visual regression:** Generate visual regression tests

### Phase 3
- **Property-based testing:** Generate property-based tests (QuickCheck, Hypothesis)
- **Integration tests:** Generate integration tests
- **E2E tests:** Generate end-to-end tests
- **Performance tests:** Generate performance/load tests
