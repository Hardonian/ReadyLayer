# ReadyLayer Enterprise Cloud

**A hosted, managed implementation of the ReadyLayer open-source framework.**

---

## Overview

ReadyLayer Enterprise Cloud is a **fully managed service** that runs the same open-source governance framework you can self-host. It provides operational convenience for teams that prefer not to manage infrastructure.

**Critical distinction:**
- **Open Source**: The framework itself (code review, testing, documentation governance)
- **Enterprise Cloud**: Managed hosting of that framework with operational tooling

The OSS version is **not a subset** of Enterprise Cloud. All core governance logic is identical.

---

## What Enterprise Cloud Provides

### 1. Managed Infrastructure

No servers to configure, scale, or maintain:

- **Automatic scaling**: Handles 10 PRs/day or 10,000 PRs/day
- **Global availability**: 99.9% uptime SLA
- **Automatic backups**: Point-in-time recovery
- **Security patches**: Applied within 24 hours of disclosure
- **Zero DevOps overhead**: We manage the platform, you use it

### 2. Operational Conveniences

Enterprise-grade operations without enterprise-grade overhead:

- **SSO Integration**: SAML, Okta, Azure AD, Google Workspace
- **Multi-region deployment**: Data residency for GDPR/compliance
- **Advanced analytics**: Usage dashboards, cost forecasting, trend analysis
- **Audit exports**: One-click compliance reports (SOC 2, ISO 27001)
- **Priority support**: Guaranteed response times (4-hour for P1 issues)

### 3. Collaboration Features

Tools for distributed teams:

- **Organization hierarchies**: Multi-team policy management
- **Shared policy library**: Reusable templates across teams
- **Activity feeds**: Real-time visibility into governance events
- **Notification routing**: Slack, email, PagerDuty, custom webhooks
- **Role-based access**: Granular permissions for admins, reviewers, contributors

### 4. Enterprise Integrations

Pre-built connectors for common enterprise tools:

- **Identity providers**: LDAP, Active Directory, SAML
- **Incident management**: PagerDuty, Opsgenie, VictorOps
- **Communication**: Slack, Microsoft Teams, Mattermost
- **Ticketing**: Jira, Linear, ServiceNow
- **Observability**: Datadog, New Relic, Splunk

---

## What Enterprise Cloud Does NOT Provide

To maintain transparency about the OSS/Enterprise boundary:

### ❌ Not in Enterprise Cloud

1. **Superior governance logic**: OSS and Enterprise use identical policy engines
2. **Exclusive features**: No "Enterprise-only" governance capabilities
3. **Faster processing**: Same deterministic algorithms, same performance
4. **Better security scanning**: Identical security rules and detection logic
5. **Access to different LLM models**: Model selection is available in OSS

### ✅ What Enterprise Cloud Actually Is

Enterprise Cloud is **operationally convenient hosting** of the OSS framework, not a functionally superior product.

Think of it as:
- **OSS ReadyLayer**: You host Postgres, Redis, Next.js, configure scaling
- **Enterprise Cloud**: We host Postgres, Redis, Next.js, configure scaling

The governance logic is byte-for-byte identical.

---

## When to Use Enterprise Cloud

### Choose Enterprise Cloud if:

- ✅ You don't want to manage infrastructure (Postgres, Redis, workers)
- ✅ You need SSO integration (SAML, Okta, Azure AD)
- ✅ You require multi-region deployment for compliance
- ✅ You want guaranteed uptime SLA (99.9%)
- ✅ You prefer predictable pricing over infrastructure costs
- ✅ You need priority support with guaranteed response times

### Stay with OSS if:

- ✅ You prefer full control over infrastructure
- ✅ You're comfortable managing Postgres, Redis, Next.js
- ✅ You want to customize beyond configuration (fork-friendly)
- ✅ You have strict data residency requirements (air-gapped networks)
- ✅ You want to avoid recurring SaaS costs
- ✅ You're building on top of ReadyLayer (custom extensions)

---

## Architecture Comparison

### OSS Self-Hosted

