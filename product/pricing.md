# ReadyLayer — Pricing Strategy

## Pricing Philosophy

ReadyLayer pricing is designed to:
- **Scale with value:** Price increases with repos and usage, not arbitrarily
- **Gate by features:** Advanced features unlock at higher tiers
- **Enterprise-ready:** Clear path from startup to enterprise
- **Transparent:** No hidden costs, predictable pricing

---

## Pricing Tiers

### Starter
**Target:** Small teams, early adopters, individual projects

**Price:** $49/month (billed monthly) or $490/year (billed annually, ~17% savings)

**Included:**
- **Repositories:** Up to 5 private repos
- **Review Guard:**
  - Basic security and quality rules
  - Inline PR comments
  - Block/warn on critical issues
- **Test Engine:**
  - Test generation for AI-touched files
  - Coverage enforcement (80% threshold)
  - GitHub Actions integration
- **Doc Sync:**
  - OpenAPI spec generation
  - Merge-triggered doc updates
  - Basic artifact storage
- **Integrations:**
  - GitHub (public and private)
  - GitHub Actions
- **Support:** Community support (GitHub Discussions)

**Limits:**
- 1,000 PR reviews/month
- 500 test generations/month
- 100 doc updates/month
- 1 organization

**Feature Gates:**
- ❌ Custom rules
- ❌ Advanced security scanning
- ❌ Multi-framework test support
- ❌ Custom doc templates
- ❌ Slack/Jira integrations
- ❌ Audit logs
- ❌ Org-level configuration

---

### Growth
**Target:** Growing teams, multiple projects, established workflows

**Price:** $199/month (billed monthly) or $1,990/year (billed annually, ~17% savings)

**Included:**
- **Repositories:** Up to 25 private repos
- **Review Guard:**
  - All Starter features
  - Custom rules and thresholds
  - Advanced security scanning (SAST, dependency checks)
  - Severity-based blocking
  - Rule templates library
- **Test Engine:**
  - All Starter features
  - Multi-framework support (Jest, Mocha, pytest, etc.)
  - Custom test templates
  - Coverage threshold configuration
  - Test placement rules
- **Doc Sync:**
  - All Starter features
  - Custom doc templates
  - Multiple spec formats (OpenAPI, GraphQL, etc.)
  - Artifact publishing
  - Drift detection alerts
- **Integrations:**
  - GitHub, GitLab, Bitbucket
  - GitHub Actions, GitLab CI
  - VS Code extension
  - Slack notifications
- **Support:** Email support (24-hour response)

**Limits:**
- 5,000 PR reviews/month
- 2,500 test generations/month
- 500 doc updates/month
- 3 organizations

**Feature Gates:**
- ❌ Jira integration
- ❌ Advanced audit logs
- ❌ SOC2 compliance reports
- ❌ Custom retention policies
- ❌ Priority support
- ❌ Dedicated account manager

---

### Scale
**Target:** Enterprise teams, multiple orgs, compliance requirements

**Price:** Custom pricing (starts at $999/month)

**Included:**
- **Repositories:** Unlimited private repos
- **Review Guard:**
  - All Growth features
  - Custom LLM models
  - Advanced rule engine
  - Compliance rule sets (SOC2, HIPAA, PCI-DSS)
  - Risk scoring and prioritization
- **Test Engine:**
  - All Growth features
  - Custom test frameworks
  - Test orchestration
  - Coverage analytics and trends
  - Test performance optimization
- **Doc Sync:**
  - All Growth features
  - Custom doc pipelines
  - Multi-format publishing
  - Advanced drift prevention
  - Documentation analytics
- **Integrations:**
  - All Growth integrations
  - Jira integration
  - Azure DevOps
  - JetBrains IDEs
  - Custom webhooks
- **Enterprise Features:**
  - SOC2 Type II compliance
  - Advanced audit logs
  - Custom data retention policies
  - SSO (SAML, OIDC)
  - Role-based access control (RBAC)
  - Org-level configuration
  - Dedicated infrastructure (optional)
- **Support:**
  - Priority support (4-hour response)
  - Dedicated account manager
  - Custom onboarding
  - Quarterly business reviews

**Limits:**
- Unlimited PR reviews/month
- Unlimited test generations/month
- Unlimited doc updates/month
- Unlimited organizations

**Feature Gates:**
- ✅ Everything included

---

## Feature Comparison Matrix

