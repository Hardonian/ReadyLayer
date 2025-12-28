# ReadyLayer — Slack and Jira Integrations

## Overview

ReadyLayer integrates with Slack and Jira to provide notifications and workflow automation. These integrations enable teams to stay informed about ReadyLayer activities without leaving their existing tools.

---

## Slack Integration

### Core Use Cases

#### 1. PR Review Notifications
**Use Case:** Get notified when ReadyLayer completes a PR review

**Flow:**
1. PR opened or updated
2. ReadyLayer completes review
3. ReadyLayer sends Slack notification to configured channel
4. Team sees review summary with link to PR

**Value:** Stay informed about code quality without checking PRs manually

---

#### 2. Test Generation Notifications
**Use Case:** Get notified when tests are generated or coverage is low

**Flow:**
1. PR opened with AI-generated code
2. ReadyLayer generates tests
3. ReadyLayer sends Slack notification
4. Team sees test generation summary

**Value:** Know when tests are generated, when coverage is low

---

#### 3. Documentation Updates
**Use Case:** Get notified when docs are updated on merge

**Flow:**
1. PR merged to main
2. ReadyLayer updates documentation
3. ReadyLayer sends Slack notification
4. Team sees doc update summary

**Value:** Stay informed about documentation changes

---

#### 4. Coverage Alerts
**Use Case:** Get alerted when coverage drops below threshold

**Flow:**
1. CI completes, coverage calculated
2. Coverage below threshold
3. ReadyLayer sends Slack alert
4. Team sees alert with coverage details

**Value:** Catch coverage issues early, before merge

---

### Installation

#### From ReadyLayer Dashboard
1. Go to Settings → Integrations → Slack
2. Click "Connect Slack"
3. Authorize ReadyLayer Slack app
4. Select channels for notifications
5. Configure notification preferences

#### From Slack App Directory
1. Go to Slack App Directory
2. Search "ReadyLayer"
3. Click "Add to Slack"
4. Authorize ReadyLayer
5. Configure in ReadyLayer dashboard

### Configuration

#### Channel Selection
- **Default channel:** All notifications go to one channel
- **Per-repo channels:** Different channels for different repos
- **Per-event channels:** Different channels for different event types

#### Notification Preferences
- **PR reviews:** On/off, severity filter (all, critical only, etc.)
- **Test generation:** On/off
- **Doc updates:** On/off
- **Coverage alerts:** On/off, threshold
- **Quiet hours:** Don't send notifications during specified hours

### Features

#### Rich Notifications
- **PR review summary:** Issues found, severity breakdown, link to PR
- **Test generation:** Files tested, tests generated, link to PR
- **Doc updates:** Files updated, OpenAPI spec changes, link to docs
- **Coverage alerts:** Current coverage, threshold, link to PR

#### Interactive Actions
- **View PR:** Button to open PR in GitHub/GitLab
- **View Dashboard:** Button to open ReadyLayer dashboard
- **Acknowledge:** Button to acknowledge notification (dismiss)

#### Threading
- **Thread replies:** Replies to notification create thread
- **Context:** Thread shows related notifications (same PR)

### Webhook Integration

#### Slack Webhook URL
```
POST https://hooks.slack.com/services/{workspace_id}/{channel_id}/{token}
```

#### Notification Payload
```json
{
  "text": "ReadyLayer Review Completed",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*PR Review Completed*\n<https://github.com/acme/myapp/pull/42|#42: Add user authentication>"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Issues Found:*\n3"
        },
        {
          "type": "mrkdwn",
          "text": "*Severity:*\n1 Critical, 2 High"
        }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View PR"
          },
          "url": "https://github.com/acme/myapp/pull/42"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Dashboard"
          },
          "url": "https://readylayer.com/reviews/review_123"
        }
      ]
    }
  ]
}
```

### Rate Limiting
- **Per-channel:** 1 notification per event (deduplication)
- **Per-workspace:** 100 notifications/hour
- **Strategy:** Batch notifications, queue when rate limited

### Security
- **Webhook tokens:** Stored encrypted in database
- **OAuth:** Slack OAuth for app installation
- **Scopes:** `chat:write`, `channels:read`, `groups:read`

---

## Jira Integration

### Core Use Cases

#### 1. Create Issues from Review Findings
**Use Case:** Automatically create Jira issues for critical review findings

**Flow:**
1. PR review completes
2. Critical issues found
3. ReadyLayer creates Jira issues (one per issue or grouped)
4. Issues linked to PR
5. Team tracks issues in Jira

**Value:** Track code quality issues in Jira, integrate with existing workflow

---

#### 2. Link PRs to Jira Issues
**Use Case:** Link ReadyLayer-reviewed PRs to Jira issues

**Flow:**
1. PR opened with Jira issue key in title/description
2. ReadyLayer detects issue key
3. ReadyLayer links PR to issue
4. ReadyLayer adds comment to Jira issue with review summary
5. Team sees review results in Jira

**Value:** Connect code reviews to project management

---

#### 3. Update Issue Status
**Use Case:** Update Jira issue status based on PR status

