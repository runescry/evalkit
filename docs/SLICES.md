# PR slices

One slice per branch. Merge to `main` in order. Check box when merged.

| Slice | Branch | Status | Acceptance summary |
|-------|--------|--------|-------------------|
| 00a | `infra/agent-harness` | complete | AGENTS.md, rules, skills, docs, CI skeleton, fixtures |
| 00b | `infra/scaffold` | complete | Next.js 15, shadcn, vercel.json, `.env.example`, deploy green |
| 01 | `infra/ai-gateway` | complete | `lib/ai.ts` two-tier routing, `/api/health` |
| 02 | `infra/kv-storage` | pending | `lib/store.ts` Zod CRUD, p99 < 50ms |
| 03 | `infra/workflow` | pending | `workflows/eval-run.ts`, durable steps, POST `/api/runs` |
| 04 | `feature/test-case-generator` | pending | 6 categories, Zod output, prompt hash |
| 05 | `feature/sandbox-runner` | pending | Isolated sandbox per case, 10s timeout, fan-out 5 |
| 06 | `feature/rubric-scorer` | pending | 4-dimension scores, flag < 14 |
| 07 | `feature/report-stream` | pending | SSE report, `/runs/[id]`, mobile layout |
| 08 | `feature/approval-gate` | pending | Workflow hook, approve/reject APIs, UI card |
| 09 | `feature/prompt-fixes` | pending | `PromptFix[]`, diff in approval card |
| 10 | `feature/eval-set` | pending | ground-truth.json, L3 gate ≥ 85% alignment |
| 11 | `feature/input-ui` | pending | Landing form, recent runs, progressive enhancement |
| 12 | `feature/slack-chat-sdk` | pending | `/eval` slash command, threaded updates |
| 13 | `infra/observability` | pending | Spans, `/metrics`, cost on report |
| 14 | `feature/auth` | pending | Rate limit middleware, API keys |
| 15 | `release/v1` | pending | Error boundaries, README, CHANGELOG 1.0.0, prod deploy |

## Per-slice test requirements

Run `npm run gates` before every slice commit. Add tests in the slice that introduces the capability.

| Slice | Unit | Contract | CRUD | Integration | Eval |
|-------|------|----------|------|-------------|------|
| 00a | `mock-ai` | — | — | — | — |
| 00b | scaffold smoke | — | — | — | — |
| 01 | `lib/ai` | `/api/health` | — | gateway fallback | — |
| 02 | `lib/store` | — | `lib/store.crud` | — | — |
| 03 | workflow steps | `/api/runs` | store mocks | workflow resume | — |
| 04–06 | agent modules | — | — | — | — |
| 07–09 | components + agents | stream/approve routes | — | report SSE | — |
| 10 | scorer | — | — | — | `test:eval` ≥85% |
| 11–15 | per slice | per slice | if store touched | if workflow touched | 10+ |

Suites with no files yet report `N/A` and pass until the introducing slice lands.

## Slice 00a acceptance

- [x] `AGENTS.md` with bootstrap order and "when to stop and ask"
- [x] 5 `.cursor/rules/*.mdc` files
- [x] 2 `.cursor/skills/` project skills
- [x] `docs/` complete (ARCHITECTURE, SLICES, CONTRIBUTING, DECISIONS, ENV, PROMPTS, RUNBOOK, ANTI_PATTERNS)
- [x] `fixtures/`, `lib/test/mock-ai.ts`, `scripts/replay-run.ts` stubs
- [x] `.cursorignore`, `.editorconfig`, `.nvmrc`, tooling stubs
- [x] `SECURITY.md`, `LICENSE`, `CHANGELOG.md`, `ROADMAP.md`
- [x] Per-slice test policy in `AGENTS.md` and `CONTRIBUTING.md`
- [x] `npm run gates` runs unit + contract + crud + integration + build
