# Contributing to ReadyLayer

Thank you for contributing. This repo is production-grade and PRs are expected to meet the same standards we ship with.

## Development setup

```bash
npm install
cp .env.example .env
npm run db:reconcile
npm run dev
```

## Quality checks

Run these before submitting a PR:

```bash
npm run lint
npm run type-check
npm run build
```

## Pull request expectations

- Keep changes focused and explain the risk you are mitigating.
- Add or update tests when behavior changes.
- Avoid breaking changes unless the PR explains the migration path.
- Update documentation when user-visible behavior changes.

## Security

If you discover a security issue, do not open a public issue. Follow the disclosure guidance in `SECURITY.md`.
