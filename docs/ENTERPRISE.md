# ReadyLayer Enterprise Evaluation

ReadyLayer's enterprise motion is a **design-partner pilot around the open-source product**. This document is the
commercial and assurance boundary for public product material.

## What is available

- The Apache-2.0 open-source runner, web application, APIs, and evidence formats in this repository.
- A scoped pilot for one or more repositories with written acceptance criteria.
- Deployment design for self-hosted or managed infrastructure.
- Policy mapping, shadow-mode tuning, evidence export, and operator enablement.

The canonical implementation status is published in `lib/product/capability-catalog.ts` and rendered at `/security`.

## What is not publicly promised

The following are not commitments unless an executed agreement states otherwise:

- Uptime, response-time, recovery-time, or support service levels.
- Specific hosting regions, data-residency options, or single-tenant topology.
- Security or compliance certifications.
- A business associate agreement, data processing addendum, or regulated-workload eligibility.
- Particular integration coverage, throughput, or scale.
- Fixed retention, backup, or disaster-recovery periods.

ReadyLayer can provide technical evidence inputs for a customer's compliance program. It does not certify a customer,
replace an auditor, or make a regulated deployment compliant by itself.

## Pilot structure

1. **Baseline** — choose a repository and protected paths; document existing controls and owners.
2. **Shadow** — run without blocking; measure policy precision, operator load, and failure behavior.
3. **Enforce** — enable only accepted controls; configure signed, scoped, expiring exceptions.
4. **Decide** — export evidence; record production go/no-go, risks, owners, and rollback criteria.

### Minimum acceptance evidence

- Representative critical changes are detected consistently.
- Decisions name the policy version and evidence source.
- Provider and dependency failures follow the agreed fail-open/fail-closed policy.
- Cross-tenant access controls are tested in the target topology.
- Operators can export and independently inspect the evidence.
- Rollback, incident response, ownership, and escalation paths are rehearsed.

Use [the go-live runbook](./runbooks/go-live.md) for the final gate.

## Open source and managed deployment

The governance logic remains inspectable in the open-source repository. A managed engagement may add operational work,
support, and an agreed deployment topology; it does not create a hidden policy engine. Data portability and exit steps
must be documented during the pilot.

## Commercial process

Public pages intentionally do not publish a price, free-trial promise, or service level that has not been approved as an
active offer. A proposal should state:

- repositories and providers in scope;
- deployment and data boundary;
- acceptance criteria and pilot duration;
- support and escalation coverage;
- security and privacy obligations;
- fees, payment terms, and exit assistance.

Contact `sales@readylayer.io` to scope a pilot. Security questions can be sent to `security@readylayer.io`.
