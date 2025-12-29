# ReadyLayer — Behavioral Tier Table

**Date:** 2024-01-15  
**Purpose:** Behavioral comparison of tiers (not feature-based, enforcement-based)

---

## TIER BEHAVIORAL COMPARISON

| Behavior | Free (Starter) | Growth ($199/mo) | Scale ($999+/mo) |
|----------|----------------|------------------|------------------|
| **Critical Issues** | ✅ Always block | ✅ Always block | ✅ Always block |
| **High Issues** | ⚠️ Warn only | ✅ Block by default | ✅ Always block |
| **Medium Issues** | ℹ️ Info only | ⚠️ Warn only | ✅ Block by default |
| **Low Issues** | ℹ️ Info only | ℹ️ Info only | ⚠️ Warn only |
| **Coverage Enforcement** | ✅ Always block < 80% | ✅ Always block < 80% | ✅ Always block < 80% |
| **Test Generation** | ✅ Required for AI files | ✅ Required for AI files | ✅ Required for AI files |
| **Drift Detection** | ✅ Always block drift | ✅ Always block drift | ✅ Always block drift |
| **AI Uncertainty** | ✅ Block (require review) | ✅ Block (require review) | ✅ Block (require review) |
| **AI Hallucination** | ✅ Block (detected) | ✅ Block (detected) | ✅ Block (detected) |
| **AI Confidence < 80%** | ✅ Block (require review) | ✅ Block (require review) | ✅ Block (require review) |
| **Violation History** | 📊 30 days | 📊 90 days | 📊 1 year |
| **Pattern Detection** | ❌ None | ✅ After 3+ violations | ✅ After 2+ violations |
| **Escalation Logic** | ❌ None | ✅ Medium sensitivity | ✅ High sensitivity |
| **AI Budget** | 💰 $10/month (hard limit) | 💰 $100/month (soft limit) | 💰 Unlimited |
| **Rate Limits** | 🚦 100 req/hour | 🚦 1000 req/hour | 🚦 10000 req/hour |
| **Audit Trail** | 📝 30 days | 📝 90 days | 📝 1 year |
| **Cost Visibility** | ✅ Basic dashboard | ✅ Detailed dashboard | ✅ Enterprise dashboard |
| **Health Monitoring** | ✅ Basic health checks | ✅ Detailed health checks | ✅ Enterprise monitoring |
| **Kill Switches** | ✅ Available | ✅ Available | ✅ Available |
| **Support** | 💬 Community | 📧 Email (24h) | 🎯 Priority (4h) |

---

## BEHAVIORAL CHARACTERISTICS BY TIER

### Free Tier (Starter) - "Basic Protection"

**Enforcement Strength:** Basic (critical issues only)  
**User Experience:** "Catches critical issues, but high issues are warnings"

**What Users Feel:**
- Week 1-2: "This is helpful, catches critical security issues"
- Week 3-4: "Wish it would block high issues too, warnings feel risky"
- Month 2-3: "Getting warnings but no blocking, feels like I'm missing protection"
- Month 4+: "Need more enforcement, considering upgrade"

**What Users Worry About:**
- High issues slip through (warnings only)
- No pattern detection (recurring issues not caught)
- Limited AI budget ($10/month, hits limit quickly)
- No escalation logic (same issues keep happening)

**Upgrade Triggers:**
- High issues cause incidents (wish they were blocked)
- Recurring violations (need pattern detection)
- AI budget exceeded (need more budget)
- Need compliance (audit trail too short)

---

### Growth Tier ($199/month) - "Comprehensive Protection"

**Enforcement Strength:** Moderate (critical + high issues)  
**User Experience:** "High issues are blocked, feels safer"

**What Users Feel:**
- Week 1-2: "High issues are blocked, feels much safer"
- Week 3-4: "Pattern detection helps identify recurring problems"
- Month 2-3: "Escalation logic adapts to our team's needs"
- Month 4+: "Worth the cost, prevents incidents"

**What Users Stop Worrying About:**
- ✅ High issues causing incidents (blocked by default)
- ✅ Recurring violations (pattern detection catches them)
- ✅ AI budget limits (soft limit, overage available)
- ✅ Same issues repeating (escalation logic prevents)

**What Users Still Worry About:**
- Medium issues slip through (warnings only)
- Limited history (90 days, wish it was longer)
- Escalation could be more aggressive (want faster escalation)

**Upgrade Triggers:**
- Need medium issue blocking (compliance requirement)
- Need longer history (1 year for compliance)
- Need more aggressive escalation (faster enforcement)
- Need enterprise features (SSO, RBAC, SOC2)

---

### Scale Tier ($999+/month) - "Maximum Protection"

**Enforcement Strength:** Maximum (critical + high + medium issues)  
**User Experience:** "Maximum enforcement, feels like insurance"

**What Users Feel:**
- Week 1-2: "Maximum enforcement, feels like insurance"
- Week 3-4: "Long history helps identify long-term patterns"
- Month 2-3: "Aggressive escalation prevents recurring issues"
- Month 4+: "Worth the cost for enterprise compliance"

**What Users Stop Worrying About:**
- ✅ Medium issues causing problems (blocked by default)
- ✅ Short history (1 year retention)
- ✅ Slow escalation (aggressive escalation)
- ✅ Compliance requirements (SOC2, audit trails)
- ✅ Enterprise features (SSO, RBAC, dedicated support)

