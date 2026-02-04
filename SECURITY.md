# Security Policy

Security is critical for governance tooling. This document explains how to report vulnerabilities and how to keep local environments safe.

## Reporting a Vulnerability
Please do **not** file public GitHub issues for security reports.

Email: [security@readylayer.io](mailto:security@readylayer.io)

Include:
- A clear description of the issue
- Steps to reproduce
- Potential impact
- Any proof-of-concept (if safe)
- Your preferred contact for follow-up

We aim to acknowledge reports within a few business days and will coordinate timelines for disclosure once a fix is ready.

## Supported Versions
Security fixes are applied to the `main` branch. If you are running a fork, please plan to pull updates regularly.

## Security Best Practices for Contributors
- **Never commit secrets.** Use `.env` locally and keep it out of version control.
- **Redact sensitive output** when sharing logs or screenshots.
- **Keep dependencies updated** and follow guidance from `npm audit`.
- **Validate external inputs** in new API endpoints or CLI commands.

## Deployment Guidance
If you deploy ReadyLayer yourself:
- Run behind HTTPS.
- Restrict access to administrative routes.
- Use least-privilege database credentials.
- Rotate API keys and tokens periodically.

For additional guidance, see the documentation in `docs/`.
