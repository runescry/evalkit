# PR slices

One slice per branch. Merge to `main` in order. Check box when merged.

| Slice | Branch | Status | Acceptance summary |
|-------|--------|--------|-------------------|
| 00a | `infra/agent-harness` | complete | AGENTS.md, rules, skills, docs, CI skeleton, fixtures |
| 00b | `infra/scaffold` | complete | Next.js 15, shadcn, vercel.json, `.env.example`, deploy green |
| 01 | `infra/ai-gateway` | complete | `lib/ai.ts` two-tier routing, `/api/health` |
| 02 | `infra/kv-storage` | complete | `lib/store.ts` Zod CRUD, p99 < 50ms |
| 03 | `infra/workflow` | complete | `workflows/eval-run.ts`, durable steps, POST `/api/runs` |
| 04 | `feature/test-case-generator` | complete | 6 categories, Zod output, prompt hash |
| 05 | `feature/sandbox-runner` | complete | Isolated sandbox per case, 10s timeout, fan-out 5 |
| 06 | `feature/rubric-scorer` | complete | 4-dimension scores, flag < 14 |
| 07 | `feature/report-stream` | complete | SSE report, `/runs/[id]`, mobile layout |
| 08 | `feature/approval-gate` | complete | Workflow hook, approve/reject APIs, UI card |
| 09 | `feature/prompt-fixes` | complete | `PromptFix[]`, diff in approval card |
| 10 | `feature/eval-set` | complete | ground-truth.json, L3 gate ≥ 85% alignment |
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

## Slice 04 acceptance

- [x] `agents/generate-cases.ts` — fast tier via `lib/ai.ts`, structured output with Zod
- [x] Six categories: hallucination, scope_drift, jailbreak, edge_case, adversarial, regression
- [x] `lib/prompts.ts` — versioned template; `promptVersions.generateCases` hash stored on run
- [x] Unit tests mock `lib/ai`; fintech fixture asserts ≥1 per category, no duplicate inputs

## Slice 05 acceptance

- [x] `agents/run-sandbox.ts` — one Vercel Sandbox per test case; POST target URL with case input
- [x] 10s request timeout per case (`SANDBOX_TIMEOUT_MS`); tear down sandbox after capture
- [x] Fan-out max 5 concurrent cases (`SANDBOX_FANOUT`); workflow `runSandboxStep` wired to agent
- [x] Unit tests mock `@vercel/sandbox`; integration hook `__EVALKIT_RUN_SANDBOX__` — no live Sandbox in CI

## Slice 06 acceptance

- [x] `agents/score-results.ts` — strong tier via `lib/ai.ts`, structured output with Zod
- [x] Four dimensions scored 1–5: correctness, safety, scope adherence, confidence calibration
- [x] `total` = sum out of 20; `flagged` when total < 14
- [x] Each scored `TestResult` persisted incrementally via `updateRun` for UI progress
- [x] `lib/prompts.ts` — versioned scorer template; `promptVersions.scoreResults` hash on run
- [x] Workflow `scoreResultsStep` wired to agent; unit tests mock `lib/ai` — assert schema + flag behavior

## Slice 07 acceptance

- [x] `agents/build-report.ts` — strong tier stream via `streamWithTier`, incremental KV markdown updates
- [x] `lib/prompts.ts` — versioned report template; `promptVersions.buildReport` hash on run
- [x] `GET /api/runs/[id]/stream` — SSE progress + report events; contract tests
- [x] `lib/sse.ts` — shared client subscribe helper (no inline parsing in components)
- [x] `/runs/[id]` page — skeleton UI, responsive layout, streams report until `awaiting_approval`
- [x] Workflow `buildReportStep` wired to agent; unit + integration tests with mocks

## Slice 08 acceptance

- [x] `POST /api/runs/[id]/approve` — `{ approved: boolean }` resumes `approvalHook` token `approval:{runId}`
- [x] 409 when run not `awaiting_approval`; contract tests
- [x] `ApprovalCard` component — approve/reject actions on run page

## Slice 09 acceptance

- [x] `agents/suggest-fixes.ts` — strong tier structured `PromptFix[]` from flagged results
- [x] `lib/prompts.ts` — versioned suggest-fixes template; `promptVersions.suggestFixes` hash on run
- [x] Workflow `applyFixesStep` wired to agent (replaces stub fixes)
- [x] `FixSuggestions` component — unified diff display below approval card

## Slice 10 acceptance

- [x] `evals/ground-truth.json` — flagged labels for mocked rubric outputs
- [x] `lib/eval-alignment.ts` + `evals/run-evals.ts` — alignment rate vs ground truth
- [x] L3 gate ≥ 85%; `npm run test:eval` in gates; CI blocks on failure
