# Founder AI Usage Map

**Extracted from:** Git history, commit patterns, postmortems, and codebase analysis  
**Date:** 2024-12-19  
**Purpose:** Document REAL AI usage patterns, not aspirational ones

---

## WHERE AI IS USED

### 1. Code Generation (Primary)
- **Pattern:** Bulk code generation via Cursor
- **Evidence:** All branch names contain `cursor/` prefix
- **Frequency:** Multiple PRs per day
- **Files:** Services, API routes, middleware, components

### 2. Refactoring Passes (High Risk)
- **Pattern:** "Refactor: Improve X" commits
- **Examples:**
  - "Refactor: Improve type safety and error handling"
  - "Refactor: Improve input validation and type safety"
  - "Refactor: Improve error logging in auth and middleware"
- **Risk:** Overconfident bulk changes that break things

### 3. Type Safety "Improvements"
- **Pattern:** Multiple sequential commits fixing type issues
- **Evidence:** 5+ commits with "type safety" in message
- **Issue:** AI generates code that compiles but has type erosion

### 4. Error Handling "Improvements"
- **Pattern:** AI adds error handling that looks right but misses edge cases
- **Evidence:** Multiple "Improve error handling" commits followed by fixes

### 5. Middleware/Auth Changes
- **Pattern:** AI generates auth code without understanding Edge runtime constraints
- **Evidence:** POSTMORTEM.md documents Edge runtime crashes
- **Frequency:** Critical production failures

### 6. Schema Migrations
- **Pattern:** AI generates migrations that drift from application assumptions
- **Evidence:** Backend contract validation system created to catch this
- **Risk:** Schema changes that break runtime code

---

## HOW AI SUGGESTIONS ENTER CODEBASE

### Method 1: Inline Suggestions (Low Risk)
- Cursor inline completions
- Usually small, context-aware
- **Risk Level:** Low

### Method 2: Bulk Paste (Medium Risk)
- Copy-paste large blocks from ChatGPT/Claude
- **Risk:** Missing context, wrong assumptions
- **Evidence:** Large "Refactor:" commits

### Method 3: Refactor Passes (HIGH RISK)
- AI suggests "improve this entire file"
- **Risk:** Overconfident changes that break edge cases
- **Evidence:** Multiple "Fix:" commits after "Refactor:" commits

### Method 4: Migration Generation (CRITICAL RISK)
- AI generates database migrations
- **Risk:** Schema drift, breaking changes
- **Evidence:** Backend contract validation system

---

## WHERE AI OUTPUT IS TRUSTED TOO MUCH

### 1. TypeScript Types
- **Issue:** AI generates `any` types or loose types that compile
- **Evidence:** Multiple "Improve type safety" commits
- **Impact:** Runtime type errors, type erosion over time

### 2. Error Handling
- **Issue:** AI adds try/catch that looks right but doesn't handle all cases
- **Evidence:** Error handling "improvements" followed by fixes
- **Impact:** Silent failures, missing error boundaries

### 3. Runtime Compatibility
- **Issue:** AI doesn't understand Edge vs Node runtime constraints
- **Evidence:** POSTMORTEM.md - middleware crashes
- **Impact:** Production 500 errors

### 4. Import Statements
- **Issue:** AI adds imports that aren't used, or uses wrong imports
- **Evidence:** "Remove unused import" commits
- **Impact:** Dead code, bundle size bloat

### 5. Schema Changes
- **Issue:** AI generates migrations without understanding application code
- **Evidence:** Backend contract validation needed
- **Impact:** Runtime errors, data corruption

---

## WHERE AI OUTPUT CREATES FOLLOW-ON CLEANUP

### 1. Type Assertions
- **Pattern:** AI adds `as any` or type assertions to "fix" errors
- **Cleanup:** Later commits remove assertions and fix properly
- **Frequency:** High

### 2. Unused Code
- **Pattern:** AI generates code that's never called
- **Cleanup:** "Remove unused import/function" commits
- **Frequency:** Medium

### 3. Commented-Out Code
- **Pattern:** AI leaves commented code "for reference"
- **Cleanup:** Manual cleanup passes
- **Frequency:** Low

### 4. Over-Engineering
- **Pattern:** AI adds abstractions that aren't needed
- **Cleanup:** Simplification commits
- **Frequency:** Medium

---

## WHERE AI OUTPUT CREATES PRE-DEPLOY ANXIETY

### 1. Edge Runtime Compatibility
- **Anxiety:** "Will this work in Edge runtime?"
- **Evidence:** POSTMORTEM.md documents production crashes
- **Manual Check:** Review imports for Node-only modules

### 2. Type Safety
- **Anxiety:** "Are these types actually correct?"
- **Evidence:** Multiple type safety fixes
- **Manual Check:** Review for `any`, loose types

### 3. Schema Drift
- **Anxiety:** "Does this migration match the code?"
- **Evidence:** Backend contract validation created
- **Manual Check:** Run db:verify script

### 4. Error Handling
- **Anxiety:** "Did AI handle all error cases?"
- **Evidence:** Error handling fixes
- **Manual Check:** Review try/catch blocks

### 5. Auth/Authorization
- **Anxiety:** "Is this secure?"
- **Evidence:** CRITICAL-FIXES-SUMMARY.md documents auth bugs
- **Manual Check:** Review auth checks, test manually

---

## AI USAGE PATTERNS SUMMARY

### High-Confidence, Low-Context Changes
- **Pattern:** AI makes changes with high confidence but low context
- **Example:** "Refactor: Improve error handling" changes entire file
- **Risk:** Breaks edge cases, introduces regressions

### Build-Time vs Runtime Disconnects
- **Pattern:** Code compiles but fails at runtime
- **Example:** Edge runtime imports Node-only modules
- **Risk:** Production crashes

### Type Erosion Over Time
- **Pattern:** AI uses `any` or loose types to "fix" errors
- **Risk:** Type safety degrades, runtime errors increase

### Schema Drift
- **Pattern:** Migrations don't match application code
- **Risk:** Runtime errors, data corruption

### Overconfident Refactors
- **Pattern:** AI suggests "improve entire file" without understanding impact
- **Risk:** Breaks working code, introduces bugs

---

## FOUNDER-SPECIFIC PAIN POINTS

1. **"Did I check Edge runtime compatibility?"** → Manual review of imports
2. **"Are these types actually safe?"** → Manual type review
3. **"Does this migration break anything?"** → Manual schema review
4. **"Did AI handle all error cases?"** → Manual error handling review
5. **"Is this secure?"** → Manual auth review
6. **"Did AI leave unused code?"** → Manual dead code review

**All of these should be automated by ReadyLayer.**
