# Security

## Secrets

**Never commit:**

- `.env`, `.env.local`, `.env.production`
- API keys, tokens, or signing secrets
- Vercel OIDC tokens or KV credentials

Use [docs/ENV.md](./docs/ENV.md) and `.env.example` (placeholders only).

## PII

EvalKit processes user-supplied URLs and app descriptions. In logs and observability:

- Log **domain only** for URLs
- Hash or omit descriptions in span attributes
- Do not include full request bodies in error reports

## Reporting issues

For security vulnerabilities, contact the repository owner directly rather than opening a public issue with exploit details.

## CI

Pull requests run secret scanning (`.github/workflows/secret-scan.yml`). If a secret is detected, the build fails — rotate the credential and remove it from git history.

## Dependencies

Dependabot opens weekly PRs for npm updates. Review before merging.
