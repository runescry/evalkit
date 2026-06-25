# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Multi-vendor scoring** — `scoringMode: multi-vendor` runs Sonnet + OpenAI judges in parallel via Gateway BYOK; `TierComparison` shows vendor disagreements; `/api/health` pings `openai` tier (ADR-011)
- **Agent-matrix eval** (`evalMode: agent-matrix`) — per-agent URLs, `agentId` on test cases, `harness-json` sandbox contract, KB fixture overlays (`lib/agent-matrix.ts`, ADR-010)
- **Demo presets** — one-click aidea fast-chat and 3-agent persona matrix pilot (`lib/demo-presets.ts`, `fixtures/aidea-*.json`)
- **Adversarial generation + dual scoring** — `generationMode: adversarial`, `scoringMode: dual`, tier comparison UI (`lib/multi-model-eval.ts`, ADR-009)
- **Architecture reference page** — `/architecture` with Workflow, Pipeline, Backend map, ADRs, Infrastructure, Eval patterns (`lib/architecture-graph.ts`)
- **Run report UX** — app shell/sidebar, pipeline progress, live activity stream, flagged findings with harness validation context, cost summary
- **LLM trace panel** — system/user/assistant messages per Gateway call on `/runs/[id]`; stored at call time in `run.llmTrace` with snapshot fallback (`lib/llm-trace.ts`, `components/llm-trace-panel.tsx`)
- **Prompt reconstruction** — `lib/run-prompts.ts` rebuilds prompts for older runs without stored trace
- **Fluid Compute** — `"fluid": true` in `vercel.json` for bursty workflow workloads
- Docs: `docs/AIDEA-PERSONA-EVAL-HANDOFF.md`, `docs/PERSONA-MATRIX-PHASE2.md`

### Changed

- Scorer prompt **v1.3.0** — harness `validation.ok=false` ≠ narrative hallucination when `gmail_read` ran; surfaces `validationErrors` / `validationWarnings` on sandbox results
- Generate-cases prompts **v1.2.0** — agent-matrix catalog, fast-chat scope constraints, adversarial red-team variant
- Build-report prompt **v1.1.0** — persona matrix table in report structure
- Sandbox fan-out adapts for long harness timeouts (lower concurrency when `sandboxTimeoutMs` > 30s)

### Fixed

- Architecture **Pipeline** tab — “Next step” now syncs accordion selection and scrolls the active stage into view
- **Run cost metrics** — dual-score parallel calls no longer race on KV merge; `recordAiCallMetrics` retries read–merge–write; `generationIds` + `backfillRunMetricsCosts` after score/report/fixes; Gateway cost lookup 8×400ms
- **Cost UI** — summary card visible while run is active (“Cost pending…”); metrics poll until calls recorded or cost backfills

## [1.0.0] - 2026-06-23

### Added

- Slice 00a: Agent harness — `AGENTS.md`, Cursor rules/skills, docs, CI skeleton, fixtures
- Per-slice policy: full `npm run gates` (unit, contract, crud, integration, build) + one commit per slice
- Vitest unit tests for `lib/test/mock-ai.ts`; `scripts/test-na.mjs` for suites not yet introduced
- Slice 00b: Next.js 15 App Router, Tailwind v4, shadcn/ui (Button, Input, Textarea, Slider, Card, Badge, Skeleton), `vercel.json`, `.env.example`
- Slice 01: `lib/ai.ts` two-tier AI Gateway routing (`fast`/`strong`), `/api/health`, telemetry tags, unit + contract + integration tests, tooling stubs
- CI/CD pipeline: CodeQL SAST, dependency audit/review, Gitleaks on all PRs, Vercel post-deploy smoke, husky lint-staged + commitlint — see `docs/CICD.md`
- Slice 02: `lib/types.ts` + `lib/store.ts` Zod-validated KV CRUD (`createRun`, `updateRun`, `getRun`, `listRuns`), CRUD tests, `scripts/replay-run.ts`
- Slice 03: `workflows/eval-run.ts` durable orchestration (`workflow` SDK), POST/GET `/api/runs`, step retries + approval hook stub, unit/contract/integration tests
- Slice 04: `agents/generate-cases.ts` fast-tier structured test case generation (6 categories), `lib/prompts.ts` versioning + hash on run, unit tests with mocked AI
- Slice 05: `agents/run-sandbox.ts` isolated Vercel Sandbox per case (10s timeout, fan-out 5), workflow wiring, unit + integration tests with mocked sandbox
- Slice 06: `agents/score-results.ts` strong-tier rubric scoring (4 dimensions, flag < 14), incremental KV updates, prompt hash on run, unit + integration tests with mocked AI
- Slice 07: `agents/build-report.ts` streaming markdown report, `GET /api/runs/[id]/stream` SSE, `/runs/[id]` UI with skeleton + `lib/sse.ts` helper
- Slice 08: `POST /api/runs/[id]/approve` resumes workflow approval hook, `ApprovalCard` on run page
- Slice 09: `agents/suggest-fixes.ts` structured prompt fixes with unified diffs, `FixSuggestions` UI, workflow `applyFixesStep` wired
- Slice 10: `evals/ground-truth.json`, `lib/eval-alignment.ts`, L3 gate ≥85% via `npm run test:eval` (included in gates)
- Slice 11: landing `EvalStartForm` + server action, `RecentRuns`, `GET /api/runs` list API
- Slice 12: `POST /api/slack/eval` slash command, `lib/slack.ts` signature verify + threaded status updates
- Slice 13: `lib/observability.ts` OpenTelemetry spans + run metrics, `GET /api/runs/[id]/metrics`, cost summary on run report, staging cost alert in RUNBOOK
- Slice 15: v1 release — App Router error boundaries, sandbox HTTP fallback with `unverified` flag, README/CICD production checklist, CHANGELOG 1.0.0

### Deferred

- Slice 14: Auth + rate limits — shelved post-v1; see ADR-008 in `docs/DECISIONS.md`
