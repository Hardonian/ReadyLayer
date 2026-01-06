# ReadyLayer Killer Demo: "The Proof Is In The Pack"

This guide walks you through a complete "Golden Path" demo of ReadyLayer. It demonstrates how the system blocks a risky AI-generated change, enforces test coverage, and produces a cryptographic **Evidence Pack** that proves the codebase is safe.

## 🎯 Demo Objective
Show stakeholders that ReadyLayer is not just a linter—it's an **enforcement layer** that creates immutable proof of quality for every AI-generated commit.

## 🎬 Prerequisites
- Local environment running (`npm run dev`)
- Database seeded (`npm run db:reconcile` or `prisma migrate dev`)
- Authenticated user (visit `http://localhost:3000` and sign in/up)

## 🚀 Step-by-Step Walkthrough

### 1. The "Lazy Copilot" Commit (Failure Mode)
First, we simulate a typical "Copilot-generated" feature that looks good but has hidden risks.

1.  **Navigate to Sandbox**: Go to [http://localhost:3000/dashboard/runs/sandbox](http://localhost:3000/dashboard/runs/sandbox).
2.  **Trigger Run**: Click **"Start Sandbox Demo"**.
    *   *Context*: This simulates a GitHub webhook event for a new PR.
    *   *Input*: A "Refactor User Auth" PR that removes error handling and adds an SQL injection vulnerability (simulated).
3.  **Observe Blocking**:
    *   The run status will move to **Failed**.
    *   **Review Guard** will show `Blocked`.
    *   **Finding**: "Critical Security Vulnerability: SQL Injection detected".
    *   **Finding**: "High Risk: Large refactor without error handling".

### 2. The "Enforcement" (Audit Trail)
Show that this failure is recorded and auditable.

1.  **Click Run Details**: Open the failed run.
2.  **Show Evidence**:
    *   Point out the **"AI-Touched Detected"** badge (triggered by the commit message/content).
    *   Show the **"Policy Gate: Blocked"** status.
3.  **Audit Log**:
    *   Navigate to **Settings -> Audit Log**.
    *   Show the `REVIEW_BLOCKED` event.
    *   Explain: "This event is hash-chained. We can prove this PR was blocked at this exact time."

### 3. The "Fix & Verify" (Success Mode)
Now, simulate the developer fixing the code (adding tests and sanitization).

*Note: In the sandbox, you can't "fix" the code live, but you can explain the flow:*
> "If the developer pushes a fix, ReadyLayer re-runs. If coverage hits 80% and security issues are gone, it passes."

### 4. The "Evidence Pack" (The Closer)
This is the "money shot" for enterprise/compliance.

1.  **Navigate to a Passed Run** (or use a pre-seeded one from `npm run prisma:seed`).
2.  **Click "Download Signed Proof"** (on the Run or Policy Widget).
3.  **Open the JSON**:
    *   Show `meta.bundleId`.
    *   Show `integrity.contentHash`.
    *   Show `auditTrail` with previous hashes.
4.  **Pitch**: "This JSON file is your compliance artifact. You can zip it, archive it, or send it to auditors. It proves exactly *why* this code was allowed into production."

## 🧩 Key Concepts to Highlight

1.  **Deterministic Gates**: "Same input = same result. No AI hallucinations deciding your security posture."
2.  **Billing Enforcement**: "We track every token. If you hit your budget, we fail-safe (or fail-open based on config) so you never get a surprise bill."
3.  **Tenant Isolation**: "Your policy rules and audit logs are cryptographically isolated from other tenants."

---

## 🛠️ Troubleshooting
- **Run stuck in pending?** Check `npm run worker:job` is running (if using redis) or ensure the API handles it synchronously in dev mode.
- **Audit log empty?** Ensure you ran `npm run prisma:generate` after the latest schema changes.
