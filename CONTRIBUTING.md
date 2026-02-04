# Contributing to ReadyLayer

Thank you for investing time in ReadyLayer. This guide explains how to run the project, propose changes, and collaborate safely.

## Who Should Contribute
- **Developers** improving the web app, API routes, CLI, or runner.
- **Platform engineers** validating infrastructure and deployment workflows.
- **Documentation contributors** clarifying setup, architecture, and governance.

## Project Setup
**Prerequisites**
- Node.js 20
- Postgres database
- Supabase project credentials (URL + anon/service keys)
- At least one LLM API key (OpenAI or Anthropic)

**Install & Run**
```bash
npm install
cp .env.example .env
# Fill in DATABASE_URL, Supabase keys, and an LLM API key in .env
npm run dev
```

## How to Make a Small, Safe First Contribution
- Improve README/CONTRIBUTING clarity or fix typos.
- Add unit tests in `__tests__/` or `tests/` for existing functions.
- Update UI copy or layout in `app/` without changing backend behavior.

Look for issues labeled **good first issue** or **help wanted**.

## Development Workflow
1. Create a branch from `main`.
2. Make focused changes with clear commit messages.
3. Run the verification suite before opening a PR:
   ```bash
   npm run verify
   ```

### Verification Details
`npm run verify` runs linting, type-checking, tests, a production build, and documentation checks. If you only need faster feedback, use:
```bash
npm run verify:fast
```

## Code and Design Guidelines
- Keep changes minimal and scoped to one concern.
- Avoid adding new environment requirements without updating `.env.example`.
- Do not include secrets or production data in commits.
- Preserve API contracts and existing behavior unless explicitly requested.

## Discussion Categories
Use GitHub Discussions for:
- **Q&A**: troubleshooting and how-to questions.
- **Ideas**: feature proposals or product direction.
- **Show & Tell**: integrations, tooling, and case studies.
- **Design/Architecture**: changes to core systems or workflows.

## Reporting Bugs or Requesting Features
- Use GitHub Issues for bugs and feature requests.
- For security issues, follow [SECURITY.md](./SECURITY.md).

## Code of Conduct
By participating, you agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).
