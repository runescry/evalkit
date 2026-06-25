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
| 11 | `feature/input-ui` | complete | Landing form, recent runs, progressive enhancement |
| 12 | `feature/slack-chat-sdk` | complete | `/eval` slash command, threaded updates |
| 13 | `infra/observability` | complete | Spans, `/metrics`, cost on report |
| 14 | `feature/auth` | deferred | Rate limit middleware, API keys (post-v1 backlog) |
| 15 | `release/v1` | complete | Error boundaries, README, CHANGELOG 1.0.0, prod deploy |
| 16 | `feature/post-v1-interview` | complete | Agent-matrix, architecture page, demo presets, dual scoring, LLM prompts panel |
| 17 | `infra/observability-trace` | complete | Cost metrics hardening, LLM trace panel, Gateway cost backfill |
| 18 | `feature/multi-vendor-scoring` | complete | Sonnet + OpenAI judges via Gateway BYOK, multi-vendor scoring mode |

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
| 11–16 | per slice | per slice | if store touched | if workflow touched | 10+ |

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

## Slice 11 acceptance

- [x] Landing page form — URL, description, case count (`EvalStartForm` + server action)
- [x] Progressive enhancement — number input works without JS
- [x] `RecentRuns` — server-rendered list from `listRuns`
- [x] `GET /api/runs` — recent runs summary API; contract test

## Slice 12 acceptance

- [x] `lib/slack.ts` — signature verification, command parsing, threaded updates
- [x] `POST /api/slack/eval` — `/eval <url> | <description> [--cases=N]`
- [x] Unit + contract tests with mocked fetch

## Slice 13 acceptance

- [x] `lib/observability.ts` — OpenTelemetry spans for workflow steps + AI calls; PII scrubbing (`urlDomainOnly`, `hashDescription`)
- [x] `lib/ai.ts` — `runId` in telemetry metadata; AI call spans + KV metrics aggregation via `recordAiCallWithSpan`
- [x] `EvalRun.metrics` — per-step cost/latency/token breakdown persisted via `updateRun`
- [x] `GET /api/runs/[id]/metrics` — per-run metrics JSON; contract test
- [x] `RunCostSummary` on `/runs/[id]` — cost & latency card on report page
- [x] Staging cost alert documented in `docs/RUNBOOK.md` (Vercel Observability rule for runs >$1.00)
- [x] Unit tests for observability helpers; workflow steps wrapped with `observeWorkflowStep`

## Slice 15 acceptance

- [x] `app/error.tsx`, `app/global-error.tsx`, `app/runs/[id]/error.tsx` — user-friendly fallback UI with retry where appropriate
- [x] Sandbox fallback — direct HTTP POST on sandbox failure; `sandbox.unverified: true` in `lib/types.ts` + `agents/run-sandbox.ts`
- [x] Unit tests for fallback path (mock sandbox failure → direct fetch)
- [x] `README.md` — v1 architecture summary, <15 min setup, env link, `npm run test:eval`, deploy + gates
- [x] `CHANGELOG.md` — `## [1.0.0] - 2026-06-23`; `package.json` version `1.0.0`
- [x] `docs/DECISIONS.md` — ADR-007 (sandbox fallback), ADR-008 (auth deferred)
- [x] Production env checklist in `README.md` and `docs/CICD.md`
- [x] `ROADMAP.md` + this file — Slice 15 complete; Slice 14 deferred

## Slice 16 acceptance (post-v1 / interview polish)

- [x] `evalMode: agent-matrix` — `agents[]`, `harness-json`, `lib/agent-matrix.ts`, per-agent scoring description
- [x] Demo presets — `lib/demo-presets.ts`, `fixtures/aidea-fast-chat.json`, `fixtures/aidea-agent-matrix-pilot.json`
- [x] `generationMode: adversarial` + `scoringMode: dual` — `lib/multi-model-eval.ts`, `TierComparison` UI (ADR-009)
- [x] Scorer v1.3.0 — harness validation vs hallucination; `validationErrors` / `validationWarnings` on sandbox + flagged findings UI
- [x] `/architecture` — Workflow, Pipeline, Backend map, ADRs, Infrastructure, Eval patterns (`lib/architecture-graph.ts`)
- [x] Run report UX — app shell, sidebar runs, `RunProgress`, `RunActivityStream`, `FlaggedFindings`
- [x] `lib/run-prompts.ts` + `RunPromptsPanel` — format-aware LLM prompt display on `/runs/[id]`
- [x] Docs — `AIDEA-PERSONA-EVAL-HANDOFF.md`, `PERSONA-MATRIX-PHASE2.md`, ADR-009/010, updated ARCHITECTURE/README/CHANGELOG
- [x] `npm run gates` green including `lib/run-prompts.test.ts`, `lib/architecture-graph.test.ts`

## Slice 17 acceptance (observability + LLM trace)

- [x] Dual-score metrics — parallel `generateWithTier` without `runId`; sequential `recordAiCallWithSpan` after both finish
- [x] `recordAiCallMetrics` — retry read–merge–write with verification; `generationIds` when Gateway cost pending
- [x] `backfillRunMetricsCosts` — workflow hooks after score, build-report, apply-fixes; Gateway lookup 8×400ms
- [x] `lib/llm-trace.ts` — `recordLlmTrace`, `resolveRunLlmTrace`, `groupLlmTraceEntries`; agents record trace per LLM call
- [x] `LlmTracePanel` on `/runs/[id]` — system/user/assistant; cost summary shows while run active with metrics polling
- [x] Tests — `lib/llm-trace.test.ts`, observability generationIds, agent mocks updated
- [x] `npm run gates` green

## Slice 18 acceptance (multi-vendor scoring)

- [x] `scoringMode: multi-vendor` — parallel Sonnet + OpenAI (`openai/gpt-4.1`) via `lib/ai.ts` Gateway routing
- [x] Eval form third scoring option; `create-run` allowlist; `/api/health` pings `openai` tier
- [x] Primary scores/flags from Sonnet; `multiModelScore.openai` stores second judge; `TierComparison` vendor disagreements
- [x] `lib/run-prompts.ts` reconstructs strong + openai score calls for runs without stored trace
- [x] ADR-011; `docs/ENV.md` BYOK note; `npm run gates` green
