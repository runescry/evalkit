# Contributing

## Trunk development

- **`main`** is always deployable
- **One slice per branch** — see [SLICES.md](./SLICES.md) for branch names
- **One commit per slice** on the feature branch before PR
- **PR required** — use [.github/PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md)
- **Merge in slice order** — do not skip dependencies
- **Squash merge** preferred — one commit per slice on trunk

## Branch protection (GitHub settings)

Configure on `main`:

- Require pull request before merging
- Require status checks: `Quality gates`, `Dependency audit`, `Gitleaks`, `SAST`
- Do not allow force pushes

Full pipeline: [CICD.md](./CICD.md) (local → Git → Vercel).

## Local setup

After Slice 00b:

```bash
nvm use          # Node 22 from .nvmrc
cp .env.example .env.local
npm ci
npm run dev
```

See [ENV.md](./ENV.md) for all variables.

## Quality gates

Run **all** suites before every slice commit:

```bash
npm run gates
```

| Suite | Command | Required from |
|-------|---------|---------------|
| L0 typecheck | `npm run typecheck` | Slice 00a |
| L0 lint | `npm run lint` | Slice 00b |
| L1 unit | `npm run test` | Slice 00a |
| L2 contract | `npm run test:contract` | Slice 01 (API routes) |
| CRUD | `npm run test:crud` | Slice 02 (`lib/store`) |
| Integration | `npm run test:integration` | Slice 03 (workflow) |
| Build | `npm run build` | Slice 00b |
| L3 eval | `npm run test:eval` | Slice 10 (also on push to `main`) |

Suites with no test files yet print `N/A` and pass — until that slice adds tests. See [per-slice test requirements](./SLICES.md#per-slice-test-requirements).

## Commits

**Every completed slice gets one commit** with a [Conventional Commits](https://www.conventionalcommits.org/) message:

```
docs(harness): add slice 00a agent governance and test policy
feat(scaffold): add Next.js 15 app router baseline
feat(store): add Zod-validated KV CRUD layer
```

Enforced via commitlint + husky (wired in Slice 00b).

## Agent contributors

Read [AGENTS.md](../AGENTS.md) first.

- Run `npm run gates` before every slice commit
- Commit when slice acceptance criteria are met
- Do not push or deploy unless the user explicitly asks

## Changelog

Update [CHANGELOG.md](../CHANGELOG.md) `[Unreleased]` with each slice commit.
