# EvalKit — agent instructions

AI eval harness for deployed chatbots. Paste a URL + description → targeted test suite → sandbox execution → rubric scoring → streaming report → human-approved prompt fixes.

**Repo:** [github.com/runescry/evalkit](https://github.com/runescry/evalkit)

---

## Bootstrap reading order

Read in sequence **before** writing code:

1. This file (`AGENTS.md`)
2. [`docs/SLICES.md`](./docs/SLICES.md) — current slice + acceptance criteria
3. [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — system shape and data flow
4. Relevant [`.cursor/rules/`](./.cursor/rules/) for the files you will touch

---

## Documentation map

| Doc | Read when |
|-----|-----------|
| [ROADMAP.md](./ROADMAP.md) | Picking the next slice; marking progress |
| [docs/SLICES.md](./docs/SLICES.md) | Branch name, scope, acceptance criteria |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Infrastructure, KV schema, workflow steps |
| [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) | Trunk dev, gates, commits, branch protection |
| [docs/DECISIONS.md](./docs/DECISIONS.md) | ADRs — trade-offs already decided |
| [docs/ENV.md](./docs/ENV.md) | Environment variables (canonical) |
| [docs/PROMPTS.md](./docs/PROMPTS.md) | Prompt versioning and hashes |
| [docs/RUNBOOK.md](./docs/RUNBOOK.md) | Debug failed runs, KV, workflow |
| [docs/CICD.md](./docs/CICD.md) | Local → Git → Vercel pipeline |
| [docs/AIDEA-PERSONA-EVAL-HANDOFF.md](./docs/AIDEA-PERSONA-EVAL-HANDOFF.md) | aidea harness eval adapter |
| [docs/PERSONA-MATRIX-PHASE2.md](./docs/PERSONA-MATRIX-PHASE2.md) | Full 36-agent rollout plan |
| [docs/ANTI_PATTERNS.md](./docs/ANTI_PATTERNS.md) | Forbidden patterns |
| [CHANGELOG.md](./CHANGELOG.md) | What shipped per slice |
| [SECURITY.md](./SECURITY.md) | Secrets and PII |
| [.cursor/loop-prompt.md](./.cursor/loop-prompt.md) | `/loop` slice automation |

---

## Do not

### Code & scope

- **No unnecessary code** — minimal diff; no speculative features or unrelated refactors
- **No duplication** — use shared helpers below; see [docs/ANTI_PATTERNS.md](./docs/ANTI_PATTERNS.md)
- **No scope creep** — one slice per session unless explicitly asked
- **No secrets in code** — see [SECURITY.md](./SECURITY.md)

### Git & deploy

- **Commit every slice** — one conventional commit when slice acceptance criteria and gates pass
- **Always run full gates** before commit: `npm run gates` (+ `npm run test:eval` from Slice 10)
- **Do not push to `main` or deploy** without the user's explicit request
- **Do not push** with failing gates or CI on the branch
- One slice = one commit on the feature branch; message explains **why** (`feat(sandbox): …`)

---

## Shared helpers (use these — do not reimplement)

| Helper | Path | Use when |
|--------|------|----------|
| `generateWithTier` | `lib/ai.ts` | Any LLM call — pass `tier: 'fast' \| 'strong' \| 'openai'` and `step` |
| `createRun`, `updateRun`, `getRun`, `listRuns` | `lib/store.ts` | All KV persistence — Zod-validated |
| Types + Zod schemas | `lib/types.ts` | `EvalRun`, `TestCase`, `TestResult`, etc. |
| Prompt templates + hash | `lib/prompts.ts` | Versioned prompts; store hash on run |
| Reconstruct run prompts | `lib/run-prompts.ts` | Report UI — system/user per LLM step |
| Agent-matrix / harness | `lib/agent-matrix.ts` | `evalMode`, KB merge, sandbox body |
| Demo presets | `lib/demo-presets.ts` | One-click pilot runs from landing form |
| Architecture graph data | `lib/architecture-graph.ts` | `/architecture` page content |
| `mockGenerateText`, `mockStreamText` | `lib/test/mock-ai.ts` | Unit/contract tests — never live Gateway in CI |

### Agent modules (pipeline)

| Step | Module | Model tier |
|------|--------|------------|
| Generate test cases | `agents/generate-cases.ts` | fast (standard) or strong (adversarial) |
| Run sandbox | `agents/run-sandbox.ts` | n/a (calls target app; `message-json` or `harness-json`) |
| Score results | `agents/score-results.ts` | strong (or dual fast+strong, or multi-vendor strong+openai) |
| Build report | `agents/build-report.ts` | strong (stream) |
| Suggest fixes | `agents/suggest-fixes.ts` | strong |
| Orchestration | `workflows/eval-run.ts` | Workflow SDK steps |

**Pipeline contract:** generate → sandbox (fan-out) → score → report → await approval → apply fixes. Each step updates KV via `updateRun`.

**Model routing:** Never hardcode model IDs outside `lib/ai.ts`.

**Correlation:** Propagate `runId` through logs, spans, KV keys, and API responses.

---

## Testing layers

Every slice runs **all applicable suites** via `npm run gates`. Suites with no tests yet exit N/A until that slice adds them (see [`docs/SLICES.md`](./docs/SLICES.md#per-slice-test-requirements)).

| Layer | Command | Location | Purpose |
|-------|---------|----------|---------|
| Unit | `npm run test` | `lib/**/*.test.ts`, `agents/**/*.test.ts` | Pure logic; mock AI |
| Contract | `npm run test:contract` | `app/api/**/*.contract.test.ts` | HTTP status + JSON shape |
| CRUD | `npm run test:crud` | `lib/**/*.crud.test.ts` | KV store create/read/update/list |
| Integration | `npm run test:integration` | `tests/integration/**/*.test.ts` | Multi-step, workflow, sandbox |
| Eval | `npm run test:eval` | `evals/run-evals.ts` | Scorer alignment (Slice 10+, main) |

- Mock AI via `lib/test/mock-ai.ts` in CI — no live Gateway
- Assert **schema and behavior**, not verbatim LLM strings
- Fixtures in `fixtures/` — reuse `fintech-chatbot.json`

---

## Slice workflow

1. Confirm current slice in [`docs/SLICES.md`](./docs/SLICES.md)
2. Branch from `main`: e.g. `infra/scaffold`, `feature/test-case-generator`
3. Implement **only** that slice
4. Run `npm run gates` (+ `npm run test:eval` when Slice 10+)
5. Update [`CHANGELOG.md`](./CHANGELOG.md), [`ROADMAP.md`](./ROADMAP.md), and [`docs/SLICES.md`](./docs/SLICES.md)
6. **Commit** the slice with a conventional message
7. Open PR with template; merge when CI green

---

## When to stop and ask

- Slice scope is ambiguous or conflicts with spec
- New dependency or platform capability not in spec
- Security-sensitive change (auth, secrets, PII logging)
- L3 eval gate fails and fix requires prompt/rubric change
- Architectural change not covered by [docs/DECISIONS.md](./docs/DECISIONS.md)

---

## Session Definition of Done

1. Slice acceptance criteria met ([`docs/SLICES.md`](./docs/SLICES.md))
2. `npm run gates` passed (all applicable suites; N/A only where documented)
3. `npm run test:eval` passed when Slice 10+ touches scorer/prompts
4. `CHANGELOG.md` + `ROADMAP.md` + `docs/SLICES.md` updated
5. **Committed** — one conventional commit for the slice
6. No secrets, no PII in logs, no anti-patterns
7. Summary: what changed, gates passed, commit hash, next slice
