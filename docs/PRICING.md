# ReadyLayer — Pricing Documentation

## Pricing Tiers

### Starter (Free)
**Price:** $0/month  
**Target:** Individual developers, small teams

**Limits:**
- 5 repositories maximum
- Basic enforcement (critical issues only)
- $50/month LLM budget
- Community support

**Features:**
- ✅ Review Guard (critical issues block PRs)
- ✅ Test Engine (test generation)
- ✅ Doc Sync (documentation sync)
- ⚠️ Enforcement strength: Basic

**Use case:** Personal projects, open source, small startups

---

### Growth ($99/month)
**Price:** $99/month  
**Target:** Growing teams (10-50 engineers)

**Limits:**
- 50 repositories maximum
- Moderate enforcement (critical + high issues)
- $500/month LLM budget
- Email support (24-hour response)

**Features:**
- ✅ Review Guard (critical + high issues block PRs)
- ✅ Test Engine (test generation + coverage enforcement)
- ✅ Doc Sync (documentation sync + drift prevention)
- ✅ Enforcement strength: Moderate
- ✅ Priority support

**Use case:** Series A-B companies, scaling engineering teams

---

### Scale ($499/month)
**Price:** $499/month  
**Target:** Large teams (50+ engineers)

**Limits:**
- Unlimited repositories
- Maximum enforcement (critical + high + medium issues)
- $5,000/month LLM budget
- Priority support (4-hour response)

**Features:**
- ✅ Review Guard (critical + high + medium issues block PRs)
- ✅ Test Engine (test generation + coverage enforcement)
- ✅ Doc Sync (documentation sync + drift prevention)
- ✅ Enforcement strength: Maximum
- ✅ Priority support
- ✅ Advanced analytics
- ✅ Custom rules

**Use case:** Series C+ companies, enterprise teams

---

## Enforcement Strength

### Basic (Starter)
- **Blocks:** Critical issues only
- **Warns:** High, medium, low issues
- **Use case:** Security-focused, minimal disruption

### Moderate (Growth)
- **Blocks:** Critical + high issues
- **Warns:** Medium, low issues
- **Use case:** Balanced security and velocity

### Maximum (Scale)
- **Blocks:** Critical + high + medium issues
- **Warns:** Low issues only
- **Use case:** Maximum code quality, compliance-focused

---

## Feature Comparison

| Feature | Starter | Growth | Scale |
|---------|---------|--------|-------|
| **Repositories** | 5 | 50 | Unlimited |
| **LLM Budget** | $50/mo | $500/mo | $5,000/mo |
| **Enforcement** | Basic | Moderate | Maximum |
| **Support** | Community | Email (24h) | Priority (4h) |
| **Analytics** | Basic | Standard | Advanced |
| **Custom Rules** | ❌ | ❌ | ✅ |
| **API Access** | ✅ | ✅ | ✅ |
| **Webhooks** | ✅ | ✅ | ✅ |

---

## Billing & Limits

### Repository Limits
- **Enforcement:** Cannot add repositories beyond limit
- **Grace period:** 7 days after limit reached
- **Upgrade path:** Automatic upgrade prompt

### LLM Budget
- **Tracking:** Real-time cost tracking
- **Enforcement:** Blocks LLM calls when budget exceeded
- **Reset:** Monthly reset on billing date
- **Overage:** Can purchase additional budget ($0.01 per token)

### Enforcement Strength
- **Cannot downgrade:** Enforcement strength cannot be reduced
- **Can upgrade:** Can increase enforcement strength anytime
- **Configurable:** Per-repository override (admin only)

---

## Pricing Enforcement

### Code Implementation

**Billing Service:**
- `billing/index.ts` — Tier definitions and limits
- `lib/billing-middleware.ts` — Enforcement middleware

**Enforcement Points:**
1. **Repository creation** — Checks repository limit
2. **Review creation** — Checks feature access + LLM budget
3. **Test generation** — Checks feature access + LLM budget
4. **Doc generation** — Checks feature access + LLM budget

**Evidence:**
- `app/api/v1/repos/route.ts` — POST checks repository limit
- `app/api/v1/reviews/route.ts` — POST checks feature + budget
- `lib/billing-middleware.ts` — Reusable enforcement

---

## Upgrade/Downgrade Flow

### Upgrade
1. User clicks "Upgrade" in dashboard
2. Redirected to Stripe checkout
3. Subscription updated in database
4. Limits immediately increased
5. Email confirmation sent

### Downgrade
1. User clicks "Downgrade" in dashboard
2. Warning shown (repositories may exceed limit)
3. User confirms downgrade
4. Subscription updated at end of billing period
5. Limits enforced after period ends

### Cancellation
1. User cancels subscription
2. Access continues until end of billing period
3. Data retained for 30 days
4. Export available during retention period

---

## Enterprise Pricing

**Custom pricing** for:
- 500+ engineers
- Custom enforcement rules
- Dedicated support
- SLA guarantees
- On-premise deployment

**Contact:** enterprise@readylayer.com

---

## FAQ

**Q: Can I change tiers anytime?**  
A: Yes, upgrades are immediate. Downgrades take effect at end of billing period.

**Q: What happens if I exceed limits?**  
A: You'll receive warnings. Critical actions (PR reviews) will be blocked until you upgrade or reduce usage.

**Q: Do you offer annual billing?**  
A: Yes, 20% discount for annual plans.

**Q: Can I get a refund?**  
A: Refunds available within 30 days of purchase, prorated.

**Q: What payment methods do you accept?**  
A: Credit card, ACH (US), wire transfer (enterprise).

---

**Last Updated:** 2024-12-30  
**Pricing Subject to Change:** 30 days notice required