| Feature | Starter | Growth | Scale |
|---------|---------|--------|-------|
| **Repositories** | 5 | 25 | Unlimited |
| **PR Reviews/month** | 1,000 | 5,000 | Unlimited |
| **Test Generations/month** | 500 | 2,500 | Unlimited |
| **Doc Updates/month** | 100 | 500 | Unlimited |
| **Organizations** | 1 | 3 | Unlimited |
| **Custom Rules** | ❌ | ✅ | ✅ |
| **Advanced Security** | ❌ | ✅ | ✅ |
| **Multi-Framework Tests** | ❌ | ✅ | ✅ |
| **Custom Doc Templates** | ❌ | ✅ | ✅ |
| **Slack Integration** | ❌ | ✅ | ✅ |
| **Jira Integration** | ❌ | ❌ | ✅ |
| **SOC2 Compliance** | ❌ | ❌ | ✅ |
| **SSO** | ❌ | ❌ | ✅ |
| **RBAC** | ❌ | ❌ | ✅ |
| **Priority Support** | ❌ | ❌ | ✅ |

---

## Pricing Strategy Details

### Usage-Based Overage
- **Starter:** Hard limits, no overage (upgrade required)
- **Growth:** Overage available at $0.10/PR review, $0.20/test generation, $0.50/doc update
- **Scale:** No overage charges (unlimited included)

### Annual vs. Monthly
- **Annual billing:** 17% discount (2 months free)
- **Monthly billing:** Full price, cancel anytime

### Free Trial
- **14-day free trial** for Starter and Growth tiers
- Full feature access during trial
- No credit card required
- Auto-converts to paid at trial end (with email reminder)

### Enterprise Custom Pricing
- **Minimum:** $999/month
- **Volume discounts:** Available for 100+ repos
- **Custom contracts:** Available for enterprise requirements
- **Dedicated infrastructure:** Additional cost (quoted separately)

---

## Upgrade/Downgrade Policy

### Upgrades
- **Immediate:** Features unlock immediately
- **Prorated billing:** Charge difference for remaining billing period
- **No data loss:** All data and configuration preserved

### Downgrades
- **End of billing period:** Downgrade takes effect at next billing cycle
- **Feature access:** Features locked at downgrade, but data preserved for 90 days
- **No refunds:** Prorated refunds not available (use remaining time)

---

## Competitive Positioning

### vs. CodeRabbit (Code Review)
- **ReadyLayer:** $49/month for 5 repos
- **CodeRabbit:** $12/user/month (typically $60+/month for 5-person team)
- **Differentiator:** AI-aware analysis, integrated test generation and docs

### vs. Codium (Test Generation)
- **ReadyLayer:** Included in $49/month
- **Codium:** $19/user/month (typically $95+/month for 5-person team)
- **Differentiator:** Integrated into PR workflow, coverage enforcement, doc sync

### vs. Swagger/Postman (Documentation)
- **ReadyLayer:** Included in $49/month
- **Swagger:** Free (manual), Enterprise $99+/month
- **Differentiator:** Automatic generation, merge-triggered updates, drift prevention

**ReadyLayer Value:** 3 tools in 1, at lower total cost than buying separately.

---

## Revenue Projections (Internal)

### Assumptions
- **Starter:** 70% of customers, $49/month = $588/year ARR
- **Growth:** 25% of customers, $199/month = $2,388/year ARR
- **Scale:** 5% of customers, $999/month = $11,988/year ARR

### Target Metrics (Year 1)
- **100 customers:** ~$150K ARR
- **500 customers:** ~$750K ARR
- **1,000 customers:** ~$1.5M ARR

### Unit Economics
- **CAC:** Target <$500 (content marketing, GitHub Marketplace)
- **LTV:** Target >$3,000 (24+ month average retention)
- **LTV:CAC:** Target >6:1

---

## Pricing FAQ

**Q: Can I use ReadyLayer for open source projects?**
A: Yes, Starter tier includes public repos. Open source projects get 50% discount (contact sales).

**Q: What happens if I exceed limits?**
A: Starter: Upgrade required. Growth: Overage charges apply. Scale: No limits.

**Q: Can I change tiers anytime?**
A: Yes, upgrades are immediate. Downgrades take effect at next billing cycle.

**Q: Do you offer discounts for annual billing?**
A: Yes, 17% discount (2 months free) for annual billing.

**Q: Is there a free tier?**
A: 14-day free trial, no credit card required. No permanent free tier (focus on paid value).

**Q: Can I get custom pricing?**
A: Yes, Scale tier offers custom pricing. Contact sales for enterprise needs.

**Q: What payment methods do you accept?**
A: Credit card (Stripe), ACH (enterprise), invoice (Scale tier).

---

## Pricing Principles (Non-Negotiable)

1. **Transparent:** No hidden costs, clear limits, predictable pricing
2. **Value-aligned:** Price scales with repos and usage, not arbitrarily
3. **Competitive:** Lower total cost than buying 3 separate tools
4. **Enterprise-ready:** Clear path from startup to enterprise
5. **Sustainable:** Pricing supports long-term product development and support
