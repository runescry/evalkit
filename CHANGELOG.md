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
