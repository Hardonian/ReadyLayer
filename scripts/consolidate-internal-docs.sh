#!/bin/bash
set -Eeuo pipefail

# Script to consolidate internal docs to internal/ folder
# This moves agent/planning/strategy docs without deleting local copies

log_info() { echo "[INFO] $*"; }
log_warn() { echo "[WARN] $*"; }
log_error() { echo "[ERROR] $*"; }

# Define source and destination arrays
declare -a AGENT_NOTES=(
    "AGENTS.md"
    "CLAUDE.md"
    "HANDOVER_SUMMARY.md"
    "PHASE5-COMPLETION-SUMMARY.md"
    "VERIFICATION-COMPLETE.md"
    "IMPLEMENTATION-COMPLETE.md"
    "IMPLEMENTATION-COMPLETE-V2.md"
    "IMPLEMENTATION-COMPLETE-SUMMARY.md"
    "IMPLEMENTATION-COMPLETE-REALITY-CHECK.md"
    "CODEBASE-HARDENING-COMPLETE.md"
    "ALL-PHASES-COMPLETE.md"
    "ALL-NEXT-STEPS-COMPLETE.md"
    "ALL-PROVIDERS-INTEGRATION-COMPLETE.md"
    "ACTIVATION-REALITY-TEST-COMPLETE.md"
    "BACKEND-CONTRACT-VALIDATION-COMPLETE.md"
    "BUILD-VERIFICATION-COMPLETE.md"
    "BUILD-FIXES-COMPLETE.md"
    "CANONICAL-MEGA-TASK-COMPLETE.md"
    "CANONICAL-CONVERGENCE-COMPLETE.md"
    "CRITICAL-PATH-COMPLETE.md"
    "IDE-CLI-INTEGRATION-COMPLETE.md"
    "LANDING-PAGE-VALUE-DRIVERS-COMPLETE.md"
    "MULTI-PROVIDER-INTEGRATION-COMPLETE.md"
    "PHASE-1-COMPLETION-SUMMARY.md"
    "PHASE-2-COMPLETE.md"
    "POST-REALITY-HARDENING-COMPLETE.md"
    "REALITY-AUDIT-COMPLETE.md"
    "REALITY-CLOSURE-COMPLETE.md"
    "REALITY-LOCK-COMPLETE.md"
    "READYLAYER-6-PERSONAS-COMPLETE.md"
    "REVIEW-COMPLETE.md"
    "SETUP-COMPLETE.md"
    "STATUS-10-10-COMPLETE.md"
    "TEST-ENGINE-INTEGRATION-COMPLETE.md"
    "TRUST-HARDENING-COMPLETE.md"
    "UI-UX-POLISH-COMPLETE.md"
    "UI-UX-POLISH-COMPLETE-FINAL-REPORT.md"
    "VERIFICATION-COMPLETE.md"
)

declare -a PLANNING=(
    "plan.md"
    "ROADMAP.md"
    "EXECUTION-ROADMAP.md"
    "PHASE-6-VERIFICATION-CHECKLIST.md"
    "PHASE-2-AND-3-ROADMAP.md"
    "DEPLOYMENT-CHECKLIST.md"
    "DEPLOYMENT-EXECUTE.md"
    "DEPLOYMENT-GUIDE.md"
    "LAUNCH-READINESS-AUDIT.md"
    "LAUNCH-READINESS-CHECKLIST.md"
    "LAUNCH-READINESS-SUMMARY.md"
    "MIGRATION-INSTRUCTIONS.md"
    "MIGRATION-QUICK-START.md"
    "MIGRATION-READY.md"
    "RUN-MIGRATION.md"
    "SETUP-INSTRUCTIONS.md"
    "ACCESSIBILITY-TESTING-SETUP.md"
    "AUTOMATIC-MIGRATIONS-SETUP.md"
    "GITHUB-SECRETS-SETUP.md"
    "VERCEL-ENV-SETUP.md"
    "VERIFICATION_RUNBOOK.md"
)