**What Users Don't Worry About:**
- Nothing - maximum protection, comprehensive features

---

## ENFORCEMENT STRENGTH COMPARISON

### Critical Issues
**All Tiers:** ✅ Always block (cannot disable)

### High Issues
- **Free:** ⚠️ Warn only (not blocked)
- **Growth:** ✅ Block by default (can override with admin approval)
- **Scale:** ✅ Always block (cannot override)

### Medium Issues
- **Free:** ℹ️ Info only (not blocked)
- **Growth:** ⚠️ Warn only (not blocked)
- **Scale:** ✅ Block by default (can override with admin approval)

### Low Issues
- **All Tiers:** ℹ️ Info only (never blocked)

---

## VALUE ACCUMULATION BY TIER

### Free Tier
**Value Accumulated:**
- Critical incidents prevented: $50k+ per incident
- Basic review automation: 5 hours/week saved
- Limited AI analysis: Basic security checks

**Value Not Accumulated:**
- High issue incidents: Still possible (warnings only)
- Pattern detection: Not available
- Historical intelligence: Limited (30 days)
- Escalation logic: Not available

**Upgrade Value:**
- Prevent high issue incidents: $50k+ per incident
- Pattern detection: Prevents recurring issues
- Longer history: Better pattern detection
- Escalation logic: Prevents repeat violations

### Growth Tier
**Value Accumulated:**
- Critical + high incidents prevented: $100k+ per incident
- Comprehensive review automation: 10 hours/week saved
- Pattern detection: Prevents recurring issues
- Escalation logic: Adapts to team needs
- Historical intelligence: 90 days

**Value Not Accumulated:**
- Medium issue incidents: Still possible (warnings only)
- Maximum history: Limited (90 days, not 1 year)
- Aggressive escalation: Limited (medium sensitivity)

**Upgrade Value:**
- Prevent medium issue incidents: $25k+ per incident
- Maximum history: Better long-term pattern detection
- Aggressive escalation: Faster enforcement
- Enterprise features: Compliance, SSO, RBAC

### Scale Tier
**Value Accumulated:**
- All incidents prevented: $150k+ per incident
- Maximum review automation: 15 hours/week saved
- Maximum pattern detection: Long-term patterns
- Aggressive escalation: Fastest enforcement
- Maximum history: 1 year retention
- Enterprise features: Compliance, SSO, RBAC

**Value Not Accumulated:**
- Nothing - maximum value accumulation

---

## BEHAVIORAL UPGRADE PATH

### Free → Growth
**Trigger:** High issues cause incidents, need pattern detection  
**Value:** Prevent high issue incidents ($50k+), pattern detection, escalation logic  
**Cost:** $199/month ($2,388/year)  
**ROI:** 20x+ (prevent 1 incident = $50k saved)

### Growth → Scale
**Trigger:** Need medium issue blocking, compliance requirements  
**Value:** Prevent medium issue incidents ($25k+), enterprise features, compliance  
**Cost:** $999/month ($11,988/year)  
**ROI:** 2x+ (prevent 1 incident = $25k saved)

---

## TIER ENFORCEMENT ARCHITECTURE

### Free Tier Enforcement
```typescript
// PSEUDOCODE
function enforceFreeTier(issues: Issue[]): EnforcementResult {
  // Critical: Always block
  if (issues.some(i => i.severity === 'critical')) {
    return { blocked: true, reason: 'Critical issues found' };
  }
  
  // High: Warn only (not blocked)
  if (issues.some(i => i.severity === 'high')) {
    return { blocked: false, warnings: issues.filter(i => i.severity === 'high') };
  }
  
  return { blocked: false };
}
```

### Growth Tier Enforcement
```typescript
// PSEUDOCODE
function enforceGrowthTier(issues: Issue[], config: Config): EnforcementResult {
  // Critical: Always block
  if (issues.some(i => i.severity === 'critical')) {
    return { blocked: true, reason: 'Critical issues found' };
  }
  
  // High: Block by default (can override with admin approval)
  if (issues.some(i => i.severity === 'high')) {
    if (config.fail_on_high === false && !hasAdminApproval()) {
      return { blocked: true, reason: 'High issues found (default: block)' };
    }
    return { blocked: false, warnings: issues.filter(i => i.severity === 'high') };
  }
  
  return { blocked: false };
}
```

### Scale Tier Enforcement
```typescript
// PSEUDOCODE
function enforceScaleTier(issues: Issue[], config: Config): EnforcementResult {
  // Critical: Always block
  if (issues.some(i => i.severity === 'critical')) {
    return { blocked: true, reason: 'Critical issues found' };
  }
  
  // High: Always block (cannot override)
  if (issues.some(i => i.severity === 'high')) {
    return { blocked: true, reason: 'High issues found' };
  }
  
  // Medium: Block by default (can override with admin approval)
  if (issues.some(i => i.severity === 'medium')) {
    if (config.fail_on_medium === false && !hasAdminApproval()) {
      return { blocked: true, reason: 'Medium issues found (default: block)' };
    }
    return { blocked: false, warnings: issues.filter(i => i.severity === 'medium') };
  }
  
  return { blocked: false };
}
```

---

## CONCLUSION

**Free Tier:** Basic protection, feels risky over time  
**Growth Tier:** Comprehensive protection, feels safe  
**Scale Tier:** Maximum protection, feels like insurance

**Enforcement strength increases with tier, not feature access.**