```
Your Infrastructure:
┌─────────────────────────────────────┐
│ Your Kubernetes/VM/Cloud            │
│  ├─ Next.js app (your instance)     │
│  ├─ PostgreSQL (your database)      │
│  ├─ Redis (your queue)              │
│  └─ Worker processes (your compute) │
└─────────────────────────────────────┘

You manage:
- Scaling (horizontal/vertical)
- Backups and disaster recovery
- Security patches and updates
- Monitoring and alerting
- Incident response
```

### Enterprise Cloud

```
ReadyLayer Infrastructure:
┌─────────────────────────────────────┐
│ Managed ReadyLayer Cloud            │
│  ├─ Next.js app (our instance)      │
│  ├─ PostgreSQL (our database)       │
│  ├─ Redis (our queue)               │
│  └─ Worker processes (our compute)  │
└─────────────────────────────────────┘

We manage:
- Scaling (automatic, transparent)
- Backups and disaster recovery
- Security patches and updates
- Monitoring and alerting
- Incident response
```

**Governance logic**: Identical in both cases.

---

## Pricing Philosophy

We don't include pricing in the OSS README because:

1. **OSS is not a marketing funnel**: The framework exists to solve a problem, not to upsell
2. **Pricing changes**: Documentation in code should be stable
3. **No pressure**: You should evaluate Enterprise Cloud on merit, not urgency

