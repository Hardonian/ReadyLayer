# Slack Integration Setup

## Overview

ReadyLayer integrates with Slack to notify your team about:
- 🚫 Blocked pull requests
- 🔒 Security findings
- 📊 Test coverage changes
- ⚠️ Policy violations
- ✅ Review completions

## Installation

### Step 1: Install ReadyLayer App

1. Go to https://readylayer.io/integrations/slack
2. Click "Add to Slack"
3. Select workspace and channel
4. Click "Allow"
5. You'll be redirected back to ReadyLayer dashboard

### Step 2: Configure Notifications

1. Go to Admin → Integrations → Slack
2. Select which notifications to enable:
   - Blocked PRs (critical)
   - Security findings (high+)
   - Test failures
   - Coverage drops
   - Policy violations

3. Choose notification channels:
   - #engineering (default)
   - #security
   - #qa
   - Custom channels

## Notification Types

### Blocked PR Alert

```
🚫 PR #42 Blocked - Add user authentication
Repository: myapp
Author: @alice
Issues: 3 Critical, 2 High
💡 View findings → https://readylayer.io/dashboard/prs/42
```

Sent to: **#engineering**

### Security Finding

```
🔒 Security Issue Found
Rule: SQL Injection Prevention (A01)
File: src/auth.ts:125
Severity: 🔴 Critical
Remediation: Use parameterized queries
```

Sent to: **#security**

### Test Coverage Drop

```
📊 Coverage Decreased
Branch: main
Before: 85%
After: 81%
Files affected: 3
```

Sent to: **#qa**

### Policy Violation

```
⚠️ Policy Violation - PCI-DSS
Rule: Protect Cardholder Data
Details: Hardcoded API key detected
Action: Fix before merge or request waiver
```

Sent to: **#engineering**

## Configuration File

Create `readylayer.slack.yml`:

```yaml
slack:
  workspace: my-workspace
  
  notifications:
    blocked_pr:
      enabled: true
      channels:
        - '#engineering'
        - '@security-lead'
      severity_threshold: critical
      
    security_findings:
      enabled: true
      channels:
        - '#security'
      severity_threshold: high
      
    test_coverage:
      enabled: true
      channels:
        - '#qa'
      threshold_percentage: 5  # Alert if drops > 5%
      
    policy_violations:
      enabled: true
      channels:
        - '#engineering'
      severity_threshold: medium

  # Custom message templates (optional)
  templates:
    blocked_pr: |
      🚫 PR #{{pr_number}} blocked in {{repository}}
      Author: @{{author}}
      Issues: {{critical_count}} critical, {{high_count}} high
      {{action_button}}
```

## Slack Commands

Use ReadyLayer bot in Slack to check status:

```
/readylayer status
→ Shows current org status and recent PRs

/readylayer help
→ Shows available commands

/readylayer policy
→ Shows active policies

/readylayer waiver create
→ Request policy waiver
```

## Mention Configuration

Tag specific people for notifications:

```yaml
notifications:
  blocked_pr:
    mention_on_critical: '@security-lead'
    mention_on_high: '@engineering-lead'
```

## Quiet Hours

Disable notifications during off-hours:

```yaml
slack:
  quiet_hours:
    enabled: true
    start: '18:00'  # 6 PM
    end: '09:00'    # 9 AM
    timezone: 'America/New_York'
```

## Channel Setup Recommendations

### Suggested Channels

| Channel | Purpose | Audience |
|---------|---------|----------|
| #readylayer | General notifications | All devs |
| #security | Security findings | Security team |
| #qa | Test coverage changes | QA team |
| #compliance | Policy violations | Compliance team |
| #incidents | Urgent issues | On-call team |

### Permissions

Set channel permissions for:
- ReadyLayer App: Read/Write messages
- Team members: Read only
- Leads: Read/Write for waivers

## Troubleshooting

### Messages not appearing

1. Check Slack app permissions
2. Verify notification settings enabled
3. Check channel is in message config
4. Review app in #apps → ReadyLayer → Details

### App keeps disconnecting

1. Go to Admin → Integrations → Slack
2. Click "Reconnect"
3. Re-authenticate with Slack

### Duplicate messages

1. Check if app installed in multiple workspaces
2. Remove duplicate installation
3. Keep only primary workspace

## Security Notes

- ReadyLayer only reads public channels
- Never sends sensitive data (full code, credentials)
- Configurable what info is included
- All connections encrypted (TLS)
- Audit logs available in dashboard

## Advanced Usage

### Webhook Integration

Send custom notifications to Slack:

```bash
curl -X POST https://api.readylayer.io/webhooks/slack \
  -H "Authorization: Bearer $READYLAYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "#engineering",
    "title": "Custom Alert",
    "message": "Manual review required",
    "severity": "high"
  }'
```

### Message Threading

Group related notifications in threads:

```yaml
slack:
  threading: enabled
  group_by: 'pr_number'  # Group by PR
```

## Support

- **Setup help:** https://readylayer.io/docs/slack
- **Issues:** support@readylayer.io
- **Slack community:** [Join us](https://readylayer.io/slack-community)

## What's Next

1. ✅ Install the app
2. ✅ Configure channels
3. ✅ Test with sample PR
4. ✅ Share with your team
5. 📈 Monitor notifications for insights
