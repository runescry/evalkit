# EvalKit

AI eval harness for deployed chatbots. Paste a URL + description → targeted test suite → sandbox execution → rubric scoring → streaming report → human-approved prompt fixes.

**Version 1.0.0** — production-ready eval pipeline with workflow durability, Slack `/eval`, observability, and sandbox fallback.

## Architecture

```
URL + description
  → POST /api/runs
  → Workflow (generate → sandbox × N → score → report → approval → fixes)
  → Vercel KV (run state)
  → SSE stream + /runs/[id] report UI
```

- **Models:** two-tier routing via Vercel AI Gateway (`fast` for test generation, `strong` for scoring/reports/fixes) — see [`lib/ai.ts`](./lib/ai.ts)
- **Isolation:** one Vercel Sandbox per test case (max 5 concurrent); falls back to direct HTTP with `unverified: true` when sandbox infra fails
- **Durability:** Vercel Workflow SDK checkpoints each step; human approval gate before prompt fixes

Full detail: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) · trade-offs: [docs/DECISIONS.md](./docs/DECISIONS.md)

## Quick start (< 15 min)

```bash
nvm use
cp .env.example .env.local   # placeholders only — see docs/ENV.md
# Or pull from Vercel after linking:
# vercel link && vercel env pull .env.local

npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter a chatbot URL and description, and start an eval run.

**Minimum local env:** `AI_GATEWAY_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`. See [docs/ENV.md](./docs/ENV.md) for the full variable reference.

## Quality gates

```bash
npm run gates
```

Runs typecheck, lint, unit, contract, CRUD, integration, L3 eval alignment (`npm run test:eval` ≥ 85%), and production build. **Required before every slice commit.**

```bash
npm run test:eval   # L3 scorer alignment gate only
```

## Deploy (Vercel)

1. Connect the repo in [Vercel](https://vercel.com) → Settings → Git
2. Set **production** environment variables (checklist below)
3. Merge to `main` — Vercel deploys production automatically; PRs get preview deploys

```bash
npx vercel link
npx vercel deploy          # preview
npx vercel deploy --prod   # production (or merge to main)
```

Verify after deploy:

```bash
curl -s https://<your-domain>/api/health | jq
```

See [docs/CICD.md](./docs/CICD.md) for CI/CD pipeline and production env checklist.

### Production env checklist

| Variable | Required | Notes |
|----------|----------|-------|
| `AI_GATEWAY_API_KEY` | Yes | All model calls via Gateway |
| `KV_REST_API_URL` | Yes | Vercel KV / Upstash |
| `KV_REST_API_TOKEN` | Yes | Vercel KV / Upstash |
| `VERCEL_OIDC_TOKEN` | Auto on Vercel | Sandbox isolation in prod |
| `SLACK_BOT_TOKEN` | For `/eval` | Slack bot `xoxb-…` |
| `SLACK_SIGNING_SECRET` | For `/eval` | Slack request verification |
| `NEXT_PUBLIC_APP_URL` | Optional | Public origin for Slack run links |

Canonical reference: [docs/ENV.md](./docs/ENV.md)

## For agents

Start with [AGENTS.md](./AGENTS.md).

## Docs

- [Architecture](./docs/ARCHITECTURE.md)
- [Slices](./docs/SLICES.md)
- [Contributing](./docs/CONTRIBUTING.md)
- [Environment variables](./docs/ENV.md)
- [CI/CD](./docs/CICD.md)
- [Roadmap](./ROADMAP.md)