declare -a STRATEGY=(
    "ACCESS_MAP.md"
    "AI-ANOMALY-DETECTION-FEATURE.md"
    "API-ENDPOINTS-SUMMARY.md"
    "AUDIT_REPORT.md"
    "AUDIT-FIXES-APPLIED.md"
    "BACKEND-CONTRACT-VERIFICATION.md"
    "BACKEND-MIGRATIONS-SUMMARY.md"
    "BEHAVIORAL-TIER-TABLE.md"
    "BUG_TRIAGE_SETUP_README.md"
    "BUILD-CHECKLIST.md"
    "BUILD-ERRORS-FIXED.md"
    "BUILD-FIXES-APPLIED.md"
    "CANONICAL-CONVERGENCE.md"
    "CANONICAL-CONVERGENCE-CHANGES.md"
    "CHANGE-SUMMARY.md"
    "CODE-QUALITY-REFACTOR-SUMMARY.md"
    "CODE-QUALITY-VERIFICATION.md"
    "CODE-REVIEW.md"
    "CODE-REVIEW-FINDINGS.md"
    "COMPONENT-LIBRARY.md"
    "COMPLETE-ARCHITECTURE-SUMMARY.md"
    "COMPLETION-AUDIT.md"
    "COMPLETION-REPORT.md"
    "COMPLETION-SUMMARY.md"
    "CRITICAL-FIXES-SUMMARY.md"
    "DEPENDENCY-UPGRADE-ROADMAP.md"
    "DEPLOYMENT-STATUS.md"
    "FILES_CHANGED.md"
    "FINAL-BUILD-VERIFICATION.md"
    "FINAL-COMPLETION-REPORT.md"
    "FINAL-IMPLEMENTATION-VERIFICATION.md"
    "FINAL-STATUS.md"
    "FINAL-VERIFICATION-REPORT.md"
    "FOUNDER-PAIN-EVENTS.md"
    "FOUNDER-PAIN-TO-ENFORCEMENT-MATRIX.md"
    "FOUNDER-AI-USAGE-MAP.md"
    "FREE-USER-EXPERIENCE.md"
    "FRONTEND-UPDATES-SUMMARY.md"
    "GAP-ANALYSIS-SUMMARY.md"
    "GIT-PROVIDER-IMPLEMENTATION-SUMMARY.md"
    "GIT-PROVIDER-UI-INTEGRATION.md"
    "GO-LIVE-README.md"
    "IMPLEMENTATION-SUMMARY.md"
    "IMPLEMENTATION_PACK_README.md"
    "IMPLEMENTATION_COMPLETE.md"
    "INEVITABILITY-MODE-IMPLEMENTATION.md"
    "INVARIANTS.md"
    "LANDING-PAGE-HERO-IMPLEMENTATION.md"
    "MESSAGING_UPDATE_SUMMARY.md"
    "NAVIGATION_UPGRADE_CHANGELOG.md"
    "NAVIGATION_UPGRADE_QUICK_START.md"
    "PAID-USER-EXPERIENCE.md"
    "PERFORMANCE-PROFILING-GUIDE.md"
    "POLICY-UI-GIT-PROVIDER-ADAPTATION.md"
    "POLICY-UI-PHASES.md"
    "POST-REALITY-HARDENING-PLAN.md"
    "POST-REALITY-HARDENING-SUMMARY.md"
    "POSTMORTEM.md"
    "PR-MERGE-CHECKLIST.md"
    "PRODUCT-COMPRESSION-AUDIT.md"
    "PRODUCTION-LAUNCH-SUMMARY.md"
    "PROMPT_ARCHITECTURE.md"
    "QUICK-REFERENCE.md"
    "QUICK-START.md"
    "READY-FOR-NEXT-PHASE.md"
    "READYLAYER-FOUNDER-FIRST-SUMMARY.md"
    "READYLAYER-POST-REALITY-HARDENING-EXECUTIVE-SUMMARY.md"
    "READYLAYER_COMPLETE_IMPLEMENTATION.md"
    "READYLAYER_DASHBOARD_REVIEW_NOTES.md"
    "REALITY-AUDIT.md"
    "REALITY-AUDIT-PHASE-0.md"
    "REALITY-CHECK-FINAL.md"
    "REALITY-CHECK-REPORT.md"
    "REALITY-CLOSURE-FAILURE-MATRIX.md"
    "REALITY-CLOSURE-FINAL.md"
    "REALITY-CLOSURE-MECHANICS-MAP.md"
    "REALITY_GAPS.md"
    "SECURITY-AUDIT-CHECKLIST.md"
    "SECURITY-REVIEW-LAST-10-PRS.md"
    "SECURITY_AUDIT_REPORT.md"
    "SELF-LEARNING-SYSTEM.md"
    "STRATEGIC-COMPRESSION-PHASE-1.md"
    "SUPABASE-AUTH-MIGRATION.md"
    "SUPABASE-AUTH-SUMMARY.md"
    "SYSTEM-INVARIANTS.md"
    "SYSTEM-INVARIANTS-ENHANCED.md"
    "SYSTEMIC_FINDINGS.md"
    "TEST_QUALITY_AUDIT.md"
    "THEMING-IMPLEMENTATION-SUMMARY.md"
    "THIS-IS-THE-MOMENT.md"
    "TRANSFORMATION-SUMMARY.md"
    "USAGE-ENFORCEMENT-TEST-RESULTS.md"
    "UX-SYSTEM-IMPLEMENTATION.md"
    "VERCEL-BUILD-VERIFICATION.md"
    "VERCEL-ENV-SETUP.md"
    "WEEK-3-4-COMPLETION-SUMMARY.md"
    "WHY-HARD-TO-REMOVE.md"
    "WHY-HARD-TO-REMOVE-ENHANCED.md"
)

# Move files safely
move_file() {
    local file="$1"
    local dest="$2"
    
    if [[ -f "$file" ]]; then
        if [[ -f "$dest/$file" ]]; then
            log_warn "File already exists in destination: $dest/$file"
            return 0
        fi
        mv "$file" "$dest/"
        log_info "Moved: $file -> $dest/"
    else
        log_warn "File not found: $file"
    fi
}

# Move agent notes
log_info "Moving agent notes..."
for file in "${AGENT_NOTES[@]}"; do
    move_file "$file" "internal/agent-notes"
done

# Move planning docs
log_info "Moving planning docs..."
for file in "${PLANNING[@]}"; do
    move_file "$file" "internal/planning"
done

# Move strategy docs
log_info "Moving strategy docs..."
for file in "${STRATEGY[@]}"; do
    move_file "$file" "internal/strategy"
done

# Move architecture docs
if [[ -d "architecture" ]]; then
    log_info "Moving architecture folder..."
    mv architecture/* internal/strategy/ 2>/dev/null || true
    rmdir architecture 2>/dev/null || true
fi

# Move ROADMAP folder
if [[ -d "ROADMAP" ]]; then
    log_info "Moving ROADMAP folder..."
    mv ROADMAP/* internal/planning/ 2>/dev/null || true
    rmdir ROADMAP 2>/dev/null || true
fi

# Move PERSONAS folder
if [[ -d "PERSONAS" ]]; then
    log_info "Moving PERSONAS folder..."
    mv PERSONAS/* internal/agent-notes/ 2>/dev/null || true
    rmdir PERSONAS 2>/dev/null || true
fi

log_info "Done consolidating internal docs"