For current pricing, visit: **[readylayer.io/pricing](https://readylayer.io/pricing)**

### Pricing Principles

- **Usage-based**: Pay for what you use (PR reviews, not seats)
- **No surprises**: Clear tier boundaries, no hidden fees
- **OSS discount**: Open-source projects get 50% off
- **Annual discounts**: Prepay for savings
- **Volume pricing**: Scales down per-unit cost as usage grows

---

## Migration Path

### OSS → Enterprise Cloud

Migrating from self-hosted to Enterprise Cloud is straightforward:

1. **Export your data**: One-click export from OSS instance
2. **Create Enterprise account**: Sign up at readylayer.io
3. **Import your data**: Upload export file
4. **Update integrations**: Point GitHub/GitLab webhooks to new URL
5. **Decommission OSS**: Turn off your self-hosted instance

**Data portability guarantee**: We will never hold your data hostage. Export anytime, in standard formats (PostgreSQL dump, JSON).

### Enterprise Cloud → OSS

Going the other direction is equally simple:

1. **Export from Enterprise**: One-click export from dashboard
2. **Deploy OSS**: Follow self-hosted setup guide
3. **Import your data**: Load export file into your database
4. **Update integrations**: Point webhooks to your instance
5. **Cancel Enterprise**: No lock-in, cancel anytime

---

## Trust and Transparency

### Data Handling

**What we store:**
- Policy configurations (YAML files you define)
- Governance decisions (pass/fail, evidence bundles)
- Audit logs (who did what, when)
- Organization metadata (team structure, permissions)

**What we DO NOT store:**
- Your source code (never leaves GitHub/GitLab)
- Your git history (only diffs for analysis)
- Secrets or credentials (redacted before processing)
- User personal data beyond email/name

**Data encryption:**
- **At rest**: AES-256 encryption
- **In transit**: TLS 1.3
- **Secrets**: Separate vault with rotation

### Compliance Certifications

- ✅ **SOC 2 Type II**: Annual audits
- ✅ **GDPR compliant**: EU data residency available
- ✅ **HIPAA ready**: Business Associate Agreement (BAA) available
- 🔄 **ISO 27001**: Certification in progress (Q2 2026)

---

## Support Tiers

### OSS Community Support (Free)

- GitHub Discussions and Issues
- Community-driven responses
- Best-effort, no SLA
- Maintainer engagement when available

### Enterprise Cloud Support (Included)

**Standard (included in all plans):**
- Email support (business hours)
- 24-hour response time for P2/P3 issues
- Knowledge base access
- Quarterly check-ins

**Priority (add-on):**
- 24/7 support (phone, email, Slack)
- 4-hour response for P1 (critical outages)
- Dedicated Slack channel
- Monthly strategic reviews
- Custom SLA negotiable

---

## Feature Comparison Table

| Capability | OSS Self-Hosted | Enterprise Cloud |
|-----------|-----------------|------------------|
| **Core Governance** |
| Review Guard (security scanning) | ✅ Full | ✅ Full |
| Test Engine (coverage enforcement) | ✅ Full | ✅ Full |
| Doc Sync (documentation validation) | ✅ Full | ✅ Full |
| Policy engine (deterministic) | ✅ Full | ✅ Full |
| Audit trails (hashed evidence) | ✅ Full | ✅ Full |
| **Infrastructure** |
| Self-hosted deployment | ✅ Required | ❌ Not applicable |
| Managed infrastructure | ❌ DIY | ✅ Included |
| Automatic scaling | ⚠️ Manual | ✅ Automatic |
| Backups and DR | ⚠️ Manual | ✅ Included |
| Uptime SLA | ❌ None | ✅ 99.9% |
| **Operations** |
| SSO (SAML, Okta, etc.) | ⚠️ DIY setup | ✅ Pre-built |
| Multi-region deployment | ⚠️ Manual | ✅ One-click |
| Audit exports | ✅ DIY scripts | ✅ One-click |
| Analytics dashboards | ⚠️ Build yourself | ✅ Included |
| **Support** |
| Community support | ✅ Free | ✅ Free |
| Email support | ❌ None | ✅ Included |
| Priority support (4-hour SLA) | ❌ None | ✅ Add-on |
| **Cost** |
| Software license | ✅ Free (Apache 2.0) | ✅ Free (same license) |
| Infrastructure costs | 💰 You pay cloud provider | 💰 We pay cloud provider |
| Monthly/annual fees | ❌ None | 💰 Usage-based |

---

## FAQ

### Q: Will OSS features be deprecated to push users to Enterprise?

**A:** No. We commit to maintaining feature parity for core governance capabilities. See [OSS_VS_ENTERPRISE_BOUNDARY.md](./OSS_VS_ENTERPRISE_BOUNDARY.md) for explicit boundaries.

### Q: Can I run Enterprise features in OSS with enough effort?

**A:** Yes. Everything in Enterprise Cloud can be replicated in OSS (SSO, analytics, etc.). Enterprise Cloud saves you implementation time, not capability.

### Q: What if ReadyLayer the company shuts down?

**A:** The OSS framework continues unchanged. It's Apache 2.0 licensed and community-maintainable. Your self-hosted instances keep running. Enterprise Cloud customers get 90-day notice and export assistance.

### Q: Can I build a competing hosted service using ReadyLayer OSS?

**A:** Yes. Apache 2.0 license explicitly permits this. We welcome competition—it validates the framework's utility.

### Q: Is Enterprise Cloud a "bait and switch" for OSS?

**A:** No. OSS is the primary product. Enterprise Cloud is operational convenience for teams that prefer managed services. We're inspired by companies like GitLab (OSS + managed hosting).

---

## Get Started with Enterprise Cloud

1. **Try OSS first**: Validate the framework meets your needs
2. **Evaluate self-hosting**: Can you manage Postgres, Redis, scaling?
3. **Compare costs**: OSS infrastructure vs. Enterprise pricing
4. **Request demo**: See Enterprise features in action
5. **Start trial**: 14-day free trial, no credit card

**Enterprise Cloud signup**: [readylayer.io/enterprise](https://readylayer.io/enterprise)

---

## Questions?

- **Pre-sales questions**: sales@readylayer.io
- **Technical questions**: support@readylayer.io
- **Security/compliance**: security@readylayer.io
- **Billing**: billing@readylayer.io

---

## Summary

ReadyLayer Enterprise Cloud is **managed hosting** of the open-source framework, not a superior product. Use it if you value operational convenience over infrastructure control. Stay with OSS if you prefer full ownership.

**No pressure. No urgency. No feature gating.**

The framework is open source. The hosting is optional.
