# ReadyLayer — Onboarding Email Sequence

## Email 1: Welcome (Day 0)

### Subject
Welcome to ReadyLayer — Let's get started!

### From
ReadyLayer Team <hello@readylayer.com>

### Body

Hi {{first_name}},

Welcome to ReadyLayer! We're excited to help you make AI-generated code production-ready.

**What's ReadyLayer?**
ReadyLayer automatically reviews, tests, and documents AI-generated code before merge. It sits after AI code generation and before merge, ensuring production readiness without manual work.

**Next Steps:**
1. **Install ReadyLayer:** [Install GitHub App]({{install_url}}) or connect your GitLab/Bitbucket account
2. **Configure your first repo:** [Go to Dashboard]({{dashboard_url}})
3. **Create a test PR:** ReadyLayer will automatically review it

**Quick Links:**
- [Documentation](https://docs.readylayer.com)
- [Video Tutorial](https://readylayer.com/tutorial)
- [Support](mailto:support@readylayer.com)

**Your Trial:**
- **Plan:** {{plan_name}}
- **Trial ends:** {{trial_end_date}}
- **Repos:** {{repo_count}} repos included

Questions? Just reply to this email—we're here to help!

Best,
The ReadyLayer Team

---

## Email 2: First Review (Day 1)

### Subject
Your first ReadyLayer review is ready! 🎉

### From
ReadyLayer Team <hello@readylayer.com>

### Body

Hi {{first_name}},

Great news! ReadyLayer has completed its first review of your code.

**Review Summary:**
- **PR:** {{pr_title}} (#{{pr_number}})
- **Issues found:** {{issue_count}}
- **Critical:** {{critical_count}}
- **High:** {{high_count}}

[View Review]({{review_url}})

**What's Next?**
1. **Review the feedback:** Check inline comments in your PR
2. **Fix issues:** Address critical and high issues
3. **Generate tests:** ReadyLayer can generate tests for AI-touched files
4. **Merge when ready:** ReadyLayer will update docs on merge

**Pro Tip:** ReadyLayer learns from your codebase. The more you use it, the better it gets at understanding your patterns.

**Need Help?**
- [Documentation](https://docs.readylayer.com)
- [Support](mailto:support@readylayer.com)

Happy coding!
The ReadyLayer Team

---

## Email 3: Feature Deep Dive (Day 3)

### Subject
Get the most out of ReadyLayer — 3 features you'll love

### From
ReadyLayer Team <hello@readylayer.com>

### Body

Hi {{first_name}},

You've been using ReadyLayer for a few days. Here are 3 features that will make your life easier:

**1. Test Generation**
ReadyLayer automatically generates tests for AI-touched files. Just enable it in your repo config:

```yaml
test:
  enabled: true
  framework: "jest"  # Auto-detected
  coverage_threshold: 80
```

[Learn More](https://docs.readylayer.com/test-generation)

**2. Custom Rules**
Configure rules and thresholds per repo. Want to be stricter on security? No problem:

```yaml
review:
  fail_on_critical: true
  fail_on_high: true  # Block on high issues too
  severity_overrides:
    security.sql-injection: critical
```

[Learn More](https://docs.readylayer.com/custom-rules)

**3. Documentation Sync**
Keep API docs in sync automatically. ReadyLayer generates OpenAPI specs on merge:

```yaml
docs:
  enabled: true
  update_strategy: "pr"  # Create PR for doc updates
```

[Learn More](https://docs.readylayer.com/doc-sync)

**Your Usage So Far:**
- **PRs reviewed:** {{pr_count}}
- **Issues found:** {{total_issues}}
- **Tests generated:** {{test_count}}

[View Dashboard]({{dashboard_url}})

Questions? [Schedule a call]({{calendly_url}}) or reply to this email.

Best,
The ReadyLayer Team

---

## Email 4: Best Practices (Day 7)

### Subject
ReadyLayer best practices — from our power users

### From
ReadyLayer Team <hello@readylayer.com>

### Body

Hi {{first_name}},

You've been using ReadyLayer for a week! Here are best practices from our power users:

**1. Start with Defaults**
Don't over-configure. Start with defaults, then customize as needed. ReadyLayer's defaults work for 90% of repos.

**2. Exclude Vendor Code**
Always exclude vendor code from review:

```yaml
review:
  excluded_paths:
    - "**/vendor/**"
    - "**/node_modules/**"
    - "**/dist/**"
```

**3. Use Coverage Thresholds**
Set realistic coverage thresholds. Start at 70%, then increase:

```yaml
test:
  coverage:
    threshold: 70  # Start here
    enforce_on: "pr"
```

**4. Enable Doc Sync**
Keep docs in sync automatically. It's one less thing to worry about:

```yaml
docs:
  enabled: true
  update_strategy: "pr"  # Review doc updates before merging
```

**5. Review Regularly**
Check your ReadyLayer dashboard weekly. Look for trends:
- Are security issues decreasing?
- Is coverage improving?
- Are docs staying in sync?

**Your Progress:**
- **PRs reviewed:** {{pr_count}}
- **Coverage:** {{coverage_percentage}}% (target: {{target_coverage}}%)
- **Docs updated:** {{doc_update_count}}

[View Dashboard]({{dashboard_url}})

**Trial Ending Soon:**
Your trial ends on {{trial_end_date}}. [Upgrade now]({{upgrade_url}}) to keep using ReadyLayer.

**Need Help?**
- [Documentation](https://docs.readylayer.com)
- [Community Forum](https://community.readylayer.com)
- [Support](mailto:support@readylayer.com)

Keep up the great work!
The ReadyLayer Team

---

## Email 5: Trial Ending (Day 13)

### Subject
Your ReadyLayer trial ends tomorrow — Upgrade to keep going

### From
ReadyLayer Team <hello@readylayer.com>

### Body

Hi {{first_name}},

Your ReadyLayer trial ends tomorrow ({{trial_end_date}}). Here's what you've accomplished:

**Your Impact:**
- **PRs reviewed:** {{pr_count}}
- **Issues caught:** {{total_issues}} ({{critical_count}} critical)
- **Tests generated:** {{test_count}}
- **Coverage improved:** {{coverage_improvement}}%

**What Happens Next?**
After your trial ends, ReadyLayer will stop reviewing PRs. Upgrade now to keep the protection going.

**Choose Your Plan:**
- **Starter ($49/month):** 5 repos, basic features
- **Growth ($199/month):** 25 repos, advanced features
- **Scale (Custom):** Unlimited repos, enterprise features

[Upgrade Now]({{upgrade_url}})

**Special Offer:**
Use code **TRIAL20** for 20% off your first 3 months. Valid until {{trial_end_date}}.

**Questions?**
- [Schedule a call]({{calendly_url}}) to discuss your needs
- [View Pricing](https://readylayer.com/pricing)
- [Contact Sales](mailto:sales@readylayer.com)

We'd love to keep you as a customer!

Best,
The ReadyLayer Team

---

## Email 6: Post-Trial Follow-Up (Day 14+)

### Subject
We miss you — Ready to come back?

### From
ReadyLayer Team <hello@readylayer.com>

### Body

Hi {{first_name}},

We noticed your ReadyLayer trial ended. We hope you found value in the platform!

**What You're Missing:**
- Automatic code review for AI-generated code
- Test generation and coverage enforcement
- Documentation sync
- Security vulnerability detection

**Special Offer:**
We'd love to have you back. Use code **COMEBACK25** for 25% off your first 3 months.

[Start Your Subscription]({{upgrade_url}})

**What Changed?**
We've added new features since your trial:
- {{new_feature_1}}
- {{new_feature_2}}
- {{new_feature_3}}

[See What's New](https://readylayer.com/changelog)

**Need Help Deciding?**
- [Schedule a call]({{calendly_url}}) to discuss your needs
- [View Pricing](https://readylayer.com/pricing)
- [Contact Sales](mailto:sales@readylayer.com)

We're here to help!

Best,
The ReadyLayer Team

---

## Email Templates (Variables)

### User Variables
- `{{first_name}}`: User's first name
- `{{email}}`: User's email
- `{{plan_name}}`: Current plan (Starter, Growth, Scale)
- `{{trial_end_date}}`: Trial end date
- `{{repo_count}}`: Number of repos

### Usage Variables
- `{{pr_count}}`: Number of PRs reviewed
- `{{issue_count}}`: Total issues found
- `{{critical_count}}`: Critical issues found
- `{{high_count}}`: High issues found
- `{{test_count}}`: Tests generated
- `{{coverage_percentage}}`: Current coverage percentage
- `{{target_coverage}}`: Target coverage threshold
- `{{doc_update_count}}`: Documentation updates
- `{{coverage_improvement}}`: Coverage improvement percentage

### URL Variables
- `{{install_url}}`: GitHub App install URL
- `{{dashboard_url}}`: ReadyLayer dashboard URL
- `{{review_url}}`: Review detail URL
- `{{upgrade_url}}`: Upgrade/pricing URL
- `{{calendly_url}}`: Calendly scheduling URL

---

## Best Practices

### Timing
- **Day 0:** Welcome email (immediate)
- **Day 1:** First review (if review completed)
- **Day 3:** Feature deep dive
- **Day 7:** Best practices
- **Day 13:** Trial ending reminder
- **Day 14+:** Post-trial follow-up

### Personalization
- Use user's first name
- Reference their actual usage
- Include relevant features based on their activity

### CTAs
- Clear, single CTA per email
- Use action-oriented language
- Make it easy to take action

### Value
- Focus on benefits, not features
- Show progress and impact
- Provide helpful tips and resources

---

## A/B Testing Ideas

### Subject Lines
- "Welcome to ReadyLayer" vs. "Let's make AI code production-ready"
- "Your first review is ready" vs. "ReadyLayer found {{issue_count}} issues"

### CTAs
- "Get Started" vs. "Install Now"
- "Upgrade Now" vs. "Continue with ReadyLayer"

### Content
- Short vs. long emails
- Feature-focused vs. benefit-focused
- Single CTA vs. multiple CTAs
