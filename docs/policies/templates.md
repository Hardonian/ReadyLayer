# Policy Templates Documentation

## Overview

ReadyLayer provides pre-built policy templates for common compliance standards. Templates can be applied at organization level and inherited by all repositories, or customized per repository.

## Available Templates

### 🔒 OWASP Top 10

**ID:** `owasp-top-10`  
**Category:** Security  
**Minimum Coverage:** 80%

Enforces OWASP Top 10 security vulnerabilities:

- A01: Injection Prevention
- A02: Authentication & Session Management  
- A03: Sensitive Data Exposure
- A04: XML External Entity (XXE)
- A05: Broken Access Control
- A06: Security Misconfiguration
- A07: Cross-Site Scripting (XSS)
- A08: Insecure Deserialization
- A09: Using Components with Known Vulnerabilities
- A10: Insufficient Logging & Monitoring

**Use Case:** All web applications, API services, microservices

### 💳 PCI-DSS

**ID:** `pci-dss`  
**Category:** Compliance  
**Minimum Coverage:** 90%

Payment Card Industry Data Security Standard requirements:

- Protect stored cardholder data
- Protect transmission of cardholder data
- Secure development practices
- User authentication requirements
- Audit logging requirements
- Encryption standards (TLS 1.2+)

**Use Case:** Payment processors, e-commerce, financial services

### 🏥 HIPAA

**ID:** `hipaa`  
**Category:** Compliance  
**Minimum Coverage:** 95%

Health Insurance Portability and Accountability Act:

- Protected Health Information (PHI) protection
- Audit logging
- Access control
- Encryption requirements
- Data minimization

**Use Case:** Healthcare, medical software, patient data handling

### ✓ SOC 2

**ID:** `soc-2`  
**Category:** Compliance  
**Minimum Coverage:** 85%

Service Organization Control 2 Framework:

- Availability controls
- Confidentiality controls
- Integrity controls
- Processing integrity
- Security controls

**Use Case:** SaaS platforms, cloud services, managed services

## Using Templates

### Apply Template via Dashboard

1. Go to Admin → Policies
2. Click "Create Policy"
3. Select a template
4. Review and customize rules
5. Click "Apply"

### Apply Template via API

```bash
curl -X POST https://api.readylayer.io/v1/policies \
  -H "Authorization: Bearer $READYLAYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "owasp-top-10",
    "organization_id": "org_123",
    "enforce": true
  }'
```

## Customization

### Override Rules

Disable specific rules while keeping others:

```yaml
policy_id: owasp-top-10
overrides:
  a01-injection:
    enabled: false  # Custom SQL injection detection
```

### Adjust Coverage Threshold

```yaml
policy_id: pci-dss
minimum_coverage: 85  # Lower from default 90%
```

### Add Custom Rules

Extend templates with organization-specific rules:

```yaml
policy_id: owasp-top-10
custom_rules:
  - id: internal-auth-required
    name: Internal Authentication
    pattern: '@auth.*required'
    severity: high
```

## Policy Inheritance

### Organization Level

Set default policy for entire organization:

```bash
readylayer policies set --organization org_123 --template owasp-top-10
```

### Team Level

Override for specific teams:

```bash
readylayer policies set --team team_456 --template pci-dss
```

### Repository Level

Override for specific repos:

```bash
readylayer policies set --repository repo_789 --template hipaa
```

**Precedence:** Repository > Team > Organization

## Enforcement

### When to Enforce

- **pull-request:** Block merging if policy violations found
- **merge:** Enforce before merging to main branch
- **both:** Enforce at both stages

### Severity Levels

- **Critical:** Always block (production/security-critical)
- **High:** Block by default, can override
- **Medium:** Warn, allow with approval
- **Low:** Info only, no blocking

### Waiver Process

Request exemptions for specific violations:

```bash
readylayer waiver request \
  --repository repo_789 \
  --rule a01-injection \
  --reason "Legacy system, migration planned Q2"
```

## Compliance Reporting

### Generate Report

```bash
readylayer report compliance \
  --template owasp-top-10 \
  --organization org_123 \
  --format pdf
```

### View Dashboard

Compliance → Policies → [Template] to see:
- Violation timeline
- Top violated rules
- Remediation timeline
- Waiver history

## Best Practices

1. **Start with recommended templates** for your industry
2. **Don't disable critical rules** without documented approval
3. **Review templates quarterly** for updates
4. **Monitor compliance trends** in dashboard
5. **Document waivers** for audit trails
6. **Train team** on policy requirements
7. **Use as learning tool**, not just enforcement

## Template Updates

ReadyLayer updates templates to include:
- New OWASP vulnerabilities
- Updated compliance standards
- Industry best practices

Check "Policy" section in release notes for updates.

## Support

- **Questions:** docs@readylayer.io
- **Template Request:** templates@readylayer.io
- **Compliance Help:** compliance@readylayer.io
