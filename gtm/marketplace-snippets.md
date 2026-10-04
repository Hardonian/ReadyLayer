# Marketplace Copy Kit

Use these snippets only for a provider integration that has passed its contract tests and completed an owner-approved
release checklist. Replace bracketed values before publication.

## Short listing

**ReadyLayer — governance evidence for agent-assisted code changes**

Evaluate pull-request changes with versioned policy and retain traceable decision evidence. Start with deterministic
fixtures, validate in shadow mode, and enforce only the controls your team accepts.

## Long listing

ReadyLayer is an open-source governance layer for agent-assisted software delivery. It adds deterministic checks, policy
versioning, signed exceptions, and portable evidence to existing Git and CI workflows.

This integration supports the provider-specific capabilities listed in the ReadyLayer trust center. Availability varies by
provider; beta workflows require validation in the operator's environment.

**Start here**

1. Inspect repository evidence at `[BASE_URL]/security`.
2. Run the deterministic evaluation at `[BASE_URL]/evaluate`.
3. Connect a non-production repository.
4. Operate in shadow mode before enabling merge-blocking policy.

## CTA variants

- Evaluate from evidence
- Inspect the trust center
- Deploy open source
- Scope a design-partner pilot

## Disallowed marketplace copy

- Customer or adoption numbers without an auditable source
- Anonymous or invented testimonials
- Certification or regulatory outcome claims
- Availability, throughput, or support commitments without an active agreement
- Trial, discount, or price language not backed by the live commercial offer
- “Production-ready,” “zero risk,” or similar absolute outcomes

## Provider checklist

- [ ] Listing links resolve in the target environment
- [ ] Permissions match the installed integration
- [ ] Provider contract and webhook security tests pass
- [ ] Data handling is documented
- [ ] Failure and rollback behavior is documented
- [ ] Screenshots contain deterministic fixtures only
- [ ] Capability maturity matches `lib/product/capability-catalog.ts`
