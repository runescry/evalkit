# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