**Flow:**
1. PR merged
2. ReadyLayer detects linked Jira issue
3. ReadyLayer updates issue status (e.g., "Done", "In Review")
4. Team sees issue status updated

**Value:** Automate issue tracking based on PR status

---

#### 4. Coverage Reports
**Use Case:** Add coverage reports to Jira issues

**Flow:**
1. CI completes, coverage calculated
2. ReadyLayer detects linked Jira issue
3. ReadyLayer adds coverage report as comment
4. Team sees coverage in Jira

**Value:** Track test coverage in Jira

---

### Installation

#### From ReadyLayer Dashboard
1. Go to Settings → Integrations → Jira
2. Click "Connect Jira"
3. Enter Jira URL (cloud or server)
4. Authorize ReadyLayer Jira app (OAuth)
5. Select project for issue creation
6. Configure issue creation rules

#### From Jira Marketplace
1. Go to Jira Marketplace
2. Search "ReadyLayer"
3. Click "Install"
4. Authorize ReadyLayer
5. Configure in ReadyLayer dashboard

### Configuration

#### Issue Creation Rules
- **Severity filter:** Create issues for critical/high issues only
- **Grouping:** One issue per finding, or group by file/type
- **Project:** Default project for issue creation
- **Issue type:** Bug, Task, Story, etc.
- **Labels:** Auto-add labels (e.g., "readylayer", "ai-generated")

#### Issue Linking
- **Auto-link:** Automatically link PRs to issues (via issue key in PR title/description)
- **Manual link:** User can manually link PR to issue

#### Status Updates
- **PR opened:** Update issue status to "In Review"
- **PR merged:** Update issue status to "Done"
- **PR closed:** Update issue status to "Rejected" (if not merged)

### Features

#### Issue Creation
- **Title:** "Security issue in {file}: {rule_name}"
- **Description:** Full review comment, code snippet, suggestion
- **Labels:** Auto-add labels (readylayer, ai-generated, security, etc.)
- **Components:** Auto-assign component based on file path
- **Priority:** Map severity to Jira priority (Critical → Blocker, High → High, etc.)

#### Issue Comments
- **Review summary:** Add comment with review results
- **Coverage report:** Add comment with coverage details
- **Test generation:** Add comment when tests generated

#### Issue Linking
- **PR → Issue:** Link PR to issue (via issue key detection)
- **Issue → PR:** Add PR link to issue description/comments

### API Integration

#### Create Issue
```typescript
POST /rest/api/3/issue
Body: {
  "fields": {
    "project": {
      "key": "PROJ"
    },
    "summary": "Security issue in src/auth.ts: SQL injection",
    "description": {
      "type": "doc",
      "version": 1,
      "content": [
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": "ReadyLayer found a security issue in PR #42:"
            }
          ]
        },
        {
          "type": "codeBlock",
          "attrs": {
            "language": "typescript"
          },
          "content": [
            {
              "type": "text",
              "text": "const query = `SELECT * FROM users WHERE id = ${id}`;"
            }
          ]
        }
      ]
    },
    "issuetype": {
      "name": "Bug"
    },
    "labels": ["readylayer", "security", "ai-generated"],
    "priority": {
      "name": "Critical"
    }
  }
}
```

#### Add Comment
```typescript
POST /rest/api/3/issue/{issue_id}/comment
Body: {
  "body": {
    "type": "doc",
    "version": 1,
    "content": [
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "ReadyLayer review completed for PR #42:"
          }
        ]
      },
      {
        "type": "bulletList",
        "content": [
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  {
                    "type": "text",
                    "text": "3 issues found (1 Critical, 2 High)"
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

#### Update Issue Status
```typescript
POST /rest/api/3/issue/{issue_id}/transitions
Body: {
  "transition": {
    "id": "21" // "Done" transition ID
  }
}
```

### Rate Limiting
- **Per-instance:** 100 API calls/hour (Jira Cloud)
- **Self-hosted:** Configurable
- **Strategy:** Batch requests, queue when rate limited

### Security
- **OAuth:** Jira OAuth for app authentication
- **API tokens:** Stored encrypted in database
- **Scopes:** `write:jira-work`, `read:jira-work`, `manage:jira-project`

---

## Common Patterns

### Notification Deduplication
- **Same event:** Don't send duplicate notifications (dedupe by event ID)
- **Batching:** Batch multiple events into one notification (e.g., multiple PRs reviewed)

### Error Handling
- **Transient failures:** Retry with exponential backoff (max 3 retries)
- **Permanent failures:** Log error, alert ops team
- **Partial failures:** Continue processing other events

### User Preferences
- **Per-user:** Users can configure notification preferences
- **Per-repo:** Repos can have different notification settings
- **Per-event:** Different settings for different event types

---

## Best Practices

1. **Rate limiting:** Respect API rate limits, batch requests
2. **Error handling:** Retry transient failures, log permanent failures
3. **User experience:** Clear notifications, actionable buttons
4. **Security:** Encrypt tokens, use OAuth, audit logs
5. **Performance:** Batch notifications, cache results
6. **Monitoring:** Track notification delivery, error rates
