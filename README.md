# EvalKit

AI eval harness for deployed chatbots. Paste a URL + description → targeted test suite → sandbox execution → rubric scoring → streaming report → human-approved prompt fixes.

**Version 1.0.0** (base release) + post-v1 enhancements: agent-matrix persona eval, dual scoring, architecture reference UI, and LLM prompt inspection on reports.

## Architecture

```
URL + description (or demo preset)
  → POST /api/runs
  → Workflow (generate → sandbox × N → score → report → approval → fixes)
  → Vercel KV (run state)
  → SSE stream + /runs/[id] report UI
```

- **Models:** two-tier routing via Vercel AI Gateway — `fast` for standard case generation, `strong` for adversarial generation, scoring, reports, fixes — see [`lib/ai.ts`](./lib/ai.ts)
- **Eval modes:** single URL (`message-json`) or **agent-matrix** (`harness-json`) with per-agent contracts — see [ADR-010](./docs/DECISIONS.md)
- **Isolation:** one Vercel Sandbox per test case; fan-out 5 (fast-chat) or 2 (long harness); falls back to direct HTTP with `unverified: true` when sandbox infra fails
- **Durability:** Vercel Workflow SDK + Fluid Compute; human approval gate before prompt fixes
- **Observability:** per-run cost/latency on report; OpenTelemetry spans with `evalkit.run_id`

**Reference UI:** [`/architecture`](./app/architecture/page.tsx) — workflow steps, backend map, ADRs, Vercel tradeoffs (interview / onboarding).

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

Open [http://localhost:3000](http://localhost:3000). Use **Run agent-matrix pilot** or **Run aidea fast-chat** presets, or enter a custom URL + description.

**Minimum local env:** `AI_GATEWAY_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`. See [docs/ENV.md](./docs/ENV.md) for the full variable reference.

## Report page

`/runs/[id]` shows:

- Streaming markdown report, pipeline progress, live activity
- Flagged findings (including harness `toolCalls` and validation notes)
- Dual-tier score comparison when `scoringMode: dual`
- **LLM trace** — system/user/assistant per Gateway call (stored on run or reconstructed from snapshot)
- Cost summary, approval card, suggested fixes

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
3. **Merge to `main`** — Vercel Git integration deploys production after GitHub checks pass

```bash
npx vercel link
npx vercel deploy          # preview only
```

**Production:** prefer `git push` to `main`. If the project has **Deployment Checks** wired to GitHub Actions, `vercel deploy --prod` from a laptop has no commit SHA — checks can hang indefinitely. See [docs/CICD.md](./docs/CICD.md).

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
- [Prompts](./docs/PROMPTS.md)
- [Runbook](./docs/RUNBOOK.md)
- [Roadmap](./ROADMAP.md)
- [aidea persona eval handoff](./docs/AIDEA-PERSONA-EVAL-HANDOFF.md)
